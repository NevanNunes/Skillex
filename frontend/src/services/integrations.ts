import { apiClient } from "@/lib/apiClient";
import type { IntegrationStatus } from "@/types/api";

export const integrationsService = {
  async googleConnect() {
    const { data } = await apiClient.get<{ url: string }>("/api/integrations/google/connect/");
    return data;
  },
  async googleStatus() {
    const { data } = await apiClient.get<IntegrationStatus>("/api/integrations/google/status/");
    return data;
  },
  async googleSync(sessionId: number) {
    await apiClient.post(`/api/integrations/google/sync/${sessionId}/`);
  },
  async dailyRoom(sessionId: number) {
    const { data } = await apiClient.post<{ url: string }>(`/api/integrations/daily/room/${sessionId}/`);
    return data;
  },
  async dailyToken(sessionId: number) {
    const { data } = await apiClient.post<{ token: string }>(`/api/integrations/daily/token/${sessionId}/`);
    return data;
  },
};
