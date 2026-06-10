import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "./client";
import { Recipe, RecipeFilters, RecipeListResponse } from "../types/recipe";

export const RECIPES_KEY = ["recipes"];

export function useRecipes(filters: RecipeFilters & { page?: number; limit?: number } = {}) {
  return useQuery<RecipeListResponse>({
    queryKey: [...RECIPES_KEY, filters],
    queryFn: () => api.get("/recipes", { params: filters }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery<Recipe>({
    queryKey: [...RECIPES_KEY, id],
    queryFn: () => api.get(`/recipes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Recipe>) => api.post("/recipes", data).then((r) => r.data as Recipe),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECIPES_KEY }),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Recipe> }) =>
      api.put(`/recipes/${id}`, data).then((r) => r.data as Recipe),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.setQueryData([...RECIPES_KEY, recipe.id], recipe);
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recipes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECIPES_KEY }),
  });
}

export function useImportRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.post("/recipes/import", { url }).then((r) => r.data as Recipe),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECIPES_KEY }),
  });
}

export function useImportFromPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.post("/recipes/import/photo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data as Recipe);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RECIPES_KEY }),
  });
}

export function useImportFromYouTube() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.post("/recipes/import/youtube", { url }).then((r) => r.data as Recipe),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECIPES_KEY }),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/recipes/${id}/favorite`).then((r) => r.data as Recipe),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.setQueryData([...RECIPES_KEY, recipe.id], recipe);
    },
  });
}

export function useRecipeNutrition(id: string | undefined) {
  return useQuery({
    queryKey: [...RECIPES_KEY, id, "nutrition"],
    queryFn: () => api.get(`/recipes/${id}/nutrition`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSuggestKidMods() {
  return useMutation({
    mutationFn: (data: { title: string; ingredients: Array<{ name: string }> }) =>
      api.post("/ai/suggest-kid-mods", data).then((r) => r.data as { modifications: string[] }),
  });
}

export function useSuggestTags() {
  return useMutation({
    mutationFn: (data: { title: string; ingredients: Array<{ name: string }> }) =>
      api.post("/ai/suggest-tags", data).then((r) => r.data as { tags: string[] }),
  });
}
