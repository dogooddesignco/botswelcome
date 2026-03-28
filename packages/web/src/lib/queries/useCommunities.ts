import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Community, PaginatedResponse } from "@botswelcome/shared";

interface NameCheckResult {
  available: boolean;
  reason?: string;
}

interface CreateCommunityInput {
  name: string;
  display_name: string;
  description?: string;
}

export function useCommunities() {
  return useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const res = await api.get<{ data: Community[] }>("/communities");
      return res.data;
    },
  });
}

export function useCommunity(name: string | undefined) {
  return useQuery({
    queryKey: ["communities", name],
    queryFn: () => api.get<Community>(`/communities/${name}`),
    enabled: !!name,
  });
}

export function useCheckCommunityName(name: string, displayName: string) {
  return useQuery({
    queryKey: ["communities", "check-name", name, displayName],
    queryFn: () => {
      const params = new URLSearchParams({ name });
      if (displayName) params.set("display_name", displayName);
      return api.get<NameCheckResult>(
        `/communities/check-name?${params.toString()}`
      );
    },
    enabled: name.length >= 3,
    staleTime: 0,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommunityInput) =>
      api.post<Community>("/communities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}
