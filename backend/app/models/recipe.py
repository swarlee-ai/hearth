import uuid
from sqlalchemy import String, Integer, Boolean, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import mapped_column, Mapped
from typing import Optional
from app.models.base import Base, TimestampMixin


class Recipe(Base, TimestampMixin):
    __tablename__ = "recipes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    prep_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cook_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    servings: Mapped[int] = mapped_column(Integer, default=4)
    difficulty: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ingredients: Mapped[list] = mapped_column(JSON, default=list)
    instructions: Mapped[list] = mapped_column(JSON, default=list)
    cuisine_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_kid_friendly: Mapped[bool] = mapped_column(Boolean, default=False)
    kid_mod_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_leftover_friendly: Mapped[bool] = mapped_column(Boolean, default=False)
    leftover_days: Mapped[int] = mapped_column(Integer, default=1)
    nutrition_per_serving: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    nutrition_is_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
