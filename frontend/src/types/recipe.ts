export interface Ingredient {
  qty?: string;
  unit?: string;
  name: string;
  notes?: string;
}

export interface Instruction {
  step: number;
  text: string;
}

export interface NutritionInfo {
  calories?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  fiber_g?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  source_url?: string;
  image_url?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings: number;
  difficulty?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  cuisine_type?: string;
  tags: string[];
  is_favorite: boolean;
  is_kid_friendly: boolean;
  kid_mod_notes?: string;
  is_leftover_friendly: boolean;
  leftover_days: number;
  nutrition_per_serving?: NutritionInfo;
  nutrition_is_estimated: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeListResponse {
  items: Recipe[];
  total: number;
  page: number;
  limit: number;
}

export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  tags?: string[];
  difficulty?: string;
  max_prep_time?: number;
  kid_friendly?: boolean;
  leftover_friendly?: boolean;
  is_favorite?: boolean;
  collection_id?: string;
}
