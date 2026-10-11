from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from config import settings
from db.database import get_db
from models.incident import User
from security.auth import authenticate_user, create_access_token, get_password_hash
from schemas.auth import Token

router = APIRouter()
security = HTTPBasic()

def get_current_user_basic(creds: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    user = authenticate_user(db, creds.username, creds.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    return user

@router.post("/login", response_model=Token)
def login(form_data: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
            headers={"WWW-Authenticate": "Basic"},
        )
    access_token = create_access_token(
        {"sub": user.email, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}