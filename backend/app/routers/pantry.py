import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.pantry_item import PantryItem
from app.models.recipe import Recipe
from app.schemas.pantry_item import PantryItemCreate, PantryItemUpdate, PantryItemResponse
from app.services.utils.grocery_categories import categorize
from app.services.shopping_aggregator import _normalize_key

router = APIRouter(prefix="/api/pantry", tags=["pantry"])


@router.get("", response_model=list[PantryItemResponse])
async def list_pantry(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PantryItem).order_by(PantryItem.category, PantryItem.name))
    return result.scalars().all()


@router.get("/suggestions")
async def get_suggestions(db: AsyncSession = Depends(get_db)):
    pantry_result = await db.execute(select(PantryItem))
    pantry_items = pantry_result.scalars().all()

    if not pantry_items:
        return []

    pantry_names = {_normalize_key(item.name) for item in pantry_items}

    recipes_result = await db.execute(select(Recipe))
    suggestions = []
    for recipe in recipes_result.scalars().all():
        ingredients = recipe.ingredients or []
        if not ingredients:
            continue
        total = len(ingredients)
        matched = sum(
            1 for ing in ingredients
            if _normalize_key(ing.get("name", "")) in pantry_names
        )
        if matched == 0:
            continue
        suggestions.append({
            "recipe_id": str(recipe.id),
            "title": recipe.title,
            "image_url": recipe.image_url,
            "cuisine_type": recipe.cuisine_type,
            "total_time_minutes": recipe.total_time_minutes,
            "tags": recipe.tags or [],
            "matched_ingredients": matched,
            "total_ingredients": total,
            "coverage_pct": round(matched / total * 100),
        })

    suggestions.sort(key=lambda x: (-x["coverage_pct"], -x["matched_ingredients"]))
    return suggestions[:20]


@router.post("", response_model=PantryItemResponse, status_code=201)
async def add_item(data: PantryItemCreate, db: AsyncSession = Depends(get_db)):
    item = PantryItem(**data.model_dump(), category=categorize(data.name))
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=PantryItemResponse)
async def update_item(item_id: uuid.UUID, data: PantryItemUpdate, db: AsyncSession = Depends(get_db)):
    item = await db.get(PantryItem, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    if data.name is not None:
        item.category = categorize(data.name)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_item(item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    item = await db.get(PantryItem, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()


@router.delete("", status_code=204)
async def clear_pantry(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PantryItem))
    for item in result.scalars().all():
        await db.delete(item)
    await db.commit()
