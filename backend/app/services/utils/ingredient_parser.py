import re
from typing import Optional


_UNIT_PATTERNS = re.compile(
    r"^([\d\s/¼½¾⅓⅔⅛⅜⅝⅞]+\.?\d*)\s*"
    r"(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|"
    r"grams?|kg|ml|liters?|l\b|g\b|"
    r"cloves?|heads?|bunches?|stalks?|slices?|pieces?|cans?|packages?|bags?|jars?|"
    r"pinch(?:es)?|dash(?:es)?|handfuls?|sprigs?|inch(?:es)?|cm|mm)?\s*",
    re.IGNORECASE,
)

_FRACTION_MAP = {"¼": "0.25", "½": "0.5", "¾": "0.75", "⅓": "0.33", "⅔": "0.67",
                 "⅛": "0.125", "⅜": "0.375", "⅝": "0.625", "⅞": "0.875"}

# Leading bullet/list markers from scrapers
_BULLET_RE = re.compile(r'^[\s\-–—•*·]+')
# Range quantities like "2-3" or "0.5 - 0.75" at start → keep lower bound only
# Applied after fraction-char conversion so only digits, dots, slashes remain
_RANGE_QTY_RE = re.compile(r'^([\d\s./]+?)\s*[-–]\s*[\d./]+(?=\s)')
# Leading "of" / "each" / "each of" left after unit parsing
_LEADING_OF_RE = re.compile(r'^(?:each\s+(?:of\s+)?|of\s+)', re.IGNORECASE)


def parse_ingredient(raw: str) -> dict:
    """Parse a raw ingredient string into {qty, unit, name, notes}."""
    # Strip markdown list markers that scrapers sometimes include
    text = _BULLET_RE.sub("", raw.strip()).strip()

    for frac, dec in _FRACTION_MAP.items():
        text = text.replace(frac, dec)

    # Normalize range quantities to lower bound ("2-3" → "2", "0.5 - 0.75" → "0.5")
    text = _RANGE_QTY_RE.sub(r'\1', text).strip()

    notes = None
    paren_match = re.search(r"\(([^)]+)\)", text)
    if paren_match:
        notes = paren_match.group(1).strip()
        text = text[:paren_match.start()].strip() + " " + text[paren_match.end():].strip()
        text = text.strip()

    comma_parts = text.split(",", 1)
    if len(comma_parts) > 1:
        text = comma_parts[0].strip()
        extra = comma_parts[1].strip()
        notes = (notes + "; " + extra) if notes else extra

    match = _UNIT_PATTERNS.match(text)
    if match:
        qty_str = match.group(1).strip() if match.group(1) else None
        unit = match.group(2).strip() if match.group(2) else None
        name = text[match.end():].strip()
        qty = qty_str
    else:
        qty = None
        unit = None
        name = text

    # Strip leading "of" artifact (e.g. "1 can of broth" → name "of broth")
    name = _LEADING_OF_RE.sub("", name)

    name = re.sub(r"\s+", " ", name).strip().lower()
    if not name:
        name = _BULLET_RE.sub("", raw.strip()).lower().strip()

    return {"qty": qty, "unit": unit, "name": name, "notes": notes}
