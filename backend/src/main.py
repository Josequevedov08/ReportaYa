from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from db.database import engine, Base, IS_SQLITE
from models.incident import User, Incident, Validation, ReportSequence
from endpoints import auth, incidents, geojson
from endpoints.moderation import router as moderation_router

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
)

origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas principales
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(incidents.router, prefix="/api/v1")
app.include_router(geojson.router, prefix="/api/v1")

# NUEVO: Rutas de moderación (recomendación #4 - Panel de purga del admin)
app.include_router(moderation_router, prefix="/api/v1/moderation")

@app.on_event("startup")
def startup_populate_admin():
    from db.database import SessionLocal
    from security.auth import get_password_hash
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == settings.ADMIN_EMAIL).first():
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="Administrador Principal",
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION, "database": "sqlite" if IS_SQLITE else "postgresql"}