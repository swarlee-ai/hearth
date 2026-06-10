import json
from app.services.llm_client import get_llm_client
from app.models.settings import AppSettings


async def estimate_nutrition(
    ingredients: list[dict],
    servings: int,
    settings: AppSettings,
) -> dict | None:
    """Use the configured LLM to estimate nutrition per serving."""
    client = get_llm_client(settings)
    if not client:
        return None

    ing_text = "\n".join(
        f"- {i.get('qty', '')} {i.get('unit', '')} {i.get('name', '')}".strip()
        for i in ingredients
        if i.get("name")
    )

    prompt = f"""Estimate the nutrition per serving for a recipe with {servings} servings.

Ingredients:
{ing_text}

Respond ONLY with a JSON object in this exact format (use numbers, not strings):
{{"calories": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "fiber_g": 0.0}}"""

    try:
        resp = await client.chat.completions.create(
            model=settings.llm_model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0,
        )
        text = resp.choices[0].message.content or ""
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1:
            return None
        return json.loads(text[start:end])
    except Exception:
        return None
    finally:
        await client.close()
