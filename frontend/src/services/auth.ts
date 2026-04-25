import { apiClient } from "@/lib/apiClient";
import type { AuthTokens, User } from "@/types/api";

export const authService = {
  /**
   * Login: SimpleJWT returns { access, refresh } — no user.
   * We fetch the user profile separately via /api/users/me/.
   */
  async login(payload: { email: string; password: string }) {
    // SimpleJWT expects "email" in USERNAME_FIELD; default is "username".
    // Django custom User has USERNAME_FIELD = 'email' (or 'username').
    // TokenObtainPairView accepts the USERNAME_FIELD + password.
    const { data: tokens } = await apiClient.post<AuthTokens>(
      "/api/auth/login/", payload,
    );
    // Now fetch the user profile using the new access token
    const { data: user } = await apiClient.get<User>("/api/users/me/", {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    return { ...tokens, user };
  },

  /**
   * Register: backend returns { id, email, username } — no tokens.
   * After registration, we auto-login to get tokens.
   */
  async registerOnly(payload: { email: string; username: string; password: string; first_name?: string; last_name?: string }) {
    const { data } = await apiClient.post("/api/auth/register/", payload);
    return data;
  },

  async register(payload: { email: string; username: string; password: string; first_name?: string; last_name?: string }) {
    await authService.registerOnly(payload);
    // Auto-login after registration
    return authService.login({ email: payload.email, password: payload.password });
  },

  async refresh(refresh: string): Promise<AuthTokens> {
    const { data } = await apiClient.post("/api/auth/refresh/", { refresh });
    return { access: data.access, refresh: data.refresh ?? refresh };
  },

  /**
   * Logout: TokenBlacklistView requires { refresh } in body.
   */
  async logout(refreshToken: string) {
    await apiClient.post("/api/auth/logout/", { refresh: refreshToken });
  },
};
