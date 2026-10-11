"""initial schema with PostGIS geometry

Revision ID: 9f3a2c1
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from models.incident import UserRole, IncidentCategory, IncidentStatus

revision = "9f3a2c1"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table("users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("role", sa.Enum(UserRole), default=UserRole.inspector),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("last_login", sa.DateTime, nullable=True),
    )
    op.create_table("incidents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("category", sa.Enum(IncidentCategory), nullable=False),
        sa.Column("status", sa.Enum(IncidentStatus), default=IncidentStatus.open),
        sa.Column("description", sa.Text),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("location", geoalchemy2.Geometry("POINT", srid=4326), nullable=False),
        sa.Column("city", sa.String(100)),
        sa.Column("neighborhood", sa.String(100)),
        sa.Column("reporter_fingerprint", sa.String(64), index=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), index=True),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("assigned_to_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("closed_at", sa.DateTime),
        sa.Column("closure_photo_url", sa.String(500)),
        sa.Column("closure_notes", sa.Text),
        sa.Column("severity_days", sa.Integer, default=0),
    )
    op.create_index("idx_incidents_location", "incidents", ["location"],
                    postgresql_using="gist",
                    postgresql_where="status NOT IN ('solucionado', 'rechazado')")
    op.create_table("validations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("incident_id", sa.String(36), sa.ForeignKey("incidents.id", ondelete="CASCADE")),
        sa.Column("validator_fingerprint", sa.String(64)),
        sa.Column("is_confirmed", sa.Boolean, default=True),
        sa.Column("distance_meters", sa.Numeric(8, 2)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table("report_sequences",
        sa.Column("fingerprint", sa.String(64), primary_key=True, index=True),
        sa.Column("last_report_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("report_count", sa.Integer, default=0),
    )

def downgrade():
    op.drop_table("report_sequences")
    op.drop_table("validations")
    op.drop_table("incidents")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS postgis")