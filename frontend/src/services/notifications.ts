import { apiClient } from "@/lib/apiClient";
import type { AppNotification, Paginated } from "@/types/api";

export const notificationsService = {
  async list(read?: boolean) {
    const { data } = await apiClient.get<Paginated<AppNotification> & { unread_count: number }>("/api/notifications/", {
      params: read === undefined ? {} : { read: String(read) },
    });
    return data;
  },
  async matchingList(read?: boolean) {
    const data = await notificationsService.list(read);
    const results = data.results.filter((notification) => notification.notification_type === "new_match");
    return {
      ...data,
      results,
      unread_count: results.filter((notification) => !notification.is_read).length,
    };
  },
  async unreadCount() {
    const { data } = await apiClient.get<{ unread_count: number }>("/api/notifications/unread-count/");
    return data.unread_count;
  },
  async matchingUnreadCount() {
    const { unread_count } = await notificationsService.matchingList(false);
    return unread_count;
  },
  async markRead(id: string) {
    await apiClient.put(`/api/notifications/${id}/read/`);
  },
  async markAll() {
    await apiClient.put("/api/notifications/read-all/");
  },
};
