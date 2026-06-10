from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.settings import AppSettings
from app.schemas.settings import (
    SettingsResponse, FamilyUpdate, LLMUpdate,
    OnboardingComplete, LLMTestRequest, LLMTestResponse,
)
from app.services.llm_client import test_llm_connection

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def _get_or_create_settings(db: AsyncSession) -> AppSettings:
    settings = await db.scalar(select(AppSettings).where(AppSettings.id == 1))
    if not settings:
        settings = AppSettings(id=1)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    return await _get_or_create_settings(db)


@router.put("", response_model=SettingsResponse)
async def update_settings(data: OnboardingComplete, db: AsyncSession = Depends(get_db)):
    settings = await _get_or_create_settings(db)
    for field, value in data.model_dump(exclude_unset=False).items():
        setattr(settings, field, value)
    settings.onboarding_complete = True
    await db.commit()
    await db.refresh(settings)
    return settings


@router.patch("/family", response_model=SettingsResponse)
async def update_family(data: FamilyUpdate, db: AsyncSession = Depends(get_db)):
    settings = await _get_or_create_settings(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings


@router.patch("/llm", response_model=SettingsResponse)
async def update_llm(data: LLMUpdate, db: AsyncSession = Depends(get_db)):
    settings = await _get_or_create_settings(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings


@router.post("/llm/test", response_model=LLMTestResponse)
async def test_llm(data: LLMTestRequest):
    ok, message = await test_llm_connection(data.base_url, data.api_key, data.model_name)
    return LLMTestResponse(ok=ok, message=message)


@router.post("/onboarding/complete", response_model=SettingsResponse)
async def complete_onboarding(data: OnboardingComplete, db: AsyncSession = Depends(get_db)):
    return await update_settings(data, db)
