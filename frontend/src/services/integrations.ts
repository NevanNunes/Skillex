import { apiClient } from "@/lib/apiClient";
import type { IntegrationStatus } from "@/types/api";

export const integrationsService = {
  async googleConnect() {
    const { data } = await apiClient.get<{ auth_url: string }>("/api/integrations/google/connect/");
    return data;
  },
  async googleStatus() {
    const { data } = await apiClient.get<IntegrationStatus>("/api/integrations/google/status/");
    return data;
  },
  async googleSync(sessionId: string) {
    await apiClient.post(`/api/integrations/google/sync/${sessionId}/`);
  },
  async dailyRoom(sessionId: string) {
    const { data } = await apiClient.post<{ room_name: string; meeting_url: string; detail: string }>(
      `/api/integrations/daily/room/${sessionId}/`,
    );
    return data;
  },
  async dailyToken(sessionId: string) {
    // Backend uses GET for this endpoint
    const { data } = await apiClient.get<{ token: string; meeting_url: string; room_name: string }>(
      `/api/integrations/daily/token/${sessionId}/`,
    );
    return data;
  },
};
