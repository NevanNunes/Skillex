import { apiClient } from "@/lib/apiClient";
import type { Paginated, Review } from "@/types/api";

export const reviewsService = {
  async create(payload: { session_id: string; rating: number; comment?: string }) {
    const { data } = await apiClient.post<Review>("/api/reviews/", payload);
    return data;
  },
  async forUser(username: string) {
    const { data } = await apiClient.get<Paginated<Review>>(`/api/reviews/user/${username}/`);
    return data;
  },
};
