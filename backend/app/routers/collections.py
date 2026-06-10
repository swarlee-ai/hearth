import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, insert, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.dependencies import get_db
from app.models.collection import Collection, collection_recipes
from app.models.recipe import Recipe
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionResponse, CollectionWithCount
from app.schemas.recipe import RecipeListResponse, RecipeResponse

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("", response_model=list[CollectionWithCount])
async def list_collections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Collection,
            func.count(collection_recipes.c.recipe_id).label("recipe_count"),
        )
        .outerjoin(collection_recipes, collection_recipes.c.collection_id == Collection.id)
        .group_by(Collection.id)
        .order_by(Collection.name)
    )
    rows = result.all()
    return [
        CollectionWithCount(**CollectionResponse.model_validate(row[0]).model_dump(), recipe_count=row[1])
        for row in rows
    ]


@router.post("", response_model=CollectionResponse, status_code=201)
async def create_collection(data: CollectionCreate, db: AsyncSession = Depends(get_db)):
    coll = Collection(**data.model_dump())
    db.add(coll)
    await db.commit()
    await db.refresh(coll)
    return coll


@router.patch("/{coll_id}", response_model=CollectionResponse)
async def update_collection(coll_id: uuid.UUID, data: CollectionUpdate, db: AsyncSession = Depends(get_db)):
    coll = await db.get(Collection, coll_id)
    if not coll:
        raise HTTPException(404, "Collection not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(coll, field, value)
    await db.commit()
    await db.refresh(coll)
    return coll


@router.delete("/{coll_id}", status_code=204)
async def delete_collection(coll_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    coll = await db.get(Collection, coll_id)
    if not coll:
        raise HTTPException(404, "Collection not found")
    await db.delete(coll)
    await db.commit()


@router.get("/{coll_id}/recipes", response_model=RecipeListResponse)
async def get_collection_recipes(coll_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    coll = await db.get(Collection, coll_id)
    if not coll:
        raise HTTPException(404, "Collection not found")
    result = await db.execute(
        select(Recipe)
        .join(collection_recipes, collection_recipes.c.recipe_id == Recipe.id)
        .where(collection_recipes.c.collection_id == coll_id)
        .order_by(Recipe.is_favorite.desc(), Recipe.title)
    )
    recipes = result.scalars().all()
    return RecipeListResponse(items=recipes, total=len(recipes), page=1, limit=len(recipes))


@router.put("/{coll_id}/recipes/{recipe_id}", status_code=204)
async def add_recipe(coll_id: uuid.UUID, recipe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    coll = await db.get(Collection, coll_id)
    if not coll:
        raise HTTPException(404, "Collection not found")
    recipe = await db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    stmt = pg_insert(collection_recipes).values(
        collection_id=coll_id, recipe_id=recipe_id
    ).on_conflict_do_nothing()
    await db.execute(stmt)
    await db.commit()


@router.delete("/{coll_id}/recipes/{recipe_id}", status_code=204)
async def remove_recipe(coll_id: uuid.UUID, recipe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(collection_recipes).where(
            collection_recipes.c.collection_id == coll_id,
            collection_recipes.c.recipe_id == recipe_id,
        )
    )
    await db.commit()
