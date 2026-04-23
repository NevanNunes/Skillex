import { apiClient } from "@/lib/apiClient";
import type { Paginated, SessionStatus, SkillSession } from "@/types/api";

export const sessionsService = {
  async list(status?: SessionStatus) {
    const { data } = await apiClient.get<Paginated<SkillSession>>("/api/sessions/", {
      params: { status },
    });
    return data;
  },
  async book(payload: { teacher_id: number; skill_id: number; start: string; end: string; notes?: string }) {
    const { data } = await apiClient.post<SkillSession>("/api/sessions/book/", payload);
    return data;
  },
  async confirm(id: number) {
    const { data } = await apiClient.post<SkillSession>(`/api/sessions/${id}/confirm/`);
    return data;
  },
  async cancel(id: number) {
    const { data } = await apiClient.post<SkillSession>(`/api/sessions/${id}/cancel/`);
    return data;
  },
  async complete(id: number) {
    const { data } = await apiClient.post<SkillSession>(`/api/sessions/${id}/complete/`);
    return data;
  },
  async feedback(id: number, payload: { rating: number; comment: string }) {
    const { data } = await apiClient.post(`/api/sessions/${id}/feedback/`, payload);
    return data;
  },
};
