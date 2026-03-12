import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Community } from "@botswelcome/shared";

export function useCommunities() {
  return useQuery({
    queryKey: ["communities"],
    queryFn: () => api.get<Community[]>("/communities"),
  });
}

export function useCommunity(name: string | undefined) {
  return useQuery({
    queryKey: ["communities", name],
    queryFn: () => api.get<Community>(`/communities/${name}`),
    enabled: !!name,
  });
}
