import { apiClient } from "@/lib/apiClient";
import type { AvailabilitySlot, OverlapResponse, Paginated, User } from "@/types/api";

export const usersService = {
  async me() {
    const { data } = await apiClient.get<User>("/api/users/me/");
    return data;
  },
  async search(query: string, pageSize = 8) {
    const { data } = await apiClient.get<Paginated<User>>("/api/users/", {
      params: { search: query, page_size: pageSize },
    });
    return data;
  },
  async updateMe(payload: Partial<User>) {
    const { data } = await apiClient.patch<User>("/api/users/me/", payload);
    return data;
  },
  async byUsername(username: string) {
    const { data } = await apiClient.get<User>(`/api/users/${username}/`);
    return data;
  },
  async availability() {
    const { data } = await apiClient.get<AvailabilitySlot[]>("/api/users/me/availability/");
    return data;
  },
  async updateAvailability(slots: AvailabilitySlot[]) {
    const { data } = await apiClient.put<AvailabilitySlot[]>("/api/users/me/availability/", { slots });
    return data;
  },
  async overlap(userId: string, days = 7) {
    const { data } = await apiClient.get<OverlapResponse>(`/api/calendar/overlap/${userId}/`, {
      params: { days },
    });
    return data;
  },
  async adminList(page = 1, search = "") {
    const { data } = await apiClient.get<Paginated<User>>("/api/admin/users/", {
      params: { page, search },
    });
    return data;
  },
};
