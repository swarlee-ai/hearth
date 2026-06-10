import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class TrustedSiteCreate(BaseModel):
    name: str
    base_url: str
    scrape_pattern: Optional[str] = None


class TrustedSiteResponse(BaseModel):
    id: uuid.UUID
    name: str
    base_url: str
    scrape_pattern: Optional[str]
    last_browsed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class BrowseSiteResponse(BaseModel):
    urls: list[str]
    count: int
    already_imported: int = 0


class ImportFromUrlsRequest(BaseModel):
    urls: list[str]


class ImportFromUrlsResponse(BaseModel):
    imported: int
    failed: int
    skipped: int
    recipes: list[dict]
    errors: list[str]
