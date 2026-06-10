import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.dialects.postgresql import array

from app.dependencies import get_db
from app.models.recipe import Recipe
from app.models.settings import AppSettings
from app.models.collection import collection_recipes, Collection
from app.schemas.collection import CollectionResponse
from app.schemas.recipe import (
    RecipeCreate, RecipeUpdate, RecipeResponse, RecipeImportRequest,
    RecipeListResponse, RecipeScaleRequest,
)
from app.services.recipe_scraper import scrape_recipe_url
from app.services.nutrition_estimator import estimate_nutrition
from app.services.auto_tagger import auto_tag, detect_cuisine, detect_kid_friendly, detect_leftover_friendly
from app.services.recipe_extractor import extract_recipe_from_image, extract_recipe_from_text
from app.services.youtube_fetcher import extract_video_id, get_video_metadata, get_transcript, get_video_description
from fastapi import File, UploadFile

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.get("", response_model=RecipeListResponse)
async def list_recipes(
    search: str | None = None,
    cuisine: str | None = None,
    tags: list[str] = Query(default=[]),
    difficulty: str | None = None,
    max_prep_time: int | None = None,
    kid_friendly: bool | None = None,
    leftover_friendly: bool | None = None,
    is_favorite: bool | None = None,
    collection_id: uuid.UUID | None = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    q = select(Recipe)
    if search:
        q = q.where(Recipe.title.ilike(f"%{search}%"))
    if cuisine:
        q = q.where(Recipe.cuisine_type.ilike(f"%{cuisine}%"))
    if tags:
        for tag in tags:
            q = q.where(Recipe.tags.contains([tag]))
    if difficulty:
        q = q.where(Recipe.difficulty == difficulty)
    if max_prep_time is not None:
        q = q.where(Recipe.prep_time_minutes <= max_prep_time)
    if kid_friendly is not None:
        q = q.where(Recipe.is_kid_friendly == kid_friendly)
    if leftover_friendly is not None:
        q = q.where(Recipe.is_leftover_friendly == leftover_friendly)
    if is_favorite is not None:
        q = q.where(Recipe.is_favorite == is_favorite)
    if collection_id is not None:
        q = q.join(collection_recipes, collection_recipes.c.recipe_id == Recipe.id).where(
            collection_recipes.c.collection_id == collection_id
        )

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar() or 0

    q = q.order_by(Recipe.is_favorite.desc(), Recipe.updated_at.desc())
    q = q.offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    recipes = result.scalars().all()

    return RecipeListResponse(items=list(recipes), total=total, page=page, limit=limit)


@router.post("", response_model=RecipeResponse, status_code=201)
async def create_recipe(data: RecipeCreate, db: AsyncSession = Depends(get_db)):
    recipe = Recipe(**data.model_dump())
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    return recipe


@router.get("/{recipe_id}/collections", response_model=list[CollectionResponse])
async def get_recipe_collections(recipe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Collection)
        .join(collection_recipes, collection_recipes.c.collection_id == Collection.id)
        .where(collection_recipes.c.recipe_id == recipe_id)
        .order_by(Collection.name)
    )
    return result.scalars().all()


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(recipe_id: uuid.UUID, data: RecipeUpdate, db: AsyncSession = Depends(get_db)):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    await db.delete(recipe)
    await db.commit()


@router.post("/import", response_model=RecipeResponse, status_code=201)
async def import_recipe(data: RecipeImportRequest, db: AsyncSession = Depends(get_db)):
    try:
        scraped = await scrape_recipe_url(data.url, db)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch URL: {e}")

    servings_raw = scraped.get("servings", 4)
    if isinstance(servings_raw, str):
        import re
        nums = re.findall(r"\d+", servings_raw)
        servings_int = int(nums[0]) if nums else 4
    else:
        servings_int = int(servings_raw) if servings_raw else 4

    _ingredients = scraped.get("ingredients", [])
    _tags = auto_tag(
        scraped["title"],
        _ingredients,
        scraped.get("total_time_minutes"),
        scraped.get("tags", []),
    )
    recipe = Recipe(
        title=scraped["title"],
        description=scraped.get("description"),
        source_url=scraped.get("source_url"),
        image_url=scraped.get("image_url"),
        prep_time_minutes=scraped.get("prep_time_minutes"),
        cook_time_minutes=scraped.get("cook_time_minutes"),
        total_time_minutes=scraped.get("total_time_minutes"),
        servings=servings_int,
        ingredients=_ingredients,
        instructions=scraped.get("instructions", []),
        cuisine_type=(
            scraped.get("cuisine_type")
            or detect_cuisine(scraped["title"], _ingredients)
        ),
        tags=_tags,
        is_kid_friendly=detect_kid_friendly(scraped["title"], _ingredients, _tags),
        is_leftover_friendly=detect_leftover_friendly(_tags),
    )
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


def _recipe_from_extracted(extracted: dict) -> dict:
    """Shared helper: run auto-tagging on an extracted recipe dict and return kwargs for Recipe()."""
    title = extracted.get("title") or "Imported Recipe"
    ingredients = extracted.get("ingredients") or []
    total_time = extracted.get("total_time_minutes")
    existing_tags = extracted.get("tags") or []
    tags = auto_tag(title, ingredients, total_time, existing_tags)
    return dict(
        title=title,
        description=extracted.get("description"),
        image_url=extracted.get("image_url"),
        prep_time_minutes=extracted.get("prep_time_minutes"),
        cook_time_minutes=extracted.get("cook_time_minutes"),
        total_time_minutes=total_time,
        servings=extracted.get("servings") or 4,
        ingredients=ingredients,
        instructions=extracted.get("instructions") or [],
        cuisine_type=extracted.get("cuisine_type") or detect_cuisine(title, ingredients),
        tags=tags,
        is_kid_friendly=detect_kid_friendly(title, ingredients, tags),
        is_leftover_friendly=detect_leftover_friendly(tags),
    )


_ALLOWED_PHOTO_TYPES = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
}
_MAX_PHOTO_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/import/photo", response_model=RecipeResponse, status_code=201)
async def import_from_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    content_type = (file.content_type or "").lower()
    mime = _ALLOWED_PHOTO_TYPES.get(content_type)
    if not mime:
        raise HTTPException(415, "Unsupported file type. Upload a JPEG, PNG, WEBP, or GIF image.")

    image_bytes = await file.read()
    if len(image_bytes) > _MAX_PHOTO_BYTES:
        raise HTTPException(413, "Image too large. Maximum size is 10 MB.")

    settings = await db.scalar(select(AppSettings))
    try:
        extracted = await extract_recipe_from_image(image_bytes, mime, settings)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(502, f"LLM extraction failed: {e}")

    recipe = Recipe(**_recipe_from_extracted(extracted))
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


class YouTubeImportRequest(BaseModel):
    url: str


@router.post("/import/youtube", response_model=RecipeResponse, status_code=201)
async def import_from_youtube(data: YouTubeImportRequest, db: AsyncSession = Depends(get_db)):
    video_id = extract_video_id(data.url)
    if not video_id:
        raise HTTPException(422, "Could not extract a YouTube video ID from that URL.")

    # Get transcript (primary) or description (fallback)
    transcript = await get_transcript(video_id)
    if not transcript:
        transcript = await get_video_description(video_id)
    if not transcript:
        raise HTTPException(422, "Could not retrieve transcript or description for this video.")

    metadata = await get_video_metadata(video_id)

    settings = await db.scalar(select(AppSettings))
    source_hint = f"YouTube video: {metadata.get('title') or data.url}"
    try:
        extracted = await extract_recipe_from_text(transcript, source_hint=source_hint, settings=settings)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(502, f"LLM extraction failed: {e}")

    # Fill in metadata from YouTube if the LLM didn't get a title
    if not extracted.get("title") or extracted["title"] == "Imported Recipe":
        extracted["title"] = metadata.get("title") or "YouTube Recipe"
    extracted["image_url"] = extracted.get("image_url") or metadata.get("thumbnail_url")
    extracted["source_url"] = data.url

    kwargs = _recipe_from_extracted(extracted)
    kwargs["source_url"] = data.url
    recipe = Recipe(**kwargs)
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.post("/{recipe_id}/favorite", response_model=RecipeResponse)
async def toggle_favorite(recipe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    recipe.is_favorite = not recipe.is_favorite
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.get("/{recipe_id}/nutrition", response_model=dict)
async def get_nutrition(recipe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    if recipe.nutrition_per_serving:
        return {"nutrition": recipe.nutrition_per_serving, "estimated": recipe.nutrition_is_estimated}

    settings = await db.scalar(select(AppSettings).where(AppSettings.id == 1))
    if not settings:
        raise HTTPException(422, "LLM not configured")

    nutrition = await estimate_nutrition(recipe.ingredients or [], recipe.servings, settings)
    if nutrition:
        recipe.nutrition_per_serving = nutrition
        recipe.nutrition_is_estimated = True
        await db.commit()
    return {"nutrition": nutrition, "estimated": True}


@router.post("/{recipe_id}/scale", response_model=dict)
async def scale_recipe(recipe_id: uuid.UUID, data: RecipeScaleRequest, db: AsyncSession = Depends(get_db)):
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")

    if not recipe.servings or recipe.servings == 0:
        return {"ingredients": recipe.ingredients, "target_servings": data.target_servings}

    scale = data.target_servings / recipe.servings
    scaled = []
    for ing in (recipe.ingredients or []):
        scaled_ing = dict(ing)
        if ing.get("qty"):
            try:
                scaled_ing["qty"] = f"{float(ing['qty']) * scale:.2g}"
            except (ValueError, TypeError):
                pass
        scaled.append(scaled_ing)

    return {"ingredients": scaled, "target_servings": data.target_servings, "original_servings": recipe.servings}
