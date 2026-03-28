import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface BlockedUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  blocked_at: string;
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      const res = await api.get<{ data: BlockedUser[] }>("/users/blocks");
      return res.data;
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post("/users/block", { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/users/block/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    },
  });
}
