from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from db.database import get_db
from schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from models.incident import Incident, IncidentStatus, IncidentCategory, Validation, UserRole
from services.geofencing import to_geojson_feature
from security.permissions import get_current_admin

router = APIRouter(tags=["moderation"])


class ReportFlagCreate(BaseModel):
    """Schema para denuncias ciudadanas (recomendación #3)"""
    reason: str
    comment: Optional[str] = None


@router.get("/pending", response_model=List[dict])
def get_pending_moderation(
    db: Session = Depends(get_db),
    user=Depends(get_current_admin)
):
    """
    RECOMENDACIÓN #1: Lista de reportes pendientes de moderación.
    Estos son los que fueron rechazados automáticamente por el filtro NSFW.
    """
    pending = db.query(Incident).filter(
        Incident.status == IncidentStatus.pending
    ).order_by(Incident.created_at.desc()).limit(100).all()
    
    return [{
        "id": inc.id,
        "category": inc.category.value,
        "description": inc.description,
        "photo_url": inc.photo_url,
        "location": to_geojson_feature(inc)["geometry"],
        "city": inc.city,
        "neighborhood": inc.neighborhood,
        "created_at": inc.created_at.isoformat(),
        "reporter_fingerprint": inc.reporter_fingerprint,
    } for inc in pending]


@router.post("/approve/{incident_id}", response_model=dict)
def approve_incident(incident_id: str, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    """
    RECOMENDACIÓN #1: Aprobar un reporte que fue rechazado por moderación.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    inc.status = IncidentStatus.confirmed
    inc.updated_at = func.now()
    db.commit()
    
    return {"success": True, "message": "Incidente aprobado y visible en el mapa"}


@router.post("/reject/{incident_id}", response_model=dict)
def reject_incident(
    incident_id: str,
    reason: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_admin)
):
    """
    RECOMENDACIÓN #1: Rechazar un reporte por motivo específico.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    inc.status = IncidentStatus.rejected
    inc.description = f"[RECHAZADO: {reason}] {inc.description}" if inc.description else reason
    inc.updated_at = func.now()
    db.commit()
    
    return {"success": True, "message": "Incidente rechazado"}


@router.post("/purge/{incident_id}", response_model=dict)
def purge_incident_permanent(
    incident_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_admin)
):
    """
    RECOMENDACIÓN #4: Eliminación permanente del panel de administración.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    fingerprint = inc.reporter_fingerprint
    
    # Borrar el incidente
    db.delete(inc)
    
    # Agregar a lista de bloqueo temporal
    from pathlib import Path
    import json
    from datetime import datetime
    
    ban_file = Path("./data/blocked_fingerprints.json")
    ban_file.parent.mkdir(exist_ok=True)
    
    blocked = []
    if ban_file.exists():
        with open(ban_file, "r") as f:
            try:
                blocked = json.load(f)
            except json.JSONDecodeError:
                blocked = []
    
    if fingerprint and fingerprint not in [b["fingerprint"] for b in blocked if isinstance(b, dict)]:
        blocked.append({
            "fingerprint": fingerprint,
            "blocked_at": datetime.now().isoformat(),
            "blocked_by_admin": user.email if hasattr(user, 'email') else "admin"
        })
    
    with open(ban_file, "w") as f:
        json.dump(blocked, f, indent=2)
    
    db.commit()
    
    return {
        "success": True,
        "message": "Incidente eliminado permanentemente. Reportero bloqueado temporalmente."
    }


@router.get("/blocked", response_model=List[dict])
def get_blocked_devices(
    db: Session = Depends(get_db),
    user=Depends(get_current_admin)
):
    """Obtener lista de dispositivos bloqueados (recomendación #4)"""
    import json
    from pathlib import Path
    
    ban_file = Path("./data/blocked_fingerprints.json")
    if ban_file.exists():
        with open(ban_file, "r") as f:
            try:
                blocked = json.load(f)
            except json.JSONDecodeError:
                blocked = []
    else:
        blocked = []
    
    return blocked


@router.get("/stats", response_model=dict)
def moderation_stats(db: Session = Depends(get_db), user=Depends(get_current_admin)):
    """Estadísticas de moderación para el dashboard del admin."""
    stats = db.query(
        func.count(Incident.id).filter(Incident.status == IncidentStatus.confirmed).label("approved"),
        func.count(Incident.id).filter(Incident.status == IncidentStatus.pending).label("pending"),
        func.count(Incident.id).filter(Incident.status == IncidentStatus.rejected).label("rejected"),
        func.count(Validation.id).label("total_validations")
    ).first()
    
    return {
        "approved_count": stats.approved or 0,
        "pending_count": stats.pending or 0,
        "rejected_count": stats.rejected or 0,
        "total_validations": stats.total_validations or 0,
    }
