import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped
from typing import Optional
from app.models.base import Base, TimestampMixin


class TrustedSite(Base, TimestampMixin):
    __tablename__ = "trusted_sites"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    scrape_pattern: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_browsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
