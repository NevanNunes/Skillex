import { apiClient } from "@/lib/apiClient";
import type { AvailabilitySlot, OverlapResponse, User } from "@/types/api";

export const usersService = {
  async me() {
    const { data } = await apiClient.get<User>("/api/users/me/");
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
};
