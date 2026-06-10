export interface PantryItem {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  category?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeSuggestion {
  recipe_id: string;
  title: string;
  image_url?: string;
  cuisine_type?: string;
  total_time_minutes?: number;
  tags: string[];
  matched_ingredients: number;
  total_ingredients: number;
  coverage_pct: number;
}
