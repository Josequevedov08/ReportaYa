from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models.incident import IncidentCategory, IncidentStatus


class Point(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class IncidentCreate(BaseModel):
    category: IncidentCategory
    description: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    photo_url: Optional[str] = None


class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    closure_photo_url: Optional[str] = None
    closure_notes: Optional[str] = None


class ValidationCreate(BaseModel):
    is_confirmed: bool
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class IncidentRead(BaseModel):
    id: str
    category: IncidentCategory
    status: IncidentStatus
    description: Optional[str]
    photo_url: Optional[str]
    location: Point
    city: Optional[str]
    neighborhood: Optional[str]
    created_at: datetime
    updated_at: datetime
    severity_days: int
    validation_count: int = 0
    negative_report_count: int = 0

    class Config:
        from_attributes = True


class ReportFlagCreate(BaseModel):
    """Schema para denuncias ciudadanas (recomendación #3)"""
    reason: str
    comment: Optional[str] = None