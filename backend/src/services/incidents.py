from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.incident import Incident, IncidentStatus, IncidentCategory, Validation
from schemas.incident import IncidentCreate, IncidentUpdate, ValidationCreate
from services.geofencing import (
    check_duplicate_nearby,
    check_rate_limit,
    register_report_attempt,
    create_incident as _create_incident,
    confirm_validation_within_radius,
    calculate_severity_days,
    get_severity_label,
    to_geojson_feature,
)

def submit_incident(db: Session, payload: IncidentCreate, fingerprint: str, initial_status: IncidentStatus = None) -> dict:
    if check_rate_limit(db, fingerprint):
        return {"error": "Limite de reportes por dispositivo alcanzado. Intenta mas tarde."}
    if check_duplicate_nearby(db, payload.latitude, payload.longitude, payload.category):
        return {"error": "Ya existe un reporte para esta categoria en menos de 30 metros. Usa la opcion de validar."}
    incident = _create_incident(db, payload, fingerprint, initial_status=initial_status)
    return {"incident_id": incident.id}

def get_active_incidents_geojson(db: Session, include_statuses: List[IncidentStatus] = None) -> dict:
    if include_statuses is None:
        include_statuses = [
            IncidentStatus.confirmed,
            IncidentStatus.in_progress,
            IncidentStatus.in_repair,
            IncidentStatus.solved
        ]
    incidents = db.query(Incident).filter(
        Incident.status.in_(include_statuses)
    ).all()
    features = [to_geojson_feature(i) for i in incidents]
    return {"type": "FeatureCollection", "features": features}

def add_validation(db: Session, incident_id: str, payload: ValidationCreate, fingerprint: str) -> dict:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return {"error": "Incidente no encontrado"}
    existing = db.query(Validation).filter(Validation.incident_id == incident_id).first()
    ok = confirm_validation_within_radius(db, incident, payload)
    if not ok:
        return {"error": f"Debes estar a menos de 200 metros del reporte para validar. Distancia: {payload}"}
    incident.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}

def update_incident_status(db: Session, incident_id: str, update: IncidentUpdate) -> Optional[Incident]:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return None
    if update.status:
        incident.status = update.status
    if update.assigned_to_id is not None:
        incident.assigned_to_id = update.assigned_to_id
    if update.closure_photo_url:
        incident.closure_photo_url = update.closure_photo_url
        incident.closure_notes = update.closure_notes
        incident.closed_at = datetime.utcnow()
        incident.status = IncidentStatus.solved
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return incident

def recalculate_severity_for_all(db: Session):
    incidents = db.query(Incident).filter(
        Incident.status != IncidentStatus.solved,
        Incident.status != IncidentStatus.rejected,
    ).all()
    for inc in incidents:
        inc.severity_days = calculate_severity_days(inc.created_at)
    db.commit()