import { apiClient } from "@/lib/apiClient";
import type { AppNotification, Paginated } from "@/types/api";

export const notificationsService = {
  async list(read?: boolean) {
    const { data } = await apiClient.get<Paginated<AppNotification>>("/api/notifications/", {
      params: read === undefined ? {} : { read: String(read) },
    });
    return data;
  },
  async unreadCount() {
    const { data } = await apiClient.get<{ count: number }>("/api/notifications/unread-count/");
    return data.count;
  },
  async markRead(id: number) {
    const { data } = await apiClient.put(`/api/notifications/${id}/read/`);
    return data;
  },
  async markAll() {
    await apiClient.put("/api/notifications/read-all/");
  },
};
