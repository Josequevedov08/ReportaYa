import uuid
import time
import math
import os
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float
from models.incident import Incident, IncidentStatus, IncidentCategory, Validation, ReportSequence
from schemas.incident import IncidentCreate, ValidationCreate
from security.fingerprint import is_rate_limited

DUPLICATE_RADIUS_M = 30
VALIDATION_RADIUS_M = 200

# Detect if using SQLite (no PostGIS)
IS_SQLITE = os.environ.get("DATABASE_URL", "sqlite:///./reportaya.db").startswith("sqlite")


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi/2)**2 + 
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def calculate_severity_days(created_at: datetime) -> int:
    delta = datetime.utcnow() - created_at
    return delta.days


def get_severity_label(days: int) -> str:
    if days <= 15:
        return "reciente"
    elif days <= 45:
        return "en_espera"
    else:
        return "critico"


def check_duplicate_nearby(db: Session, lat: float, lon: float, category: str) -> Optional[Incident]:
    """Check if there's a similar incident nearby (SQLite or PostGIS)"""
    if IS_SQLITE:
        # SQLite: query all incidents and calculate distance in Python
        nearby_incidents = db.query(Incident).filter(
            Incident.category == category,
            Incident.status != IncidentStatus.solved,
            Incident.status != IncidentStatus.rejected,
        ).all()
        
        for inc in nearby_incidents:
            if hasattr(inc, 'latitude') and inc.latitude is not None:
                dist = haversine_distance(lat, lon, inc.latitude, inc.longitude)
                if dist <= DUPLICATE_RADIUS_M:
                    return inc
        return None
    else:
        # PostGIS version
        from geoalchemy2.functions import ST_DWithin, ST_Point
        point = ST_Point(lon, lat)
        nearby = (
            db.query(Incident)
            .filter(
                Incident.category == category,
                Incident.status != IncidentStatus.solved,
                Incident.status != IncidentStatus.rejected,
                ST_DWithin(Incident.location, point, DUPLICATE_RADIUS_M, srid=4326),
            )
            .first()
        )
        return nearby


def check_rate_limit(db: Session, fingerprint: str) -> bool:
    seq = db.query(ReportSequence).filter(ReportSequence.fingerprint == fingerprint).first()
    if seq is None:
        return False
    now = time.time()
    created_ts = seq.last_report_at.timestamp() if isinstance(seq.last_report_at, datetime) else seq.last_report_at
    return is_rate_limited(created_ts, seq.report_count)


def register_report_attempt(db: Session, fingerprint: str):
    seq = db.query(ReportSequence).filter(ReportSequence.fingerprint == fingerprint).first()
    now = datetime.utcnow()
    if seq is None:
        seq = ReportSequence(fingerprint=fingerprint, last_report_at=now, report_count=1)
    else:
        if (now - seq.last_report_at).total_seconds() < 86400:
            seq.report_count = seq.report_count + 1
        else:
            seq.report_count = 1
        seq.last_report_at = now
    db.add(seq)
    db.commit()


def create_incident(db: Session, payload: IncidentCreate, fingerprint: Optional[str] = None, initial_status: IncidentStatus = None) -> Incident:
    now = datetime.utcnow()
    
    if IS_SQLITE:
        # SQLite version - store as separate columns
        incident = Incident(
            id=str(uuid.uuid4()),
            category=payload.category,
            description=payload.description,
            photo_url=payload.photo_url,
            latitude=payload.latitude,
            longitude=payload.longitude,
            city=payload.city,
            neighborhood=payload.neighborhood,
            reporter_fingerprint=fingerprint,
            severity_days=0,
            created_at=now,
            updated_at=now,
            status=initial_status or IncidentStatus.pending,
        )
    else:
        # PostGIS version
        incident = Incident(
            id=str(uuid.uuid4()),
            category=payload.category,
            description=payload.description,
            photo_url=payload.photo_url,
            location=func.ST_SetSRID(func.ST_Point(payload.longitude, payload.latitude), 4326),
            city=payload.city,
            neighborhood=payload.neighborhood,
            reporter_fingerprint=fingerprint,
            severity_days=0,
            created_at=now,
            updated_at=now,
            status=initial_status or IncidentStatus.pending,
        )
    
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def confirm_validation_within_radius(
    db: Session, incident: Incident, payload: ValidationCreate
) -> bool:
    if not incident.latitude and not incident.longitude:
        return False
    
    lat = incident.latitude if incident.latitude else 0
    lon = incident.longitude if incident.longitude else 0
    
    distance = haversine_distance(lat, lon, payload.latitude, payload.longitude)
    
    if distance > VALIDATION_RADIUS_M:
        return False
    
    v = Validation(
        incident_id=incident.id,
        is_confirmed=payload.is_confirmed,
        distance_meters=distance,
    )
    db.add(v)
    db.commit()
    return True


def to_geojson_feature(incident: Incident) -> dict:
    coords = [0.0, 0.0]
    
    if IS_SQLITE:
        if incident.latitude and incident.longitude:
            coords = [incident.longitude, incident.latitude]
    else:
        try:
            from geoalchemy2.shape import to_shape
            coords = (incident.location and to_shape(incident.location).coords[0]) or [0.0, 0.0]
        except:
            if incident.latitude and incident.longitude:
                coords = [incident.longitude, incident.latitude]
    
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": coords},
        "properties": {
            "id": incident.id,
            "category": incident.category.value,
            "status": incident.status.value,
            "severity_days": incident.severity_days,
            "severity_label": get_severity_label(incident.severity_days),
            "created_at": incident.created_at.isoformat(),
            "description": incident.description,
        },
    }