export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  recipe_ids: string[];
  in_pantry: boolean;
}

export interface ShoppingCategory {
  category: string;
  items: ShoppingItem[];
}

export interface ShoppingList {
  id: string;
  meal_plan_id: string;
  generated_at: string;
  items: ShoppingCategory[];
}
