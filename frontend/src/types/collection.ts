export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithCount extends Collection {
  recipe_count: number;
}
