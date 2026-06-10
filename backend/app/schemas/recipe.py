import uuid
from datetime import datetime
from pydantic import BaseModel, HttpUrl
from typing import Optional


class Ingredient(BaseModel):
    qty: Optional[str] = None
    unit: Optional[str] = None
    name: str
    notes: Optional[str] = None


class Instruction(BaseModel):
    step: int
    text: str


class NutritionInfo(BaseModel):
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fiber_g: Optional[float] = None


class RecipeBase(BaseModel):
    title: str
    description: Optional[str] = None
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    total_time_minutes: Optional[int] = None
    servings: int = 4
    difficulty: Optional[str] = None
    ingredients: list[Ingredient] = []
    instructions: list[Instruction] = []
    cuisine_type: Optional[str] = None
    tags: list[str] = []
    is_favorite: bool = False
    is_kid_friendly: bool = False
    kid_mod_notes: Optional[str] = None
    is_leftover_friendly: bool = False
    leftover_days: int = 1


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    total_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    ingredients: Optional[list[Ingredient]] = None
    instructions: Optional[list[Instruction]] = None
    cuisine_type: Optional[str] = None
    tags: Optional[list[str]] = None
    is_favorite: Optional[bool] = None
    is_kid_friendly: Optional[bool] = None
    kid_mod_notes: Optional[str] = None
    is_leftover_friendly: Optional[bool] = None
    leftover_days: Optional[int] = None


class RecipeResponse(RecipeBase):
    id: uuid.UUID
    nutrition_per_serving: Optional[NutritionInfo] = None
    nutrition_is_estimated: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecipeImportRequest(BaseModel):
    url: str


class RecipeScaleRequest(BaseModel):
    target_servings: int


class RecipeListResponse(BaseModel):
    items: list[RecipeResponse]
    total: int
    page: int
    limit: int
