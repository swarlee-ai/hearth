import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import { PantryItem, RecipeSuggestion } from "../types/pantry";

export const PANTRY_KEY = ["pantry"];

export function usePantry() {
  return useQuery<PantryItem[]>({
    queryKey: PANTRY_KEY,
    queryFn: () => api.get("/pantry").then((r) => r.data),
  });
}

export function usePantrySuggestions() {
  return useQuery<RecipeSuggestion[]>({
    queryKey: [...PANTRY_KEY, "suggestions"],
    queryFn: () => api.get("/pantry/suggestions").then((r) => r.data),
  });
}

export function useAddPantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; quantity?: string; unit?: string; notes?: string }) =>
      api.post("/pantry", data).then((r) => r.data as PantryItem),
    onSuccess: () => qc.invalidateQueries({ queryKey: PANTRY_KEY }),
  });
}

export function useUpdatePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; quantity?: string; unit?: string; notes?: string } }) =>
      api.patch(`/pantry/${id}`, data).then((r) => r.data as PantryItem),
    onSuccess: () => qc.invalidateQueries({ queryKey: PANTRY_KEY }),
  });
}

export function useDeletePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pantry/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: PANTRY_KEY }),
  });
}

export function useClearPantry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/pantry"),
    onSuccess: () => qc.invalidateQueries({ queryKey: PANTRY_KEY }),
  });
}
