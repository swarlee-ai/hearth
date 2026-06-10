import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import { Collection, CollectionWithCount } from "../types/collection";

export const COLLECTIONS_KEY = ["collections"];

export function useCollections() {
  return useQuery<CollectionWithCount[]>({
    queryKey: COLLECTIONS_KEY,
    queryFn: () => api.get("/collections").then((r) => r.data),
  });
}

export function useCollectionRecipes(collectionId: string | undefined) {
  return useQuery({
    queryKey: [...COLLECTIONS_KEY, collectionId, "recipes"],
    queryFn: () => api.get(`/collections/${collectionId}/recipes`).then((r) => r.data),
    enabled: !!collectionId,
  });
}

export function useRecipeCollections(recipeId: string | undefined) {
  return useQuery<Collection[]>({
    queryKey: ["recipe-collections", recipeId],
    queryFn: () => api.get(`/recipes/${recipeId}/collections`).then((r) => r.data),
    enabled: !!recipeId,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      api.post("/collections", data).then((r) => r.data as Collection),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLLECTIONS_KEY }),
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; color?: string } }) =>
      api.patch(`/collections/${id}`, data).then((r) => r.data as Collection),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLLECTIONS_KEY }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/collections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: COLLECTIONS_KEY }),
  });
}

export function useAddToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, recipeId }: { collectionId: string; recipeId: string }) =>
      api.put(`/collections/${collectionId}/recipes/${recipeId}`),
    onSuccess: (_data, { recipeId }) => {
      qc.invalidateQueries({ queryKey: COLLECTIONS_KEY });
      qc.invalidateQueries({ queryKey: ["recipe-collections", recipeId] });
    },
  });
}

export function useRemoveFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, recipeId }: { collectionId: string; recipeId: string }) =>
      api.delete(`/collections/${collectionId}/recipes/${recipeId}`),
    onSuccess: (_data, { recipeId }) => {
      qc.invalidateQueries({ queryKey: COLLECTIONS_KEY });
      qc.invalidateQueries({ queryKey: ["recipe-collections", recipeId] });
    },
  });
}
