from backend.src.db.database import engine, Base
from backend.src.config import settings
from backend.src.security.auth import get_password_hash
from sqlalchemy.orm import Session

def init_db():
    Base.metadata.create_all(bind=engine)
    db = Session(bind=engine)
    try:
        from backend.src.models.incident import User, UserRole
        if not db.query(User).filter(User.email == settings.ADMIN_EMAIL).first():
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="Administrador Principal",
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print("Admin user created")
        else:
            print("Admin user already exists")
    finally:
        db.close()
    print("Database initialized successfully")

if __name__ == "__main__":
    init_db()