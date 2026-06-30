import json
import logging
import uuid
from datetime import date, timedelta
from typing import AsyncIterator

from sqlalchemy import select

from app.models.meal_plan import MealPlan, MealPlanEntry
from app.models.recipe import Recipe
from app.models.settings import AppSettings
from app.services.llm_client import completion_extra_args, get_llm_client

logger = logging.getLogger(__name__)


async def generate_meal_plan(
    meal_plan: MealPlan,
    settings: AppSettings,
    db,
    constraints: str | None = None,
    exclude_ids: list[uuid.UUID] | None = None,
) -> AsyncIterator[str]:
    """Stream SSE events while generating and saving meal plan entries."""
    client = get_llm_client(settings)
    if not client:
        yield f'data: {{"error": "LLM not configured"}}\n\n'
        return

    recipes = await _get_candidate_recipes(db, settings, exclude_ids or [])
    if not recipes:
        yield f'data: {{"error": "No recipes in library. Add some recipes first."}}\n\n'
        return

    # Only send the most useful subset (up to 40) — sending 150+ overloads the model.
    selected = _select_recipes_for_prompt(recipes)
    recipe_list = [
        {
            "id": str(r.id),
            "title": r.title,
            "cuisine_type": r.cuisine_type,
            "tags": r.tags,
            "is_kid_friendly": r.is_kid_friendly,
            "is_leftover_friendly": r.is_leftover_friendly,
            "prep_time_minutes": r.prep_time_minutes,
            "is_favorite": r.is_favorite,
        }
        for r in selected
    ]

    week_dates = [
        (meal_plan.week_start_date + timedelta(days=i)).isoformat()
        for i in range(7)
    ]

    family_context = _build_family_context(settings)

    _day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    meal_schedule = settings.meal_schedule or {d: ["dinner"] for d in _day_names}

    # Build per-date schedule lines and identify lunch days for leftover logic
    schedule_lines = []
    lunch_days: list[str] = []
    for date_str in week_dates:
        d = date.fromisoformat(date_str)
        day_name = _day_names[d.weekday()]
        meals = meal_schedule.get(day_name, ["dinner"])
        schedule_lines.append(f"  {date_str} ({day_name.capitalize()}): {', '.join(meals)}")
        if "lunch" in meals:
            lunch_days.append(date_str)

    day_schedule_str = "\n".join(schedule_lines)
    leftover_note = (
        f"Days with lunch planned: {', '.join(lunch_days)}. "
        "For each such day, prefer scheduling a leftover-friendly dinner the evening before so it can be reused for that lunch."
        if lunch_days else "No lunch days — skip leftover scheduling."
    )

    compact_recipes = [
        {"id": r["id"], "title": r["title"], "cuisine_type": r["cuisine_type"],
         "tags": r["tags"], "is_kid_friendly": r["is_kid_friendly"],
         "is_leftover_friendly": r["is_leftover_friendly"]}
        for r in recipe_list
    ]

    prompt = f"""You are a family meal planner. You MUST respond with ONLY a valid JSON object — no explanation, no markdown, no extra text before or after.

Required JSON format:
{{"entries":[{{"plan_date":"YYYY-MM-DD","meal_type":"dinner","recipe_id":"uuid","is_leftover":false}}],"notes":"brief notes"}}

Family context:
{family_context}

Per-day meal schedule (ONLY plan meals listed for each day):
{day_schedule_str}

Leftover rule: {leftover_note}
{f'Additional constraints: {constraints}' if constraints else ''}

Available recipes (use ONLY these IDs exactly as shown):
{json.dumps(compact_recipes, indent=2)}

Rules:
1. Only create entries for the meal types listed in the per-day schedule above
2. Each recipe at most 2 times per week
3. Vary cuisine types across the week
4. Leftover-friendly dinners should be scheduled the night before a lunch day; add a lunch entry for that next day with is_leftover: true and the same recipe_id
5. Prefer favorites; consider kid_friendly recipes on weekends
6. Balance prep times — avoid all long-prep meals on weekdays

Output the JSON object only. Start your response with {{ and end with }}."""

    yield f'data: {{"status": "generating"}}\n\n'

    full_response = ""
    try:
        stream = await client.chat.completions.create(
            model=settings.llm_model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4000,
            temperature=0.7,
            stream=True,
            timeout=300.0,
            **completion_extra_args(settings),
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                full_response += delta
                yield f'data: {{"chunk": {json.dumps(delta)}}}\n\n'
    except Exception as e:
        logger.error("LLM generation error: %s", e)
        yield f'data: {{"error": "LLM call failed: {str(e)}"}}\n\n'
    finally:
        try:
            await client.close()
        except Exception:
            pass

    if not full_response.strip():
        yield f'data: {{"error": "The model returned an empty response. Try a simpler meal plan or check your LLM settings."}}\n\n'
        return

    try:
        plan_data = _extract_json(full_response)
        entries_data = plan_data.get("entries", [])
        notes = plan_data.get("notes", "")

        recipe_map = {str(r.id): r for r in selected}

        await db.execute(
            MealPlanEntry.__table__.delete().where(
                MealPlanEntry.meal_plan_id == meal_plan.id
            )
        )

        for entry_dict in entries_data:
            rid = entry_dict.get("recipe_id")
            if rid not in recipe_map:
                continue
            entry = MealPlanEntry(
                meal_plan_id=meal_plan.id,
                recipe_id=uuid.UUID(rid),
                plan_date=date.fromisoformat(entry_dict["plan_date"]),
                meal_type=entry_dict.get("meal_type", "dinner"),
                sort_order=0,
            )
            db.add(entry)

        meal_plan.is_ai_generated = True
        meal_plan.generation_notes = notes
        await db.commit()

        yield f'data: {{"status": "complete", "notes": {json.dumps(notes)}}}\n\n'
    except Exception as e:
        logger.error("Meal plan parse error. Raw response:\n%s", full_response)
        yield f'data: {{"error": "Failed to parse AI response: {str(e)}"}}\n\n'


async def _get_candidate_recipes(
    db, settings: AppSettings, exclude_ids: list[uuid.UUID]
) -> list[Recipe]:
    q = select(Recipe)
    if exclude_ids:
        q = q.where(Recipe.id.notin_(exclude_ids))
    result = await db.execute(q)
    recipes = result.scalars().all()
    return list(recipes)


def _select_recipes_for_prompt(recipes: list[Recipe], limit: int = 40) -> list[Recipe]:
    """Pick the most useful subset of recipes to send to the model.

    Strategy:
    1. All favorites first (they're most likely to be used)
    2. Kid-friendly recipes
    3. Remaining recipes, balanced by cuisine type
    """
    if len(recipes) <= limit:
        return list(recipes)

    favorites = [r for r in recipes if r.is_favorite]
    kid_friendly = [r for r in recipes if r.is_kid_friendly]
    remaining = [r for r in recipes if not r.is_favorite and not r.is_kid_friendly]

    # De-duplicate by id
    seen = set()
    selected: list[Recipe] = []
    for r in favorites + kid_friendly + remaining:
        if str(r.id) not in seen:
            seen.add(str(r.id))
            selected.append(r)
        if len(selected) >= limit:
            break

    return selected


def _build_family_context(settings: AppSettings) -> str:
    kids_str = ""
    if settings.kids:
        kids_str = ", ".join(f"{k['name']} (age {k['age']})" for k in settings.kids)
    return (
        f"- Adults: {settings.adults_count}\n"
        f"- Kids: {kids_str or 'none'}\n"
        f"- Dietary restrictions: {', '.join(settings.dietary_restrictions) or 'none'}\n"
        f"- Preferred cuisines: {', '.join(settings.cuisine_preferences) or 'any'}\n"
        f"- Disliked cuisines: {', '.join(settings.disliked_cuisines) or 'none'}\n"
        f"- Spice tolerance: {settings.spice_tolerance}"
    )


def _extract_json(text: str) -> dict:
    import re as _re
    # Strip markdown code fences
    text = _re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=_re.MULTILINE)
    text = _re.sub(r"```\s*$", "", text.strip(), flags=_re.MULTILINE)
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > 0:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
    # Fallback: parse plain-text format the model sometimes emits.
    # Looks for lines like "2026-06-08 ... Dinner ... Recipe ID: <uuid>"
    entries = []
    for match in _re.finditer(
        r"(\d{4}-\d{2}-\d{2}).*?\b(breakfast|lunch|dinner)\b.*?Recipe ID:\s*([a-f0-9\-]{36})",
        text, _re.IGNORECASE,
    ):
        entries.append({
            "plan_date": match.group(1),
            "meal_type": match.group(2).lower(),
            "recipe_id": match.group(3),
            "is_leftover": False,
        })
    if entries:
        return {"entries": entries, "notes": ""}
    raise ValueError(f"No JSON found in response. Raw: {text[:300]!r}")