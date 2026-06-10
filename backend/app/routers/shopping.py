import uuid
import copy
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.shopping_list import ShoppingList
from app.models.meal_plan import MealPlan
from app.models.pantry_item import PantryItem
from app.schemas.shopping_list import ShoppingListResponse, ToggleItemRequest, AddItemRequest
from app.services.utils.grocery_categories import categorize
from app.services.shopping_aggregator import build_shopping_list, _normalize_key

router = APIRouter(prefix="/api/meal-plans/{plan_id}/shopping", tags=["shopping"])


async def _get_or_generate(plan_id: uuid.UUID, db: AsyncSession) -> ShoppingList:
    sl = await db.scalar(select(ShoppingList).where(ShoppingList.meal_plan_id == plan_id))
    if not sl:
        items = await build_shopping_list(plan_id, db)
        sl = ShoppingList(meal_plan_id=plan_id, items=items)
        db.add(sl)
        await db.commit()
        await db.refresh(sl)
    return sl


async def _pantry_overlay(items: list, db: AsyncSession) -> list:
    pantry_result = await db.execute(select(PantryItem))
    pantry_names = {_normalize_key(p.name) for p in pantry_result.scalars().all()}
    if not pantry_names:
        return items
    overlaid = copy.deepcopy(items)
    for cat in overlaid:
        for item in cat.get("items", []):
            item["in_pantry"] = _normalize_key(item.get("name", "")) in pantry_names
    return overlaid


@router.get("", response_model=ShoppingListResponse)
async def get_shopping_list(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    plan = await db.get(MealPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    sl = await _get_or_generate(plan_id, db)
    items = await _pantry_overlay(sl.items or [], db)
    return ShoppingListResponse(
        id=sl.id,
        meal_plan_id=sl.meal_plan_id,
        generated_at=sl.generated_at,
        items=items,
    )


@router.post("/regenerate", response_model=ShoppingListResponse)
async def regenerate(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    plan = await db.get(MealPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Meal plan not found")
    sl = await db.scalar(select(ShoppingList).where(ShoppingList.meal_plan_id == plan_id))
    items = await build_shopping_list(plan_id, db)
    if sl:
        sl.items = items
        from datetime import datetime, timezone
        sl.generated_at = datetime.now(timezone.utc)
    else:
        sl = ShoppingList(meal_plan_id=plan_id, items=items)
        db.add(sl)
    await db.commit()
    await db.refresh(sl)
    return sl


@router.patch("/items/{item_id}", response_model=ShoppingListResponse)
async def toggle_item(
    plan_id: uuid.UUID, item_id: str, data: ToggleItemRequest, db: AsyncSession = Depends(get_db)
):
    sl = await db.scalar(select(ShoppingList).where(ShoppingList.meal_plan_id == plan_id))
    if not sl:
        raise HTTPException(404, "Shopping list not found")

    items = sl.items or []
    for category in items:
        for item in category.get("items", []):
            if item.get("id") == item_id:
                item["checked"] = data.checked
    sl.items = items
    from sqlalchemy import update
    await db.execute(
        update(ShoppingList).where(ShoppingList.id == sl.id).values(items=items)
    )
    await db.commit()
    await db.refresh(sl)
    return sl


@router.delete("/items/{item_id}", response_model=ShoppingListResponse)
async def delete_item(plan_id: uuid.UUID, item_id: str, db: AsyncSession = Depends(get_db)):
    sl = await db.scalar(select(ShoppingList).where(ShoppingList.meal_plan_id == plan_id))
    if not sl:
        raise HTTPException(404, "Shopping list not found")
    items = [
        {**cat, "items": [i for i in cat.get("items", []) if i.get("id") != item_id]}
        for cat in (sl.items or [])
    ]
    items = [cat for cat in items if cat["items"]]  # drop empty categories
    from sqlalchemy import update
    await db.execute(update(ShoppingList).where(ShoppingList.id == sl.id).values(items=items))
    await db.commit()
    await db.refresh(sl)
    return sl


@router.post("/items", response_model=ShoppingListResponse)
async def add_item(plan_id: uuid.UUID, data: AddItemRequest, db: AsyncSession = Depends(get_db)):
    sl = await _get_or_generate(plan_id, db)
    name = data.name.strip()
    if not name:
        raise HTTPException(400, "Name is required")
    category = categorize(name)
    new_item = {
        "id": str(uuid.uuid4()),
        "name": name,
        "quantity": data.quantity or "",
        "checked": False,
        "recipe_ids": [],
    }
    items = list(sl.items or [])
    for cat in items:
        if cat["category"] == category:
            cat["items"].append(new_item)
            break
    else:
        items.append({"category": category, "items": [new_item]})
    from sqlalchemy import update
    await db.execute(update(ShoppingList).where(ShoppingList.id == sl.id).values(items=items))
    await db.commit()
    await db.refresh(sl)
    return sl


@router.get("/export", response_class=PlainTextResponse)
async def export_shopping_list(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    sl = await _get_or_generate(plan_id, db)
    lines = []
    for category in (sl.items or []):
        lines.append(f"\n{category['category'].upper()}")
        lines.append("-" * len(category["category"]))
        for item in category.get("items", []):
            check = "[x]" if item.get("checked") else "[ ]"
            qty = f" - {item['quantity']}" if item.get("quantity") else ""
            lines.append(f"{check} {item['name']}{qty}")
    return "\n".join(lines)
