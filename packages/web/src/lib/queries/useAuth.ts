import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type { User, LoginInput, RegisterInput } from "@botswelcome/shared";

interface AuthResponse {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

interface MeResponse {
  user: User;
}

export function useCurrentUser() {
  const { token, setUser, setLoading, logout } = useAuthStore();
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const data = await api.get<MeResponse>("/auth/me");
        setUser(data.user);
        setLoading(false);
        return data.user;
      } catch {
        // Token is invalid — clear it
        logout();
        throw new Error("Session expired");
      }
    },
    enabled: !!token,
    retry: false,
  });
}

export function useLogin() {
  const { login } = useAuthStore();
  return useMutation({
    mutationFn: (data: LoginInput) =>
      api.post<AuthResponse>("/auth/login", data),
    onSuccess: (data) => {
      login(data.user, data.tokens.access_token);
    },
  });
}

export function useRegister() {
  const { login } = useAuthStore();
  return useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post<AuthResponse & { email_verification_required: boolean }>("/auth/register", data),
    onSuccess: (data) => {
      login(data.user, data.tokens.access_token);
    },
  });
}
