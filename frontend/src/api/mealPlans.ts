import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import { MealPlan, MealPlanEntry, MealPlanListItem } from "../types/mealPlan";

export const PLANS_KEY = ["meal-plans"];

export function useMealPlans() {
  return useQuery<MealPlanListItem[]>({
    queryKey: PLANS_KEY,
    queryFn: () => api.get("/meal-plans").then((r) => r.data),
  });
}

export function useWeekPlan(weekDate: string) {
  return useQuery<MealPlan>({
    queryKey: [...PLANS_KEY, "week", weekDate],
    queryFn: () => api.get(`/meal-plans/week/${weekDate}`).then((r) => r.data),
  });
}

export function useAddEntry(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      recipe_id?: string;
      plan_date: string;
      meal_type: string;
      servings_override?: number;
      sort_order?: number;
    }) => api.post(`/meal-plans/${planId}/entries`, data).then((r) => r.data as MealPlanEntry),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useUpdateEntry(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: Partial<MealPlanEntry> }) =>
      api.put(`/meal-plans/${planId}/entries/${entryId}`, data).then((r) => r.data as MealPlanEntry),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useDeleteEntry(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => api.delete(`/meal-plans/${planId}/entries/${entryId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.delete(`/meal-plans/${planId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export interface WeeklyNutritionData {
  weekly_totals: { calories: number; protein_g: number; fat_g: number; carbs_g: number; fiber_g: number };
  recipes_with_nutrition: number;
  total_entries: number;
}

export function useWeeklyNutrition(planId: string | undefined) {
  return useQuery<WeeklyNutritionData>({
    queryKey: [...PLANS_KEY, planId, "nutrition"],
    queryFn: () => api.get(`/meal-plans/${planId}/nutrition`).then((r) => r.data),
    enabled: !!planId,
  });
}
