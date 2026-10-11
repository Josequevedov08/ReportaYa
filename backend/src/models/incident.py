from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, Boolean, Numeric, Enum, func, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from db.database import Base
import os

# Detect if we're using SQLite or PostGIS
IS_SQLITE = os.environ.get("DATABASE_URL", "").startswith("sqlite") if os.environ.get("DATABASE_URL") else True


class UserRole(str, enum.Enum):
    inspector = "inspector"
    coordinator = "coordinador"
    admin = "administrador"


class IncidentCategory(str, enum.Enum):
    vialidad = "vialidad_alcantarillado"
    aseo = "aseo_urbano"
    alumbrado = "alumbrado_publico"


class IncidentStatus(str, enum.Enum):
    pending = "pendiente"
    confirmed = "confirmado"
    in_progress = "en_inspeccion"
    in_repair = "en_reparacion"
    solved = "solucionado"
    rejected = "rechazado"


class IncidentPriority(str, enum.Enum):
    low = "baja"
    medium = "media"
    high = "alta"
    critical = "critica"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.inspector)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime, nullable=True)


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String(36), primary_key=True, index=True)
    category = Column(Enum(IncidentCategory), nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.pending, nullable=False)
    priority = Column(Enum(IncidentPriority), default=IncidentPriority.medium, nullable=False)
    description = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    
    # Support both PostGIS and SQLite
    if IS_SQLITE:
        # SQLite: store coordinates as separate columns
        latitude = Column(Float, nullable=False)
        longitude = Column(Float, nullable=False)
        location = None  # Not used for SQLite
    else:
        # PostGIS: use Geometry column
        from geoalchemy2 import Geometry
        location = Column(Geometry("POINT", srid=4326), nullable=False)
    
    city = Column(String(100), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    reporter_fingerprint = Column(String(64), index=True, nullable=True)
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", backref="assigned_incidents")
    closed_at = Column(DateTime, nullable=True)
    closure_photo_url = Column(String(500), nullable=True)
    closure_notes = Column(Text, nullable=True)
    severity_days = Column(Integer, default=0)
    
    # NUEVO: Contador de reportes negativos por denuncia ciudadana
    negative_report_count = Column(Integer, default=0, nullable=False)
    
    # NUEVO: Umbral para ocultar automáticamente
    auto_hide_threshold = Column(Integer, default=3, nullable=False)


class Validation(Base):
    __tablename__ = "validations"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    validator_fingerprint = Column(String(64), nullable=True)
    is_confirmed = Column(Boolean, default=True)
    distance_meters = Column(Numeric(8, 2))
    created_at = Column(DateTime, default=func.now())
    incident = relationship("Incident", backref="validations")


class ReportSequence(Base):
    __tablename__ = "report_sequences"
    fingerprint = Column(String(64), primary_key=True, index=True)
    last_report_at = Column(DateTime, default=func.now())
    report_count = Column(Integer, default=0)