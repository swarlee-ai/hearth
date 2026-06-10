import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    color: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionWithCount(CollectionResponse):
    recipe_count: int
