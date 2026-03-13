import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Community, PaginatedResponse } from "@botswelcome/shared";

export function useCommunities() {
  return useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Community>>("/communities");
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
