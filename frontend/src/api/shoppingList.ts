import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import { ShoppingList } from "../types/shopping";

export function useShoppingList(planId: string | undefined) {
  return useQuery<ShoppingList>({
    queryKey: ["shopping", planId],
    queryFn: () => api.get(`/meal-plans/${planId}/shopping`).then((r) => r.data),
    enabled: !!planId,
  });
}

export function useRegenerateShoppingList(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/meal-plans/${planId}/shopping/regenerate`).then((r) => r.data as ShoppingList),
    onSuccess: (data) => qc.setQueryData(["shopping", planId], data),
  });
}

export function useToggleShoppingItem(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      api.patch(`/meal-plans/${planId}/shopping/items/${itemId}`, { checked }).then((r) => r.data as ShoppingList),
    onMutate: async ({ itemId, checked }) => {
      await qc.cancelQueries({ queryKey: ["shopping", planId] });
      const prev = qc.getQueryData<ShoppingList>(["shopping", planId]);
      if (prev) {
        const updated = {
          ...prev,
          items: prev.items.map((cat) => ({
            ...cat,
            items: cat.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item
            ),
          })),
        };
        qc.setQueryData(["shopping", planId], updated);
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["shopping", planId], context.prev);
    },
  });
}

export function useDeleteShoppingItem(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete(`/meal-plans/${planId}/shopping/items/${itemId}`).then((r) => r.data as ShoppingList),
    onSuccess: (data) => qc.setQueryData(["shopping", planId], data),
  });
}

export function useAddShoppingItem(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; quantity?: string }) =>
      api.post(`/meal-plans/${planId}/shopping/items`, data).then((r) => r.data as ShoppingList),
    onSuccess: (data) => qc.setQueryData(["shopping", planId], data),
  });
}

export function useWeeklyNutrition(planId: string | undefined) {
  return useQuery({
    queryKey: ["nutrition", planId],
    queryFn: () => api.get(`/meal-plans/${planId}/nutrition`).then((r) => r.data),
    enabled: !!planId,
  });
}
