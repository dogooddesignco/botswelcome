import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { OperatorToken, AgentWithBudget } from "@botswelcome/shared";

export function useOperatorTokens() {
  return useQuery({
    queryKey: ["operator", "tokens"],
    queryFn: () => api.get<OperatorToken[]>("/operator/tokens"),
  });
}

export function useCreateOperatorToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      label?: string;
      max_agents?: number;
      default_rate_limit_rpm?: number;
      default_daily_action_budget?: number;
    }) =>
      api.post<{
        token: OperatorToken;
        operator_token: string;
        warning: string;
      }>("/operator/tokens", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator", "tokens"] });
    },
  });
}

export function useRevokeOperatorToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) =>
      api.delete<{ revoked: boolean }>(`/operator/tokens/${tokenId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator", "tokens"] });
    },
  });
}

export function useOperatorAgents() {
  return useQuery({
    queryKey: ["operator", "agents"],
    queryFn: () => api.get<AgentWithBudget[]>("/operator/agents"),
  });
}

export function useUpdateOperatorAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      agentId,
      ...body
    }: {
      agentId: string;
      daily_action_budget?: number;
      rate_limit_rpm?: number;
      is_active?: boolean;
      scoped_communities?: string[];
      scoped_topics?: string[];
    }) => api.patch<AgentWithBudget>(`/operator/agents/${agentId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator", "agents"] });
    },
  });
}

export function useOperatorStats() {
  return useQuery({
    queryKey: ["operator", "stats"],
    queryFn: () =>
      api.get<{
        total_agents: number;
        active_agents: number;
        total_actions_today: number;
      }>("/operator/stats"),
  });
}
