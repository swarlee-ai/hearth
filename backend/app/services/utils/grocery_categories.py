"""Map ingredient names to grocery store sections."""

_RULES: list[tuple[list[str], str]] = [
    (["chicken", "beef", "pork", "lamb", "turkey", "salmon", "tuna", "shrimp",
      "bacon", "sausage", "ham", "steak", "ground meat", "ground beef",
      "ground turkey", "fish", "scallop", "crab", "lobster", "duck", "veal"], "Meat & Seafood"),
    (["milk", "cream", "butter", "cheese", "yogurt", "sour cream", "cheddar",
      "mozzarella", "parmesan", "ricotta", "cottage cheese", "cream cheese",
      "half and half", "heavy cream", "whipped cream", "egg", "eggs"], "Dairy & Eggs"),
    (["bread", "baguette", "roll", "bun", "tortilla", "pita", "naan",
      "bagel", "croissant", "muffin", "biscuit"], "Bakery & Bread"),
    (["apple", "banana", "orange", "lemon", "lime", "strawberr", "blueberr",
      "raspberr", "blackberr", "mango", "pineapple", "peach", "pear", "grape",
      "cherry", "watermelon", "cantaloupe", "avocado", "tomato", "potato",
      "onion", "garlic", "ginger", "carrot", "celery", "broccoli", "spinach",
      "lettuce", "kale", "pepper", "zucchini", "squash", "mushroom", "corn",
      "cucumber", "asparagus", "cabbage", "beet", "radish", "turnip", "leek",
      "shallot", "scallion", "green onion", "herb", "basil", "parsley",
      "cilantro", "mint", "thyme", "rosemary", "dill", "chive", "arugula",
      "fennel", "eggplant", "artichoke", "sweet potato", "yam"], "Produce"),
    (["flour", "sugar", "salt", "baking powder", "baking soda", "yeast",
      "cornstarch", "cocoa", "vanilla", "extract", "breadcrumb", "panko",
      "oat", "rice", "pasta", "noodle", "quinoa", "barley", "lentil",
      "chickpea", "black bean", "kidney bean", "white bean", "can", "canned",
      "broth", "stock", "tomato sauce", "tomato paste", "coconut milk",
      "soy sauce", "fish sauce", "oyster sauce", "hot sauce", "vinegar",
      "olive oil", "vegetable oil", "sesame oil", "canola oil",
      "honey", "maple syrup", "molasses", "jam", "peanut butter",
      "almond butter", "tahini", "mustard", "ketchup", "mayonnaise",
      "worcestershire", "hot pepper"], "Pantry & Dry Goods"),
    (["pepper", "cumin", "paprika", "chili powder", "turmeric", "coriander",
      "oregano", "cinnamon", "nutmeg", "cardamom", "clove", "allspice",
      "bay leaf", "cayenne", "garlic powder", "onion powder", "italian seasoning",
      "everything bagel", "red pepper flake", "black pepper", "white pepper"], "Spices & Seasonings"),
    (["frozen", "ice cream", "frozen peas", "frozen corn", "frozen spinach",
      "frozen fruit", "frozen vegetable", "pizza"], "Frozen"),
    (["juice", "soda", "water", "sparkling", "wine", "beer", "broth carton",
      "almond milk", "oat milk", "soy milk"], "Beverages"),
]

_DEFAULT_CATEGORY = "Other"


def categorize(ingredient_name: str) -> str:
    name_lower = ingredient_name.lower()
    for keywords, category in _RULES:
        if any(kw in name_lower for kw in keywords):
            return category
    return _DEFAULT_CATEGORY
