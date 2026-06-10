import uuid
from datetime import date
from sqlalchemy import String, Boolean, Text, Date, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped, relationship
from typing import Optional
from app.models.base import Base, TimestampMixin


class MealPlan(Base, TimestampMixin):
    __tablename__ = "meal_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    generation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    entries: Mapped[list["MealPlanEntry"]] = relationship(
        "MealPlanEntry", back_populates="meal_plan", cascade="all, delete-orphan"
    )


class MealPlanEntry(Base, TimestampMixin):
    __tablename__ = "meal_plan_entries"
    __table_args__ = (
        UniqueConstraint("meal_plan_id", "plan_date", "meal_type", "sort_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False
    )
    recipe_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True
    )
    plan_date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(20), nullable=False)
    servings_override: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_leftover_of: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meal_plan_entries.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    meal_plan: Mapped["MealPlan"] = relationship("MealPlan", back_populates="entries")
    recipe: Mapped[Optional["Recipe"]] = relationship("Recipe")  # type: ignore
