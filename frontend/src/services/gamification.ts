import { apiClient } from "@/lib/apiClient";
import type { GamificationProfile, LeaderboardResponse, Paginated, UserBadge, XpEvent } from "@/types/api";

export const gamificationService = {
  async me() {
    const { data } = await apiClient.get<GamificationProfile>("/api/gamification/me/");
    return data;
  },
  async xpHistory() {
    const { data } = await apiClient.get<Paginated<XpEvent>>("/api/gamification/xp-history/");
    return data;
  },
  async badges() {
    const { data } = await apiClient.get<Paginated<UserBadge>>("/api/gamification/badges/");
    return data.results; // unwrap pagination
  },
  async leaderboard(scope: "global" | "campus" = "global", college?: string) {
    const { data } = await apiClient.get<LeaderboardResponse>("/api/gamification/leaderboard/", {
      params: { scope, college },
    });
    return data;
  },
};
