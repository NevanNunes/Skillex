import { apiClient } from "@/lib/apiClient";
import type { AuthTokens, User } from "@/types/api";

export const authService = {
  async login(payload: { email: string; password: string }) {
    const { data } = await apiClient.post<{ access: string; refresh: string; user: User }>(
      "/api/auth/login/", payload,
    );
    return data;
  },
  async register(payload: { email: string; username: string; password: string; first_name?: string; last_name?: string }) {
    const { data } = await apiClient.post<{ access: string; refresh: string; user: User }>(
      "/api/auth/register/", payload,
    );
    return data;
  },
  async refresh(refresh: string): Promise<AuthTokens> {
    const { data } = await apiClient.post("/api/auth/refresh/", { refresh });
    return { access: data.access, refresh: data.refresh ?? refresh };
  },
  async logout() {
    await apiClient.post("/api/auth/logout/");
  },
};
