from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database - Using SQLite for development to avoid PostgreSQL connection issues
    DATABASE_URL: str = "sqlite:///./reportaya.db"
    SECRET_KEY: str = "dev_secret_key_change_in_production_2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ADMIN_EMAIL: str = "admin@alcaldiademaracaibo.gob.ve"
    ADMIN_PASSWORD: str = "Admin2024!SecurePassword"
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://reportaya.maracaibo.gob.ve"

    PROJECT_NAME: str = "ReportaYa"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Plataforma cívica anónima de reporte de problemas viales y servicios publicos"

settings = Settings()