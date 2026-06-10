"""LLM-based recipe extraction from images and text (YouTube transcripts, etc.)"""
import json
import re
import base64
from typing import Optional

from app.models.settings import AppSettings
from app.services.llm_client import get_llm_client
from app.services.utils.ingredient_parser import parse_ingredient


_SYSTEM_PROMPT = """You are a recipe extraction assistant. Extract the recipe from the provided content and return ONLY a valid JSON object — no markdown fences, no explanation, no extra text.

Use this exact schema:
{
  "title": "string",
  "description": "string or null",
  "servings": 4,
  "prep_time_minutes": null,
  "cook_time_minutes": null,
  "total_time_minutes": null,
  "ingredients": [
    {"qty": "1", "unit": "cup", "name": "flour", "notes": null}
  ],
  "instructions": [
    {"step": 1, "text": "Mix dry ingredients."}
  ],
  "cuisine_type": null
}

Rules:
- ingredients: array of objects with qty (string or null), unit (string or null), name (string), notes (string or null)
- instructions: numbered steps starting at 1
- All time values are integers in minutes, or null if unknown
- Return ONLY the JSON object"""


def _parse_llm_json(text: str) -> dict:
    """Strip markdown fences and parse JSON from LLM response."""
    text = text.strip()
    # Strip ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    return json.loads(text)


def _normalise_extracted(data: dict) -> dict:
    """Ensure the extracted dict has proper types and ingredient objects."""
    # Re-parse ingredients that came back as plain strings
    ingredients = []
    for ing in data.get("ingredients", []):
        if isinstance(ing, str):
            ingredients.append(parse_ingredient(ing))
        elif isinstance(ing, dict):
            ingredients.append({
                "qty": ing.get("qty") or None,
                "unit": ing.get("unit") or None,
                "name": str(ing.get("name", "")).strip(),
                "notes": ing.get("notes") or None,
            })
    data["ingredients"] = ingredients

    # Ensure instructions are dicts
    instructions = []
    for i, inst in enumerate(data.get("instructions", []), 1):
        if isinstance(inst, str):
            instructions.append({"step": i, "text": inst})
        elif isinstance(inst, dict):
            instructions.append({"step": inst.get("step", i), "text": str(inst.get("text", ""))})
    data["instructions"] = instructions

    # Coerce numeric fields
    for field in ("prep_time_minutes", "cook_time_minutes", "total_time_minutes", "servings"):
        val = data.get(field)
        if val is not None:
            try:
                data[field] = int(val)
            except (TypeError, ValueError):
                data[field] = None if field != "servings" else 4

    if not data.get("servings"):
        data["servings"] = 4

    return data


async def extract_recipe_from_image(
    image_bytes: bytes,
    mime_type: str,
    settings: AppSettings,
) -> dict:
    """Use LLM vision to extract a recipe from an uploaded image."""
    client = get_llm_client(settings)
    if not client:
        raise ValueError("LLM not configured. Set up your AI model in Settings first.")

    b64 = base64.b64encode(image_bytes).decode()
    data_url = f"data:{mime_type};base64,{b64}"

    try:
        resp = await client.chat.completions.create(
            model=settings.llm_model_name,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": "Extract the recipe from this image."},
                    ],
                },
            ],
            max_tokens=2048,
            temperature=0.1,
        )
        raw = resp.choices[0].message.content or "{}"
        data = _parse_llm_json(raw)
        return _normalise_extracted(data)
    finally:
        await client.close()


async def extract_recipe_from_text(
    text: str,
    source_hint: Optional[str] = None,
    settings: Optional[AppSettings] = None,
) -> dict:
    """Use LLM to extract a recipe from plain text (transcript, description, etc.)."""
    client = get_llm_client(settings)
    if not client:
        raise ValueError("LLM not configured. Set up your AI model in Settings first.")

    hint = f" The content is from: {source_hint}." if source_hint else ""
    user_msg = f"Extract the recipe from the following text.{hint}\n\n{text[:12000]}"

    try:
        resp = await client.chat.completions.create(
            model=settings.llm_model_name,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=2048,
            temperature=0.1,
        )
        raw = resp.choices[0].message.content or "{}"
        data = _parse_llm_json(raw)
        return _normalise_extracted(data)
    finally:
        await client.close()
