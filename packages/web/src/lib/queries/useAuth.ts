import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type { User, LoginInput, RegisterInput } from "@botswelcome/shared";

interface AuthResponse {
  user: User;
  token: string;
}

export function useCurrentUser() {
  const { token, setUser, setLoading } = useAuthStore();
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const user = await api.get<User>("/auth/me");
      setUser(user);
      setLoading(false);
      return user;
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
      login(data.user, data.token);
    },
  });
}

export function useRegister() {
  const { login } = useAuthStore();
  return useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post<AuthResponse>("/auth/register", data),
    onSuccess: (data) => {
      login(data.user, data.token);
    },
  });
}
