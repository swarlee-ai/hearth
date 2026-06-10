export const CUISINES = [
  "American", "Italian", "Mexican", "Chinese", "Japanese", "Indian",
  "Thai", "Mediterranean", "French", "Greek", "Korean", "Vietnamese",
  "Middle Eastern", "Spanish", "German", "British", "Brazilian", "Caribbean",
];

export const CUISINE_COLORS: Record<string, string> = {
  American: "bg-blue-100 text-blue-800",
  Italian: "bg-green-100 text-green-800",
  Mexican: "bg-red-100 text-red-800",
  Chinese: "bg-yellow-100 text-yellow-800",
  Japanese: "bg-pink-100 text-pink-800",
  Indian: "bg-orange-100 text-orange-800",
  Thai: "bg-lime-100 text-lime-800",
  Mediterranean: "bg-cyan-100 text-cyan-800",
  French: "bg-purple-100 text-purple-800",
  Greek: "bg-sky-100 text-sky-800",
  Korean: "bg-rose-100 text-rose-800",
  Vietnamese: "bg-emerald-100 text-emerald-800",
  "Middle Eastern": "bg-amber-100 text-amber-800",
  Spanish: "bg-red-100 text-red-800",
  German: "bg-gray-100 text-gray-800",
  British: "bg-indigo-100 text-indigo-800",
  Brazilian: "bg-green-100 text-green-800",
  Caribbean: "bg-teal-100 text-teal-800",
};

export const DIETARY_TAGS = [
  "vegetarian", "vegan", "gluten-free", "dairy-free",
  "low-carb", "keto", "paleo", "nut-free",
];

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
export type MealType = typeof MEAL_TYPES[number];

export const SPICE_LEVELS = [
  { value: "mild", label: "Mild" },
  { value: "medium", label: "Medium" },
  { value: "hot", label: "Hot" },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
