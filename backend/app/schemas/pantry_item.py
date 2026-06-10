import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class PantryItemCreate(BaseModel):
    name: str
    quantity: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class PantryItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class PantryItemResponse(BaseModel):
    id: uuid.UUID
    name: str
    quantity: Optional[str]
    unit: Optional[str]
    category: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
