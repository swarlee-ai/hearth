import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db
from app.models.settings import AppSettings
from app.models.recipe import Recipe
from app.models.pantry_item import PantryItem
from app.services.llm_client import completion_extra_args, get_llm_client

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


async def _build_system_prompt(db: AsyncSession) -> str:
    settings = await db.scalar(select(AppSettings))
    recipe_count = await db.scalar(select(func.count(Recipe.id)))
    pantry_result = await db.execute(select(PantryItem.name).order_by(PantryItem.category, PantryItem.name))
    pantry_names = pantry_result.scalars().all()

    favorites_result = await db.execute(
        select(Recipe.title, Recipe.cuisine_type, Recipe.tags)
        .where(Recipe.is_favorite == True)
        .limit(30)
    )
    other_result = await db.execute(
        select(Recipe.title, Recipe.cuisine_type, Recipe.tags)
        .where(Recipe.is_favorite == False)
        .order_by(Recipe.updated_at.desc())
        .limit(50)
    )

    recipes = favorites_result.all() + other_result.all()
    recipe_lines = [
        f"- {r.title}" + (f" ({r.cuisine_type})" if r.cuisine_type else "")
        for r in recipes[:60]
    ]

    parts = [
        "You are a helpful cooking and meal planning assistant built into a family meal planner app.",
        "You help users plan meals, find recipes, suggest what to cook, and answer cooking questions.",
        "Keep responses concise and practical. Format ingredient lists and steps clearly.",
        "",
    ]

    if settings:
        adults = settings.adults_count or 2
        kids = settings.kids or []
        diets = settings.dietary_restrictions or []
        parts.append(f"Family: {adults} adult(s)" + (f", {len(kids)} kid(s)" if kids else "") + ".")
        if diets:
            parts.append(f"Dietary restrictions: {', '.join(diets)}.")
        if settings.spice_tolerance:
            parts.append(f"Spice tolerance: {settings.spice_tolerance}.")

    parts.append(f"\nThe user has {recipe_count} recipes in their library.")
    if recipe_lines:
        parts.append("Some recipes in their library:")
        parts.extend(recipe_lines)

    if pantry_names:
        parts.append(f"\nCurrently in pantry: {', '.join(pantry_names[:50])}.")

    parts.append(
        "\nWhen suggesting recipes from the library, reference them by their exact title. "
        "When the user asks what they can make, consider the pantry items listed above."
    )

    return "\n".join(parts)


@router.post("")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    settings = await db.scalar(select(AppSettings))
    client = get_llm_client(settings) if settings else None

    if not client:
        async def _no_llm():
            yield f'data: {json.dumps({"error": "LLM not configured. Set up your AI model in Settings first."})}\n\n'
        return StreamingResponse(_no_llm(), media_type="text/event-stream")

    system_prompt = await _build_system_prompt(db)
    model = settings.llm_model_name

    messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content} for m in req.messages
    ]

    async def _stream():
        emitted_content = False
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                max_tokens=1024,
                temperature=0.7,
                **completion_extra_args(settings),
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    emitted_content = True
                    yield f"data: {json.dumps({'chunk': delta})}\n\n"
            if not emitted_content:
                yield f"data: {json.dumps({'chunk': 'I did not receive any answer text from the configured model. Try again or check the LLM settings.'})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            await client.close()
            await db.close()

    return StreamingResponse(_stream(), media_type="text/event-stream")
