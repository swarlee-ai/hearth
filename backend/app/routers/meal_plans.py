import uuid
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.meal_plan import MealPlan, MealPlanEntry
from app.models.settings import AppSettings
from app.schemas.meal_plan import (
    MealPlanResponse, MealPlanListItem, MealPlanEntryCreate,
    MealPlanEntryUpdate, MealPlanEntryResponse, GeneratePlanRequest,
)
from app.services.meal_plan_generator import generate_meal_plan

router = APIRouter(prefix="/api/meal-plans", tags=["meal-plans"])


def _monday_of_week(d: date) -> date:
    return d - timedelta(days=d.weekday())


async def _load_plan_with_entries(plan_id: uuid.UUID, db: AsyncSession) -> MealPlan | None:
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.id == plan_id)
        .options(selectinload(MealPlan.entries).selectinload(MealPlanEntry.recipe))
    )
    return result.scalar_one_or_none()


@router.get("", response_model=list[MealPlanListItem])
async def list_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MealPlan).options(selectinload(MealPlan.entries)).order_by(MealPlan.week_start_date.desc())
    )
    plans = result.scalars().all()
    return [
        MealPlanListItem(
            id=p.id,
            week_start_date=p.week_start_date,
            name=p.name,
            is_ai_generated=p.is_ai_generated,
            entry_count=len(p.entries),
        )
        for p in plans
    ]


@router.get("/week/{week_date}", response_model=MealPlanResponse)
async def get_or_create_week(week_date: date, db: AsyncSession = Depends(get_db)):
    monday = _monday_of_week(week_date)
    plan = await db.scalar(select(MealPlan).where(MealPlan.week_start_date == monday))
    if not plan:
        plan = MealPlan(week_start_date=monday)
        db.add(plan)
        await db.commit()
    loaded = await _load_plan_with_entries(plan.id, db)
    return loaded


@router.get("/{plan_id}", response_model=MealPlanResponse)
async def get_plan(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    plan = await _load_plan_with_entries(plan_id, db)
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    plan = await db.get(MealPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    await db.delete(plan)
    await db.commit()


@router.post("/{plan_id}/entries", response_model=MealPlanEntryResponse, status_code=201)
async def add_entry(plan_id: uuid.UUID, data: MealPlanEntryCreate, db: AsyncSession = Depends(get_db)):
    plan = await db.get(MealPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    entry = MealPlanEntry(meal_plan_id=plan_id, **data.model_dump())
    db.add(entry)
    await db.commit()
    result = await db.execute(
        select(MealPlanEntry)
        .where(MealPlanEntry.id == entry.id)
        .options(selectinload(MealPlanEntry.recipe))
    )
    return result.scalar_one()


@router.put("/{plan_id}/entries/{entry_id}", response_model=MealPlanEntryResponse)
async def update_entry(
    plan_id: uuid.UUID, entry_id: uuid.UUID,
    data: MealPlanEntryUpdate, db: AsyncSession = Depends(get_db)
):
    entry = await db.scalar(
        select(MealPlanEntry).where(
            MealPlanEntry.id == entry_id,
            MealPlanEntry.meal_plan_id == plan_id,
        )
    )
    if not entry:
        raise HTTPException(404, "Entry not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    await db.commit()
    result = await db.execute(
        select(MealPlanEntry)
        .where(MealPlanEntry.id == entry_id)
        .options(selectinload(MealPlanEntry.recipe))
    )
    return result.scalar_one()


@router.delete("/{plan_id}/entries/{entry_id}", status_code=204)
async def delete_entry(plan_id: uuid.UUID, entry_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    entry = await db.scalar(
        select(MealPlanEntry).where(
            MealPlanEntry.id == entry_id,
            MealPlanEntry.meal_plan_id == plan_id,
        )
    )
    if not entry:
        raise HTTPException(404, "Entry not found")
    await db.delete(entry)
    await db.commit()


@router.post("/{plan_id}/generate")
async def trigger_generate(
    plan_id: uuid.UUID, data: GeneratePlanRequest, db: AsyncSession = Depends(get_db)
):
    plan = await db.get(MealPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    settings = await db.scalar(select(AppSettings).where(AppSettings.id == 1))
    if not settings or not settings.llm_model_name:
        raise HTTPException(422, "LLM not configured. Set up LLM in Settings.")

    async def event_stream():
        async for chunk in generate_meal_plan(
            plan, settings, db,
            constraints=data.constraints,
            exclude_ids=data.exclude_recipe_ids,
        ):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )
