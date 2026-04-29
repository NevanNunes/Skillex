import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens, User } from "@/types/api";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  hydrated: boolean;
  setTokens: (tokens: AuthTokens | null) => void;
  setUser: (user: User | null) => void;
  setSession: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      hydrated: false,
      setTokens: (tokens) => set({ tokens }),
      setUser: (user) => set({ user }),
      setSession: (user, tokens) => set({ user, tokens }),
      logout: () => set({ user: null, tokens: null }),
    }),
    {
      name: "skillex.auth",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
