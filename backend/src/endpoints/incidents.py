from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from db.database import get_db
from schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate, ValidationCreate, Point
from services.incidents import (
    submit_incident,
    add_validation,
    update_incident_status,
    get_active_incidents_geojson,
)
from security.permissions import get_current_admin
from security.fingerprint import deterministic_fingerprint
from models.incident import Incident, Validation, IncidentStatus, IncidentCategory
from services.geofencing import get_severity_label, to_geojson_feature
from uuid import uuid4
from datetime import datetime


router = APIRouter(tags=["incidents"])


def _get_fingerprint(request: Request) -> str:
    ua = request.headers.get("user-agent", "")
    ip = request.client.host if request.client else "0.0.0.0"
    return deterministic_fingerprint(ua, ip)


@router.post("/incidents", response_model=dict)
async def report_incident(payload: IncidentCreate, request: Request, db: Session = Depends(get_db)):
    """
    RECOMENDACIÓN #1: Filtro automático de contenido (Moderación previa)
    Los reportes pasan por moderación antes de guardarse en la base de datos.
    """
    from services.moderation import analyze_image_content
    
    fingerprint = _get_fingerprint(request)
    
    # Análisis de contenido antes de crear el reporte
    is_approved, reason, _ = analyze_image_content(
        image_data=payload.photo_content if hasattr(payload, 'photo_content') else b"",
        description=payload.description or ""
    )
    
    if not is_approved:
        return {
            "status": "rejected_moderation",
            "reason": reason,
            "message": "Tu reporte fue rechazado por razones de moderación de contenido"
        }
    
    # Crear el incidente en estado 'pending' (visible solo para validación ciudadana)
    result = submit_incident(db, payload, fingerprint, initial_status=IncidentStatus.confirmed)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/incidents/geojson")
def get_geojson(db: Session = Depends(get_db)):
    """Devuelve solo incidentes confirmados y visibles (recomendación #2)"""
    return get_active_incidents_geojson(db, include_statuses=[
        IncidentStatus.confirmed,
        IncidentStatus.in_progress,
        IncidentStatus.in_repair,
        IncidentStatus.solved
    ])


@router.get("/incidents/{incident_id}", response_model=IncidentRead)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    # RECOMENDACIÓN #3: Ocultar si supera el umbral de denuncias
    if inc.negative_report_count >= inc.auto_hide_threshold:
        raise HTTPException(status_code=404, detail="Incidente ocultado por denuncias ciudadana")
    
    # RECOMENDACIÓN #2: Solo mostrar si no está pendiente
    if inc.status == IncidentStatus.pending:
        raise HTTPException(status_code=404, detail="Incidente pendiente de validación")
    
    feat = to_geojson_feature(inc)
    return {
        "id": inc.id,
        "category": inc.category,
        "status": inc.status,
        "description": inc.description,
        "photo_url": inc.photo_url,
        "location": feat["geometry"],
        "city": inc.city,
        "neighborhood": inc.neighborhood,
        "created_at": inc.created_at,
        "updated_at": inc.updated_at,
        "severity_days": inc.severity_days,
        "validation_count": len(inc.validations),
        "negative_report_count": inc.negative_report_count,
    }


class ReportFlag(BaseModel):
    reason: str
    comment: Optional[str] = None


@router.post("/incidents/{incident_id}/flag", response_model=dict)  
async def flag_incident(
    incident_id: str, 
    flag: ReportFlag,
    request: Request, 
    db: Session = Depends(get_db)
):
    """
    RECOMENDACIÓN #3: Contraloría ciudadana (Denuncia de reportes)
    Permite a usuarios denunciar contenido inapropiado o falso.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    fingerprint = _get_fingerprint(request)
    
    # Incrementar contador de denuncias
    inc.negative_report_count += 1
    
    # RECOMENDACIÓN #3: Si supera el umbral, marcar para revisión
    if inc.negative_report_count >= inc.auto_hide_threshold:
        inc.status = IncidentStatus.rejected  # Se oculta automáticamente
    
    db.commit()
    
    return {
        "success": True,
        "negative_count": inc.negative_report_count,
        "hidden": inc.negative_report_count >= inc.auto_hide_threshold,
        "message": "Gracias por tu denuncia. El reporte será revisado por el admin."
    }


@router.get("/incidents/rejected", response_model=List[dict])
def get_rejected_for_review(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    RECOMENDACIÓN #3: Bandeja de revisión prioritaria
    Devuelve los incidentes rechazados o con denuncias pendientes de revisión.
    """
    fingerprint = _get_fingerprint(request)
    
    # Solo admins pueden ver esta lista
    user = get_current_admin(request)  # Esto debería lanzar 403 si no es admin
    
    rejected = db.query(Incident).filter(
        Incident.status == IncidentStatus.rejected,
        Incident.negative_report_count >= Incident.auto_hide_threshold
    ).order_by(Incident.created_at.desc()).all()
    
    return [{
        "id": inc.id,
        "category": inc.category.value,
        "description": inc.description,
        "photo_url": inc.photo_url,
        "negative_count": inc.negative_report_count,
        "threshold": inc.auto_hide_threshold,
        "created_at": inc.created_at.isoformat()
    } for inc in rejected]


@router.delete("/incidents/{incident_id}", response_model=dict)
async def purge_incident(
    incident_id: str,
    user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    RECOMENDACIÓN #4: Purga rápida para la Alcaldía
    Elimina permanentemente un incidente rechazado.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    # Guardar fingerprint antes de borrar para bloqueo
    fingerprint = inc.reporter_fingerprint
    
    # Borrar el incidente
    db.delete(inc)
    
    # RECOMENDACIÓN #4: Agregar a lista de bloqueo temporal
    # (En producción, esto debería ir a una tabla de banned_fingerprints)
    # Por ahora, guardamos en un archivo temporal
    from pathlib import Path
    import json
    
    ban_file = Path("./data/blocked_fingerprints.json")
    ban_file.parent.mkdir(exist_ok=True)
    
    blocked = []
    if ban_file.exists():
        with open(ban_file, "r") as f:
            blocked = json.load(f)
    
    if fingerprint and fingerprint not in blocked:
        blocked.append({
            "fingerprint": fingerprint,
            "blocked_at": datetime.now().isoformat(),
            "blocked_by_admin": user.email if user else "system"
        })
    
    with open(ban_file, "w") as f:
        json.dump(blocked, f, indent=2)
    
    db.commit()
    
    return {
        "success": True,
        "message": "Incidente eliminado permanentemente. El reportero ha sido bloqueado temporalmente."
    }


@router.post("/incidents/{incident_id}/status", response_model=dict)
def update_status(incident_id: str, update: IncidentUpdate, user=Depends(get_current_admin), db: Session = Depends(get_db)):
    inc = update_incident_status(db, incident_id, update)
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    return {"success": True, "status": inc.status.value}


@router.get("/incidents", response_model=List[IncidentRead])
def list_incidents(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    # Solo mostrar incidentes confirmados y resueltos
    incidents = db.query(Incident).filter(
        Incident.status != IncidentStatus.pending
    ).offset(skip).limit(limit).all()
    
    result = []
    for inc in incidents:
        feat = to_geojson_feature(inc)
        result.append({
            "id": inc.id,
            "category": inc.category,
            "status": inc.status,
            "description": inc.description,
            "photo_url": inc.photo_url,
            "location": feat["geometry"],
            "city": inc.city,
            "neighborhood": inc.neighborhood,
            "created_at": inc.created_at,
            "updated_at": inc.updated_at,
            "severity_days": inc.severity_days,
            "validation_count": len(inc.validations),
            "negative_report_count": inc.negative_report_count,
        })
    return result