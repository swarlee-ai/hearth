import uuid
import re
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.meal_plan import MealPlanEntry
from app.models.recipe import Recipe
from app.models.settings import AppSettings
from app.services.utils.grocery_categories import categorize


# ── Unit canonicalization ───────────────────────────────────────────────

_UNIT_CANONICAL: dict[str, str] = {
    "cup": "cup", "cups": "cup",
    "tbsp": "tbsp", "tablespoon": "tbsp", "tablespoons": "tbsp",
    "tsp": "tsp", "teaspoon": "tsp", "teaspoons": "tsp",
    "oz": "oz", "ounce": "oz", "ounces": "oz",
    "lb": "lb", "lbs": "lb", "pound": "lb", "pounds": "lb",
    "g": "g", "gram": "g", "grams": "g",
    "kg": "kg", "kilogram": "kg", "kilograms": "kg",
    "ml": "ml", "milliliter": "ml", "milliliters": "ml",
    "l": "l", "liter": "l", "liters": "l",
    "clove": "clove", "cloves": "clove",
    "can": "can", "cans": "can",
    "bunch": "bunch", "bunches": "bunch",
    "slice": "slice", "slices": "slice",
    "piece": "piece", "pieces": "piece",
    "stalk": "stalk", "stalks": "stalk",
    "sprig": "sprig", "sprigs": "sprig",
}


def _canon_unit(unit: str | None) -> str | None:
    if not unit:
        return None
    return _UNIT_CANONICAL.get(unit.lower().strip(), unit.lower().strip())


# ── Quantity parsing and formatting ────────────────────────────────────

_FRACS = [
    (7/8, "7/8"), (3/4, "3/4"), (2/3, "2/3"), (5/8, "5/8"),
    (1/2, "1/2"), (3/8, "3/8"), (1/3, "1/3"), (1/4, "1/4"), (1/8, "1/8"),
]


def _parse_qty(qty_str: str | None) -> float | None:
    if not qty_str:
        return None
    total = 0.0
    for part in qty_str.strip().split():
        try:
            if "/" in part:
                n, d = part.split("/", 1)
                total += float(n) / float(d)
            else:
                total += float(part)
        except (ValueError, ZeroDivisionError):
            return None
    return total if total > 0 else None


def _format_qty(value: float) -> str:
    if value <= 0:
        return ""
    whole = int(value)
    frac = value - whole
    for decimal, label in _FRACS:
        if abs(frac - decimal) < 0.04:
            return (f"{whole} {label}" if whole else label).strip()
    if frac < 0.04:
        return str(whole)
    return str(round(value, 1)).rstrip("0").rstrip(".")


# ── Name normalization for deduplication ───────────────────────────────

_MODIFIER_RE = re.compile(
    r"\b(large|medium|small|extra.large|extra.small|big|tiny|"
    r"fresh|dried|frozen|canned|cooked|raw|ripe|"
    r"boneless|skinless|lean|whole|"
    r"chopped|diced|minced|sliced|grated|shredded|julienned|cubed|"
    r"halved|quartered|crushed|peeled|pitted|seeded|"
    r"roughly|finely|thinly|thickly|coarsely|"
    r"softened|melted|divided)\b",
    re.IGNORECASE,
)

_PLURAL_EXCEPTIONS: dict[str, str] = {
    "tomatoes": "tomato", "potatoes": "potato", "avocados": "avocado",
    "mangoes": "mango", "leaves": "leaf", "loaves": "loaf",
    "halves": "half", "berries": "berry", "cherries": "cherry",
    "strawberries": "strawberry", "blueberries": "blueberry",
    "raspberries": "raspberry", "cranberries": "cranberry",
    "olives": "olive", "limes": "lime", "oranges": "orange",
    "lemons": "lemon", "apples": "apple", "bananas": "banana",
    "mushrooms": "mushroom", "onions": "onion", "eggs": "egg",
    "cloves": "clove", "sprigs": "sprig", "stalks": "stalk",
    "slices": "slice", "pieces": "piece", "bunches": "bunch",
    "cans": "can", "jars": "jar", "bags": "bag", "boxes": "box",
    "packages": "package", "heads": "head",
}


def _depluralize(word: str) -> str:
    if word in _PLURAL_EXCEPTIONS:
        return _PLURAL_EXCEPTIONS[word]
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("oes") and len(word) > 4:
        return word[:-2]
    if word.endswith("es") and len(word) > 3 and word[-3] in "shxz":
        return word[:-2]
    if word.endswith("s") and len(word) > 2 and not word.endswith("ss"):
        return word[:-1]
    return word


def _normalize_key(name: str) -> str:
    key = name.lower().strip()
    key = _MODIFIER_RE.sub("", key)
    key = re.sub(r"\s+", " ", key).strip()
    key = " ".join(_depluralize(w) for w in key.split())
    return key


_TO_TASTE_RE = re.compile(
    r"\bto taste\b|\bas needed\b|\bto season\b|\bif desired\b|\boptional\b",
    re.IGNORECASE,
)

# Ingredients everyone has at home — skip them entirely
_ALWAYS_AVAILABLE = {
    "water", "tap water", "cold water", "hot water", "warm water",
    "boiling water", "ice water", "ice", "ice cube", "ice cubes",
}


# ── Store layout orderings ──────────────────────────────────────────────

_STORE_LAYOUTS: dict[str, list[str]] = {
    # Default: perimeter first, then center aisles
    "default": [
        "Produce", "Meat & Seafood", "Dairy & Eggs", "Bakery & Bread",
        "Pantry & Dry Goods", "Spices & Seasonings", "Frozen", "Beverages", "Other",
    ],
    # Walmart: produce → bakery (front-left) → meat (back wall) → dairy (back-right)
    #          → frozen (back aisles) → beverages → center dry goods
    "walmart": [
        "Produce", "Bakery & Bread", "Meat & Seafood", "Dairy & Eggs",
        "Frozen", "Beverages", "Pantry & Dry Goods", "Spices & Seasonings", "Other",
    ],
    # Target: produce → bakery → deli/meat → dairy → frozen → grocery aisles
    "target": [
        "Produce", "Bakery & Bread", "Meat & Seafood", "Dairy & Eggs",
        "Frozen", "Pantry & Dry Goods", "Spices & Seasonings", "Beverages", "Other",
    ],
    # Costco: follows warehouse flow — bulk dry goods first, then fresh perimeter
    "costco": [
        "Pantry & Dry Goods", "Spices & Seasonings", "Beverages", "Bakery & Bread",
        "Produce", "Meat & Seafood", "Dairy & Eggs", "Frozen", "Other",
    ],
}


# ── Main aggregator ─────────────────────────────────────────────────────

async def build_shopping_list(meal_plan_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """Build a categorized, de-duplicated shopping list from a meal plan."""
    result = await db.execute(
        select(MealPlanEntry)
        .where(MealPlanEntry.meal_plan_id == meal_plan_id)
        .options(selectinload(MealPlanEntry.recipe))
    )
    entries = result.scalars().all()

    # aggregated[key] = display item dict + internal tracking fields
    aggregated: dict[str, dict] = {}

    for entry in entries:
        recipe = entry.recipe
        if not recipe or not recipe.ingredients:
            continue

        servings_scale = 1.0
        if entry.servings_override and recipe.servings:
            servings_scale = entry.servings_override / recipe.servings

        for ing in recipe.ingredients:
            name = ing.get("name", "").strip()
            if not name:
                continue

            qty_raw = ing.get("qty")
            unit = ing.get("unit")
            notes = ing.get("notes") or ""

            # Skip "to taste" / "as needed" items
            if not qty_raw and _TO_TASTE_RE.search(f"{name} {notes}"):
                continue

            key = _normalize_key(name)
            if not key:
                continue
            if key in _ALWAYS_AVAILABLE or name.lower().strip() in _ALWAYS_AVAILABLE:
                continue

            qty_float = _parse_qty(qty_raw)
            if qty_float is not None:
                qty_float *= servings_scale
            canon = _canon_unit(unit)

            if key not in aggregated:
                if qty_float is not None:
                    display_qty = f"{_format_qty(qty_float)} {unit or ''}".strip()
                else:
                    display_qty = f"{qty_raw or ''} {unit or ''}".strip()

                aggregated[key] = {
                    "id": str(uuid.uuid4()),
                    "name": name,
                    "quantity": display_qty,
                    "checked": False,
                    "recipe_ids": [str(recipe.id)],
                    "_qty_float": qty_float,
                    "_unit": canon,
                }
            else:
                item = aggregated[key]
                if str(recipe.id) not in item["recipe_ids"]:
                    item["recipe_ids"].append(str(recipe.id))

                existing_float = item["_qty_float"]
                existing_unit = item["_unit"]

                if qty_float is not None and existing_float is not None and existing_unit == canon:
                    # Same unit — add them up
                    new_total = existing_float + qty_float
                    item["_qty_float"] = new_total
                    item["quantity"] = f"{_format_qty(new_total)} {unit or ''}".strip()
                elif qty_raw:
                    # Different units or unparseable — concatenate
                    new_part = f"{qty_raw} {unit or ''}".strip()
                    item["quantity"] = f"{item['quantity']} + {new_part}".strip(" +")
                    item["_qty_float"] = None  # mixed units, disable further math

    # Strip internal tracking fields before returning
    for item in aggregated.values():
        item.pop("_qty_float", None)
        item.pop("_unit", None)

    by_category: dict[str, list[dict]] = defaultdict(list)
    for item in aggregated.values():
        cat = categorize(item["name"])
        by_category[cat].append(item)

    settings = await db.scalar(select(AppSettings).where(AppSettings.id == 1))
    layout_key = (settings.store_layout if settings else None) or "default"
    category_order = _STORE_LAYOUTS.get(layout_key, _STORE_LAYOUTS["default"])

    result_list = []
    for cat in category_order:
        if cat in by_category:
            result_list.append({
                "category": cat,
                "items": sorted(by_category[cat], key=lambda x: x["name"]),
            })
    for cat, items in by_category.items():
        if cat not in category_order:
            result_list.append({"category": cat, "items": sorted(items, key=lambda x: x["name"])})

    return result_list
