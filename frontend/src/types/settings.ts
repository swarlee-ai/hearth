export interface KidProfile {
  name: string;
  age: number;
}

export interface AppSettings {
  onboarding_complete: boolean;
  adults_count: number;
  kids: KidProfile[];
  dietary_restrictions: string[];
  cuisine_preferences: string[];
  disliked_cuisines: string[];
  spice_tolerance: string;
  planned_meals: string[];
  meal_schedule: Record<string, string[]>;
  llm_base_url?: string;
  llm_api_key?: string;
  llm_model_name?: string;
  store_layout: string;
}
