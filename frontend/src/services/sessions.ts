import { apiClient } from "@/lib/apiClient";
import type { Paginated, SessionStatus, SkillSession } from "@/types/api";

export const sessionsService = {
  async list(status?: SessionStatus) {
    const { data } = await apiClient.get<Paginated<SkillSession>>("/api/sessions/", {
      params: { status },
    });
    return data;
  },
  async book(payload: { match_id: string; scheduled_at: string; duration_minutes: number }) {
    const { data } = await apiClient.post<SkillSession>("/api/sessions/book/", payload);
    return data;
  },
  async confirm(id: string) {
    const { data } = await apiClient.post<SkillSession>(`/api/sessions/${id}/confirm/`);
    return data;
  },
  async cancel(id: string, reason?: string) {
    const { data } = await apiClient.post<SkillSession>(`/api/sessions/${id}/cancel/`, { reason });
    return data;
  },
  async complete(id: string) {
    const { data } = await apiClient.post<SkillSession>(`/api/sessions/${id}/complete/`);
    return data;
  },
  async feedback(id: string, payload: { rating: number; comment?: string }) {
    const { data } = await apiClient.post(`/api/sessions/${id}/feedback/`, payload);
    return data;
  },
};
