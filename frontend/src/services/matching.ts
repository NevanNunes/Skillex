import { apiClient } from "@/lib/apiClient";
import type { Match, Paginated } from "@/types/api";

export const matchingService = {
  async list() {
    const { data } = await apiClient.get<Paginated<Match>>("/api/matches/");
    return data;
  },
  async semantic(threshold = 0.7, limit = 20) {
    const { data } = await apiClient.get<Paginated<Match>>("/api/matches/semantic/", {
      params: { threshold, limit },
    });
    return data;
  },
  async accept(id: number) {
    const { data } = await apiClient.post<Match>(`/api/matches/${id}/accept/`);
    return data;
  },
  async reject(id: number) {
    const { data } = await apiClient.post<Match>(`/api/matches/${id}/reject/`);
    return data;
  },
  async refresh() {
    await apiClient.post("/api/matches/refresh/");
  },
  async indexProfile() {
    await apiClient.post("/api/matches/index-profile/");
  },
};
