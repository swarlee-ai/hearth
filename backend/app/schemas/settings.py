from pydantic import BaseModel
from typing import Optional


class KidProfile(BaseModel):
    name: str
    age: int


class FamilyUpdate(BaseModel):
    adults_count: Optional[int] = None
    kids: Optional[list[KidProfile]] = None
    dietary_restrictions: Optional[list[str]] = None
    cuisine_preferences: Optional[list[str]] = None
    disliked_cuisines: Optional[list[str]] = None
    spice_tolerance: Optional[str] = None
    planned_meals: Optional[list[str]] = None
    meal_schedule: Optional[dict[str, list[str]]] = None
    store_layout: Optional[str] = None


class LLMUpdate(BaseModel):
    llm_base_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model_name: Optional[str] = None


class OnboardingComplete(BaseModel):
    adults_count: int = 2
    kids: list[KidProfile] = []
    dietary_restrictions: list[str] = []
    cuisine_preferences: list[str] = []
    disliked_cuisines: list[str] = []
    spice_tolerance: str = "medium"
    planned_meals: list[str] = ["dinner"]
    meal_schedule: dict[str, list[str]] = {
        "monday": ["dinner"], "tuesday": ["dinner"], "wednesday": ["dinner"],
        "thursday": ["dinner"], "friday": ["dinner"], "saturday": ["dinner"], "sunday": ["dinner"],
    }
    llm_base_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model_name: Optional[str] = None


class LLMTestRequest(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    model_name: str


class LLMTestResponse(BaseModel):
    ok: bool
    message: str


class SettingsResponse(BaseModel):
    onboarding_complete: bool
    adults_count: int
    kids: list[KidProfile]
    dietary_restrictions: list[str]
    cuisine_preferences: list[str]
    disliked_cuisines: list[str]
    spice_tolerance: str
    planned_meals: list[str]
    meal_schedule: dict[str, list[str]]
    llm_base_url: Optional[str]
    llm_api_key: Optional[str]
    llm_model_name: Optional[str]
    store_layout: str = "default"

    model_config = {"from_attributes": True}
