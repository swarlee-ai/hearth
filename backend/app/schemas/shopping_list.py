import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ShoppingItem(BaseModel):
    id: str
    name: str
    quantity: str
    checked: bool = False
    recipe_ids: list[str] = []
    in_pantry: bool = False


class ShoppingCategory(BaseModel):
    category: str
    items: list[ShoppingItem]


class ShoppingListResponse(BaseModel):
    id: uuid.UUID
    meal_plan_id: uuid.UUID
    generated_at: datetime
    items: list[ShoppingCategory]

    model_config = {"from_attributes": True}


class ToggleItemRequest(BaseModel):
    checked: bool


class AddItemRequest(BaseModel):
    name: str
    quantity: Optional[str] = None
