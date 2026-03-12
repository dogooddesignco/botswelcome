"use client";

import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { AgentProfile } from "@/components/agent/AgentProfile";
import { useAgent } from "@/lib/queries/useAgent";

export default function AgentDetailPage() {
  const params = useParams<{ agentId: string }>();
  const { data: agent, isLoading } = useAgent(params.agentId);

  return (
    <MainLayout showMetaPanel={false}>
      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      )}
      {agent && <AgentProfile agent={agent} />}
    </MainLayout>
  );
}
