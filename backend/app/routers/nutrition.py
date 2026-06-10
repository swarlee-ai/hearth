import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.meal_plan import MealPlan, MealPlanEntry
from app.models.settings import AppSettings
from app.services.nutrition_estimator import estimate_nutrition

router = APIRouter(prefix="/api", tags=["nutrition"])


@router.get("/meal-plans/{plan_id}/nutrition")
async def weekly_nutrition(plan_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MealPlanEntry)
        .where(MealPlanEntry.meal_plan_id == plan_id)
        .options(selectinload(MealPlanEntry.recipe))
    )
    entries = result.scalars().all()

    totals = {"calories": 0.0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "fiber_g": 0.0}
    recipe_count = 0

    for entry in entries:
        recipe = entry.recipe
        if not recipe or not recipe.nutrition_per_serving:
            continue
        n = recipe.nutrition_per_serving
        servings = entry.servings_override or recipe.servings or 1
        for key in totals:
            totals[key] += (n.get(key) or 0) * servings
        recipe_count += 1

    return {"weekly_totals": totals, "recipes_with_nutrition": recipe_count, "total_entries": len(entries)}


@router.post("/nutrition/estimate")
async def estimate_ad_hoc(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    settings = await db.scalar(select(AppSettings).where(AppSettings.id == 1))
    if not settings:
        raise HTTPException(422, "Settings not configured")
    ingredients = data.get("ingredients", [])
    servings = data.get("servings", 4)
    result = await estimate_nutrition(ingredients, servings, settings)
    if not result:
        raise HTTPException(503, "Could not estimate nutrition — check LLM settings")
    return result


@router.post("/ai/suggest-kid-mods")
async def suggest_kid_mods(data: dict, db: AsyncSession = Depends(get_db)):
    from app.services.llm_client import get_llm_client
    import json
    settings = await db.scalar(select(AppSettings).where(AppSettings.id == 1))
    client = get_llm_client(settings) if settings else None
    if not client:
        raise HTTPException(422, "LLM not configured")

    recipe_title = data.get("title", "this recipe")
    ingredients = data.get("ingredients", [])
    ing_text = ", ".join(i.get("name", "") for i in ingredients if i.get("name"))

    prompt = f"""For the recipe "{recipe_title}" with ingredients: {ing_text}

Suggest 3-5 simple kid-friendly modifications for young children (ages 4-10).
Focus on: reducing spice, hiding vegetables, making it more fun to eat, simplifying textures.
Return a JSON array of strings, each a single modification tip."""

    try:
        resp = await client.chat.completions.create(
            model=settings.llm_model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7,
        )
        text = resp.choices[0].message.content or "[]"
        start = text.find("[")
        end = text.rfind("]") + 1
        mods = json.loads(text[start:end]) if start != -1 else []
    except Exception:
        mods = []
    finally:
        await client.close()

    return {"modifications": mods}


@router.post("/ai/suggest-tags")
async def suggest_tags(data: dict, db: AsyncSession = Depends(get_db)):
    from app.services.llm_client import get_llm_client
    import json
    settings = await db.scalar(select(AppSettings).where(AppSettings.id == 1))
    client = get_llm_client(settings) if settings else None
    if not client:
        raise HTTPException(422, "LLM not configured")

    title = data.get("title", "")
    ingredients = data.get("ingredients", [])
    ing_text = ", ".join(i.get("name", "") for i in ingredients[:10] if i.get("name"))

    prompt = f"""For the recipe "{title}" with ingredients: {ing_text}

Suggest relevant tags from these categories:
- Dietary: vegetarian, vegan, gluten-free, dairy-free, low-carb, keto, paleo
- Meal type: quick, one-pot, make-ahead, freezer-friendly, batch-cooking
- Difficulty: easy, medium, hard
- Time: under-30-minutes, under-1-hour

Return ONLY a JSON array of tag strings (lowercase, hyphenated). Max 6 tags."""

    try:
        resp = await client.chat.completions.create(
            model=settings.llm_model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0,
        )
        text = resp.choices[0].message.content or "[]"
        start = text.find("[")
        end = text.rfind("]") + 1
        tags = json.loads(text[start:end]) if start != -1 else []
    except Exception:
        tags = []
    finally:
        await client.close()

    return {"tags": tags}
