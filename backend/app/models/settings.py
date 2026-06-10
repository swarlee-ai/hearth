from sqlalchemy import Integer, Boolean, String, JSON
from sqlalchemy.orm import mapped_column, Mapped
from typing import Optional
from app.models.base import Base, TimestampMixin


class AppSettings(Base, TimestampMixin):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    adults_count: Mapped[int] = mapped_column(Integer, default=2)
    kids: Mapped[list] = mapped_column(JSON, default=list)
    dietary_restrictions: Mapped[list] = mapped_column(JSON, default=list)
    cuisine_preferences: Mapped[list] = mapped_column(JSON, default=list)
    disliked_cuisines: Mapped[list] = mapped_column(JSON, default=list)
    spice_tolerance: Mapped[str] = mapped_column(String(20), default="medium")
    planned_meals: Mapped[list] = mapped_column(JSON, default=lambda: ["dinner"])
    meal_schedule: Mapped[dict] = mapped_column(JSON, default=lambda: {
        "monday": ["dinner"], "tuesday": ["dinner"], "wednesday": ["dinner"],
        "thursday": ["dinner"], "friday": ["dinner"], "saturday": ["dinner"], "sunday": ["dinner"],
    })
    llm_base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    llm_api_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    llm_model_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    store_layout: Mapped[str] = mapped_column(String(50), default="default")
