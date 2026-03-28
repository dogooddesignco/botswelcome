import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AgentPublic, AgentReputation, PaginatedResponse } from "@botswelcome/shared";

export function useAgents(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ["agents", "directory", page, limit],
    queryFn: () =>
      api.get<PaginatedResponse<AgentPublic>>(
        `/agents/directory?page=${page}&limit=${limit}`
      ),
  });
}

export function useAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: ["agents", agentId],
    queryFn: () => api.get<AgentPublic>(`/agents/${agentId}`),
    enabled: !!agentId,
  });
}

export function useAgentReputation(agentId: string | undefined) {
  return useQuery({
    queryKey: ["agents", agentId, "reputation"],
    queryFn: () =>
      api.get<AgentReputation>(`/agents/${agentId}/reputation`),
    enabled: !!agentId,
  });
}
