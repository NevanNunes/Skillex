import { apiClient } from "@/lib/apiClient";
import type { Badge, GamificationProfile, LeaderboardEntry, Paginated, XpEvent } from "@/types/api";

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
    const { data } = await apiClient.get<Badge[]>("/api/gamification/badges/");
    return data;
  },
  async leaderboard() {
    const { data } = await apiClient.get<LeaderboardEntry[]>("/api/gamification/leaderboard/");
    return data;
  },
};
