import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import { AppSettings } from "../types/settings";

export const SETTINGS_KEY = ["settings"];

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: SETTINGS_KEY,
    queryFn: () => api.get("/settings").then((r) => r.data),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => api.put("/settings", data).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(SETTINGS_KEY, data),
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => api.patch("/settings/family", data).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(SETTINGS_KEY, data),
  });
}

export function useUpdateLLM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { llm_base_url?: string; llm_api_key?: string; llm_model_name?: string }) =>
      api.patch("/settings/llm", data).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(SETTINGS_KEY, data),
  });
}

export function useTestLLM() {
  return useMutation({
    mutationFn: (data: { base_url: string; api_key?: string; model_name: string }) =>
      api.post("/settings/llm/test", data).then((r) => r.data as { ok: boolean; message: string }),
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) =>
      api.post("/settings/onboarding/complete", data).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(SETTINGS_KEY, data),
  });
}
