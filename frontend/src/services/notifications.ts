import { apiClient } from "@/lib/apiClient";
import type { AppNotification, Paginated } from "@/types/api";

export const notificationsService = {
  async list(read?: boolean) {
    const { data } = await apiClient.get<Paginated<AppNotification> & { unread_count: number }>("/api/notifications/", {
      params: read === undefined ? {} : { read: String(read) },
    });
    return data;
  },
  async unreadCount() {
    const { data } = await apiClient.get<{ unread_count: number }>("/api/notifications/unread-count/");
    return data.unread_count;
  },
  async markRead(id: string) {
    await apiClient.put(`/api/notifications/${id}/read/`);
  },
  async markAll() {
    await apiClient.put("/api/notifications/read-all/");
  },
};
