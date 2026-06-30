from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.meal_plan import MealPlan, MealPlanEntry
from app.models.pantry_item import PantryItem
from app.models.recipe import Recipe
from app.models.shopping_list import ShoppingList

router = APIRouter(prefix="/api/mission-control", tags=["mission-control"])


MEAL_LABELS = {
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
}

# Eric's normal planning shape: dinners on weekdays, full Saturday, Sunday breakfast/lunch.
DEFAULT_TARGET_SLOTS = {
    0: ("dinner",),
    1: ("dinner",),
    2: ("dinner",),
    3: ("dinner",),
    4: ("dinner",),
    5: ("breakfast", "lunch", "dinner"),
    6: ("breakfast", "lunch"),
}


def _monday_of_week(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _slot_label(plan_date: date, meal_type: str) -> str:
    return f"{plan_date.strftime('%A')} {MEAL_LABELS.get(meal_type, meal_type.title())}"


def _shopping_counts(items: list) -> dict[str, int]:
    total = 0
    checked = 0
    categories = 0
    for category in items or []:
        category_items = category.get("items", []) if isinstance(category, dict) else []
        if category_items:
            categories += 1
        for item in category_items:
            total += 1
            if item.get("checked"):
                checked += 1
    return {
        "total": total,
        "checked": checked,
        "open": max(total - checked, 0),
        "categories": categories,
    }


@router.get("")
async def mission_control_summary(db: AsyncSession = Depends(get_db)):
    today = date.today()
    week_start = _monday_of_week(today)
    week_end = week_start + timedelta(days=6)

    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.week_start_date == week_start)
        .options(selectinload(MealPlan.entries).selectinload(MealPlanEntry.recipe))
    )
    plan = result.scalar_one_or_none()
    entries = list(plan.entries) if plan else []

    planned_slots = {(entry.plan_date, entry.meal_type) for entry in entries}
    target_slots = [
        (week_start + timedelta(days=day_offset), meal_type)
        for day_offset, meal_types in DEFAULT_TARGET_SLOTS.items()
        for meal_type in meal_types
    ]
    missing_slots = [
        _slot_label(plan_date, meal_type)
        for plan_date, meal_type in target_slots
        if (plan_date, meal_type) not in planned_slots
    ]
    missing_dinners = [
        plan_date.strftime("%A")
        for plan_date, meal_type in target_slots
        if meal_type == "dinner" and (plan_date, meal_type) not in planned_slots
    ]

    shopping_counts = {"total": 0, "checked": 0, "open": 0, "categories": 0}
    shopping_generated = False
    if plan:
        shopping_list = await db.scalar(select(ShoppingList).where(ShoppingList.meal_plan_id == plan.id))
        if shopping_list:
            shopping_generated = True
            shopping_counts = _shopping_counts(shopping_list.items or [])

    recipe_count = await db.scalar(select(func.count()).select_from(Recipe)) or 0
    favorite_count = await db.scalar(select(func.count()).select_from(Recipe).where(Recipe.is_favorite.is_(True))) or 0
    pantry_count = await db.scalar(select(func.count()).select_from(PantryItem)) or 0

    if not plan:
        recommended_action = "Create this week's meal plan."
    elif missing_dinners:
        recommended_action = f"Fill in dinner for {missing_dinners[0]}."
    elif not shopping_generated:
        recommended_action = "Generate this week's shopping list."
    elif shopping_counts["open"]:
        recommended_action = f"Shop or check off {shopping_counts['open']} remaining grocery items."
    else:
        recommended_action = "Meal plan and shopping list are ready."

    return {
        "app": "hearth",
        "status": "ok",
        "today": today.isoformat(),
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "plan": {
            "id": str(plan.id) if plan else None,
            "exists": plan is not None,
            "name": plan.name if plan else None,
            "is_ai_generated": plan.is_ai_generated if plan else False,
        },
        "meal_targets": len(target_slots),
        "planned_meals": len(planned_slots),
        "missing_meals": missing_slots,
        "missing_dinners": missing_dinners,
        "shopping": {
            "generated": shopping_generated,
            **shopping_counts,
        },
        "library": {
            "recipes": recipe_count,
            "favorites": favorite_count,
            "pantry_items": pantry_count,
        },
        "recommended_action": recommended_action,
    }
