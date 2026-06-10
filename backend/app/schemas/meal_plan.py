import uuid
from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional
from app.schemas.recipe import RecipeResponse


class MealPlanEntryCreate(BaseModel):
    recipe_id: Optional[uuid.UUID] = None
    plan_date: date
    meal_type: str
    servings_override: Optional[int] = None
    sort_order: int = 0


class MealPlanEntryUpdate(BaseModel):
    recipe_id: Optional[uuid.UUID] = None
    plan_date: Optional[date] = None
    meal_type: Optional[str] = None
    servings_override: Optional[int] = None
    sort_order: Optional[int] = None
    is_leftover_of: Optional[uuid.UUID] = None


class MealPlanEntryResponse(BaseModel):
    id: uuid.UUID
    meal_plan_id: uuid.UUID
    recipe_id: Optional[uuid.UUID]
    plan_date: date
    meal_type: str
    servings_override: Optional[int]
    is_leftover_of: Optional[uuid.UUID]
    sort_order: int
    recipe: Optional[RecipeResponse] = None

    model_config = {"from_attributes": True}


class MealPlanResponse(BaseModel):
    id: uuid.UUID
    week_start_date: date
    name: Optional[str]
    is_ai_generated: bool
    generation_notes: Optional[str]
    entries: list[MealPlanEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MealPlanListItem(BaseModel):
    id: uuid.UUID
    week_start_date: date
    name: Optional[str]
    is_ai_generated: bool
    entry_count: int

    model_config = {"from_attributes": True}


class GeneratePlanRequest(BaseModel):
    regenerate_all: bool = True
    constraints: Optional[str] = None
    exclude_recipe_ids: list[uuid.UUID] = []
