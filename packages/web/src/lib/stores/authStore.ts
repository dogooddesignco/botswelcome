import { create } from "zustand";
import type { User } from "@botswelcome/shared";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("bw_token") : null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("bw_token", token);
    } else {
      localStorage.removeItem("bw_token");
    }
    set({ token });
  },

  login: (user, token) => {
    if (!token) {
      console.error("[auth] login called with falsy token");
      return;
    }
    localStorage.setItem("bw_token", token);
    set({ user, token, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("bw_token");
    set({ user: null, token: null });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
