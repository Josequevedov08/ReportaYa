from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from services.incidents import get_active_incidents_geojson

router = APIRouter(tags=["geojson"])

@router.get("/incidents/active", response_model=dict, response_model_exclude_unset=True)
def get_active_incidents(db: Session = Depends(get_db)):
    return get_active_incidents_geojson(db)