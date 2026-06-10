import { Recipe } from "./recipe";

export interface MealPlanEntry {
  id: string;
  meal_plan_id: string;
  recipe_id?: string;
  plan_date: string;
  meal_type: string;
  servings_override?: number;
  is_leftover_of?: string;
  sort_order: number;
  recipe?: Recipe;
}

export interface MealPlan {
  id: string;
  week_start_date: string;
  name?: string;
  is_ai_generated: boolean;
  generation_notes?: string;
  entries: MealPlanEntry[];
  created_at: string;
  updated_at: string;
}

export interface MealPlanListItem {
  id: string;
  week_start_date: string;
  name?: string;
  is_ai_generated: boolean;
  entry_count: number;
}
