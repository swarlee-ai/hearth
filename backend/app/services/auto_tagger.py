"""
Rule-based recipe auto-tagger.
Infers tags from title, ingredient names, and cook time — no LLM required.
Applied at import time so recipes are immediately filterable.
"""

import re

# Ingredient keyword → tag (first match wins for protein group)
_PROTEIN_KEYWORDS: list[tuple[str, str]] = [
    ("chicken", "chicken"),
    ("turkey", "turkey"),
    ("beef", "beef"),
    ("steak", "beef"),
    ("brisket", "beef"),
    ("ground beef", "beef"),
    ("pork", "pork"),
    ("bacon", "pork"),
    ("ham", "pork"),
    ("prosciutto", "pork"),
    ("pancetta", "pork"),
    ("sausage", "pork"),
    ("lamb", "lamb"),
    ("salmon", "fish"),
    ("tuna", "fish"),
    ("cod", "fish"),
    ("tilapia", "fish"),
    ("halibut", "fish"),
    ("mahi", "fish"),
    ("trout", "fish"),
    ("fish", "fish"),
    ("shrimp", "seafood"),
    ("prawn", "seafood"),
    ("crab", "seafood"),
    ("lobster", "seafood"),
    ("scallop", "seafood"),
    ("clam", "seafood"),
    ("mussel", "seafood"),
    ("squid", "seafood"),
    ("octopus", "seafood"),
    ("seafood", "seafood"),
    ("tofu", "tofu"),
    ("tempeh", "tofu"),
]

# All meat/fish keywords — used for vegetarian/vegan detection
_MEAT_KEYWORDS = {
    "chicken", "turkey", "beef", "steak", "brisket", "pork", "bacon", "ham",
    "prosciutto", "pancetta", "sausage", "chorizo", "pepperoni", "salami",
    "lamb", "veal", "duck", "goose", "venison", "bison", "rabbit",
    "salmon", "tuna", "cod", "tilapia", "halibut", "mahi", "trout", "fish",
    "shrimp", "prawn", "crab", "lobster", "scallop", "clam", "mussel",
    "squid", "octopus", "seafood", "anchovy", "sardine",
    "gelatin", "lard", "suet", "bone broth", "meat", "ground beef",
    "chicken broth", "beef broth", "chicken stock", "beef stock",
}

_DAIRY_KEYWORDS = {
    "milk", "cream", "butter", "cheese", "yogurt", "ghee",
    "sour cream", "heavy cream", "whipping cream", "half and half",
    "parmesan", "mozzarella", "cheddar", "brie", "feta", "ricotta",
    "mascarpone", "cream cheese", "buttermilk",
}

_EGG_KEYWORDS = {"egg", "eggs", "egg yolk", "egg white"}

# Title keyword → tag
_DISH_KEYWORDS: list[tuple[str, str]] = [
    ("soup", "soup"),
    ("stew", "soup"),
    ("chili", "soup"),
    ("bisque", "soup"),
    ("chowder", "soup"),
    ("broth", "soup"),
    ("salad", "salad"),
    ("slaw", "salad"),
    ("pasta", "pasta"),
    ("spaghetti", "pasta"),
    ("linguine", "pasta"),
    ("fettuccine", "pasta"),
    ("penne", "pasta"),
    ("rigatoni", "pasta"),
    ("lasagna", "pasta"),
    ("ravioli", "pasta"),
    ("gnocchi", "pasta"),
    ("mac and cheese", "pasta"),
    ("pizza", "pizza"),
    ("flatbread", "pizza"),
    ("sandwich", "sandwich"),
    ("burger", "sandwich"),
    ("wrap", "sandwich"),
    ("sub", "sandwich"),
    ("panini", "sandwich"),
    ("taco", "tacos"),
    ("burrito", "tacos"),
    ("enchilada", "tacos"),
    ("quesadilla", "tacos"),
    ("fajita", "tacos"),
    ("curry", "curry"),
    ("masala", "curry"),
    ("tikka", "curry"),
    ("korma", "curry"),
    ("stir fry", "stir-fry"),
    ("stir-fry", "stir-fry"),
    ("fried rice", "stir-fry"),
    ("lo mein", "stir-fry"),
    ("pad thai", "stir-fry"),
    ("casserole", "casserole"),
    ("bake", "casserole"),
    ("gratin", "casserole"),
    ("risotto", "risotto"),
    ("noodle", "noodles"),
    ("ramen", "noodles"),
    ("pho", "noodles"),
    ("udon", "noodles"),
    ("bowl", "bowl"),
    ("smoothie", "smoothie"),
    ("shake", "smoothie"),
    ("cake", "dessert"),
    ("cookie", "dessert"),
    ("muffin", "dessert"),
    ("brownie", "dessert"),
    ("pie", "dessert"),
    ("tart", "dessert"),
    ("pudding", "dessert"),
    ("ice cream", "dessert"),
    ("sorbet", "dessert"),
    ("cheesecake", "dessert"),
    ("cupcake", "dessert"),
    ("donut", "dessert"),
    ("breakfast", "breakfast"),
    ("waffle", "breakfast"),
    ("pancake", "breakfast"),
    ("french toast", "breakfast"),
    ("omelet", "breakfast"),
    ("omelette", "breakfast"),
    ("frittata", "breakfast"),
    ("scrambled", "breakfast"),
    ("eggs benedict", "breakfast"),
    ("granola", "breakfast"),
    ("oatmeal", "breakfast"),
    ("porridge", "breakfast"),
    ("hash brown", "breakfast"),
    ("quiche", "breakfast"),
    ("bread", "bread"),
    ("loaf", "bread"),
    ("biscuit", "bread"),
    ("roll", "bread"),
    ("bagel", "bread"),
    ("focaccia", "bread"),
    ("dip", "snack"),
    ("hummus", "snack"),
    ("guacamole", "snack"),
    ("nachos", "snack"),
    ("wings", "snack"),
]

_METHOD_KEYWORDS: list[tuple[str, str]] = [
    ("slow cooker", "slow cooker"),
    ("crock pot", "slow cooker"),
    ("crockpot", "slow cooker"),
    ("instant pot", "instant pot"),
    ("pressure cooker", "instant pot"),
    ("air fryer", "air fryer"),
    ("grilled", "grilled"),
    ("bbq", "grilled"),
    ("barbecue", "grilled"),
    ("smoked", "grilled"),
    ("roasted", "roasted"),
    ("baked", "baked"),
    ("no.bake", "no-cook"),
    ("no-cook", "no-cook"),
    ("raw", "no-cook"),
    ("one pot", "one-pot"),
    ("one-pot", "one-pot"),
    ("sheet pan", "one-pot"),
    ("skillet", "one-pot"),
]


# Ordered from most specific (multi-word dish names) to least specific.
# Each entry is (keyword, cuisine). First cuisine to accumulate the most
# keyword hits wins; ties broken by order below.
_CUISINE_SIGNALS: list[tuple[str, str]] = [
    # Italian
    ("carbonara", "Italian"), ("bolognese", "Italian"), ("osso buco", "Italian"),
    ("bruschetta", "Italian"), ("tiramisu", "Italian"), ("pesto", "Italian"),
    ("focaccia", "Italian"), ("risotto", "Italian"), ("gnocchi", "Italian"),
    ("lasagna", "Italian"), ("spaghetti", "Italian"), ("fettuccine", "Italian"),
    ("penne", "Italian"), ("rigatoni", "Italian"), ("ravioli", "Italian"),
    ("parmesan", "Italian"), ("prosciutto", "Italian"), ("pancetta", "Italian"),
    ("mozzarella", "Italian"), ("ricotta", "Italian"), ("balsamic", "Italian"),
    ("marinara", "Italian"), ("arrabiata", "Italian"), ("pizza", "Italian"),
    # Mexican
    ("quesadilla", "Mexican"), ("enchilada", "Mexican"), ("tamale", "Mexican"),
    ("guacamole", "Mexican"), ("mole sauce", "Mexican"), ("pozole", "Mexican"),
    ("tostada", "Mexican"), ("chipotle", "Mexican"), ("cotija", "Mexican"),
    ("jalapeño", "Mexican"), ("taco", "Mexican"), ("burrito", "Mexican"),
    ("fajita", "Mexican"), ("tortilla", "Mexican"),
    # Indian
    ("tikka masala", "Indian"), ("biryani", "Indian"), ("tandoori", "Indian"),
    ("vindaloo", "Indian"), ("garam masala", "Indian"), ("korma", "Indian"),
    ("paneer", "Indian"), ("dal", "Indian"), ("naan", "Indian"),
    ("samosa", "Indian"), ("basmati", "Indian"), ("chutney", "Indian"),
    # Thai
    ("pad thai", "Thai"), ("tom yum", "Thai"), ("tom kha", "Thai"),
    ("massaman", "Thai"), ("thai basil", "Thai"), ("green curry", "Thai"),
    ("red curry", "Thai"), ("larb", "Thai"), ("lemongrass", "Thai"),
    ("galangal", "Thai"), ("kaffir lime", "Thai"), ("satay", "Thai"),
    # Chinese
    ("kung pao", "Chinese"), ("mapo tofu", "Chinese"), ("dim sum", "Chinese"),
    ("chow mein", "Chinese"), ("wonton", "Chinese"), ("szechuan", "Chinese"),
    ("peking duck", "Chinese"), ("hoisin", "Chinese"), ("bok choy", "Chinese"),
    ("five spice", "Chinese"), ("fried rice", "Chinese"),
    # Japanese
    ("tonkatsu", "Japanese"), ("yakitori", "Japanese"), ("gyoza", "Japanese"),
    ("teriyaki", "Japanese"), ("tempura", "Japanese"), ("ramen", "Japanese"),
    ("sushi", "Japanese"), ("udon", "Japanese"), ("soba", "Japanese"),
    ("miso", "Japanese"), ("edamame", "Japanese"), ("dashi", "Japanese"),
    ("matcha", "Japanese"), ("katsu", "Japanese"), ("nori", "Japanese"),
    # Korean
    ("bibimbap", "Korean"), ("bulgogi", "Korean"), ("kimchi", "Korean"),
    ("gochujang", "Korean"), ("japchae", "Korean"), ("galbi", "Korean"),
    ("doenjang", "Korean"), ("tteokbokki", "Korean"),
    # Vietnamese
    ("banh mi", "Vietnamese"), ("bun bo hue", "Vietnamese"),
    ("pho", "Vietnamese"), ("rice paper", "Vietnamese"),
    # French
    ("coq au vin", "French"), ("bouillabaisse", "French"), ("ratatouille", "French"),
    ("boeuf bourguignon", "French"), ("crème brûlée", "French"),
    ("beurre blanc", "French"), ("vichyssoise", "French"),
    ("herbes de provence", "French"), ("croissant", "French"),
    ("baguette", "French"), ("quiche", "French"), ("dijon", "French"),
    ("nicoise", "French"), ("french onion", "French"),
    # Greek
    ("moussaka", "Greek"), ("spanakopita", "Greek"), ("baklava", "Greek"),
    ("tzatziki", "Greek"), ("souvlaki", "Greek"), ("dolmades", "Greek"),
    ("saganaki", "Greek"), ("gyros", "Greek"),
    # Mediterranean
    ("tabbouleh", "Mediterranean"), ("baba ganoush", "Mediterranean"),
    ("hummus", "Mediterranean"), ("falafel", "Mediterranean"),
    ("tahini", "Mediterranean"), ("za'atar", "Mediterranean"), ("sumac", "Mediterranean"),
    # Middle Eastern
    ("shakshuka", "Middle Eastern"), ("kofta", "Middle Eastern"),
    ("tagine", "Middle Eastern"), ("couscous", "Middle Eastern"),
    ("ras el hanout", "Middle Eastern"), ("harissa", "Middle Eastern"),
    ("shawarma", "Middle Eastern"), ("kebab", "Middle Eastern"),
    ("halloumi", "Middle Eastern"),
    # Spanish
    ("paella", "Spanish"), ("gazpacho", "Spanish"), ("patatas bravas", "Spanish"),
    ("manchego", "Spanish"), ("sofrito", "Spanish"), ("albondigas", "Spanish"),
    ("churros", "Spanish"),
    # German
    ("schnitzel", "German"), ("bratwurst", "German"), ("sauerkraut", "German"),
    ("sauerbraten", "German"), ("strudel", "German"), ("pretzel", "German"),
    # British
    ("shepherd's pie", "British"), ("yorkshire pudding", "British"),
    ("fish and chips", "British"), ("cottage pie", "British"),
    ("bangers and mash", "British"), ("scones", "British"),
    # Brazilian
    ("churrasco", "Brazilian"), ("feijoada", "Brazilian"),
    ("brigadeiro", "Brazilian"), ("pao de queijo", "Brazilian"),
    # Caribbean
    ("jerk chicken", "Caribbean"), ("jerk pork", "Caribbean"),
    ("plantain", "Caribbean"), ("rice and peas", "Caribbean"),
    # American
    ("buffalo wings", "American"), ("mac and cheese", "American"),
    ("clam chowder", "American"), ("biscuits and gravy", "American"),
    ("southern fried", "American"), ("cheeseburger", "American"),
    # Generic fallbacks (checked last)
    ("curry", "Indian"),
    ("stir.fry", "Chinese"),
]


def detect_cuisine(title: str, ingredients: list[dict]) -> str | None:
    """Infer cuisine type from title and ingredient names. Returns None if uncertain."""
    text = (title + " " + " ".join(ing.get("name", "") for ing in ingredients)).lower()
    scores: dict[str, int] = {}
    for keyword, cuisine in _CUISINE_SIGNALS:
        pattern = keyword.replace(".", r"\W*")
        if re.search(r'\b' + pattern + r'\b', text):
            scores[cuisine] = scores.get(cuisine, 0) + 1
    if not scores:
        return None
    return max(scores, key=lambda c: scores[c])


def auto_tag(
    title: str,
    ingredients: list[dict],
    total_time_minutes: int | None = None,
    existing_tags: list[str] | None = None,
) -> list[str]:
    """Return a deduped tag list merging existing tags with auto-inferred ones."""
    tags: set[str] = set(t.lower() for t in (existing_tags or []))
    title_lower = title.lower()
    ingredient_names = " ".join(
        ing.get("name", "").lower() for ing in ingredients
    )
    full_text = f"{title_lower} {ingredient_names}"

    # Protein tags — search both title and ingredient names
    seen_proteins: set[str] = set()
    for keyword, tag in _PROTEIN_KEYWORDS:
        if tag not in seen_proteins and re.search(r'\b' + re.escape(keyword) + r'\b', full_text):
            tags.add(tag)
            seen_proteins.add(tag)

    # Vegetarian / vegan detection from ingredients
    has_meat = any(
        re.search(r'\b' + re.escape(kw) + r'\b', ingredient_names)
        for kw in _MEAT_KEYWORDS
    )
    if not has_meat:
        tags.add("vegetarian")
        has_dairy = any(
            re.search(r'\b' + re.escape(kw) + r'\b', ingredient_names)
            for kw in _DAIRY_KEYWORDS
        )
        has_eggs = any(
            re.search(r'\b' + re.escape(kw) + r'\b', ingredient_names)
            for kw in _EGG_KEYWORDS
        )
        if not has_dairy and not has_eggs:
            tags.add("vegan")

    # Dish type — search title first, fall back to ingredient names
    for keyword, tag in _DISH_KEYWORDS:
        if re.search(r'\b' + re.escape(keyword) + r'\b', full_text):
            tags.add(tag)

    # Cooking method — title only
    for keyword, tag in _METHOD_KEYWORDS:
        pattern = keyword.replace(".", r"\W*")
        if re.search(pattern, title_lower):
            tags.add(tag)

    # Time-based tags
    if total_time_minutes:
        if total_time_minutes <= 30:
            tags.add("quick")
        if total_time_minutes <= 60:
            tags.add("under 1 hour")

    # Meal type inference — based on what we already detected above
    _DINNER_PROTEINS = {"chicken", "beef", "pork", "fish", "seafood", "lamb", "turkey"}
    _DINNER_DISHES   = {"pasta", "pizza", "curry", "casserole", "stir-fry", "risotto", "tacos", "noodles", "bowl"}
    _LUNCH_DISHES    = {"soup", "salad", "sandwich"}

    is_breakfast = "breakfast" in tags
    is_dessert   = "dessert" in tags

    if not is_breakfast and not is_dessert:
        if tags & _DINNER_PROTEINS or tags & _DINNER_DISHES:
            tags.add("dinner")
        if tags & _LUNCH_DISHES:
            tags.add("lunch")

    return sorted(tags)


# Ingredients that make a dish not suitable for young children
_SPICY_INGREDIENTS = {
    "jalapeño", "jalapeno", "habanero", "serrano", "ghost pepper", "scotch bonnet",
    "bird eye chili", "thai chili", "sriracha", "gochujang", "harissa", "sambal",
    "wasabi", "cayenne", "hot sauce", "crushed red pepper", "red pepper flakes",
    "chili flakes", "chipotle pepper", "chili oil",
}

_KID_FRIENDLY_DISHES = {
    "pasta", "pizza", "breakfast", "soup", "sandwich", "tacos",
    "casserole", "noodles", "bowl", "bread", "snack", "smoothie",
}


def detect_kid_friendly(title: str, ingredients: list[dict], tags: list[str]) -> bool:
    """True if no spicy ingredients detected AND dish type is generally kid-approved."""
    full_text = (title + " " + " ".join(ing.get("name", "") for ing in ingredients)).lower()
    for kw in _SPICY_INGREDIENTS:
        if re.search(r'\b' + re.escape(kw) + r'\b', full_text):
            return False
    return bool(set(tags) & _KID_FRIENDLY_DISHES)


_LEFTOVER_GOOD = {"soup", "casserole", "curry", "pasta", "slow cooker", "one-pot", "roasted", "baked", "stir-fry"}
_LEFTOVER_BAD  = {"salad", "no-cook"}


def detect_leftover_friendly(tags: list[str]) -> bool:
    """True for dishes that reheat well; False for dishes that don't keep."""
    tag_set = set(tags)
    if tag_set & _LEFTOVER_BAD:
        return False
    return bool(tag_set & _LEFTOVER_GOOD)
