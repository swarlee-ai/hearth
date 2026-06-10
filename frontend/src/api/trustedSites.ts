import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";

export interface TrustedSite {
  id: string;
  name: string;
  base_url: string;
  scrape_pattern?: string;
  last_browsed_at?: string;
  created_at: string;
}

const KEY = ["trusted-sites"];

export function useTrustedSites() {
  return useQuery<TrustedSite[]>({
    queryKey: KEY,
    queryFn: () => api.get("/trusted-sites").then((r) => r.data),
  });
}

export function useAddTrustedSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; base_url: string; scrape_pattern?: string }) =>
      api.post("/trusted-sites", data).then((r) => r.data as TrustedSite),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTrustedSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/trusted-sites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useBrowseSite() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/trusted-sites/${id}/browse`).then((r) => r.data as { urls: string[]; count: number; already_imported: number }),
  });
}

export function useImportFromUrls() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, urls }: { siteId: string; urls: string[] }) =>
      api.post(`/trusted-sites/${siteId}/import-all`, { urls }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}
