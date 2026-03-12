"use client";

import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/lib/queries/useAgent";

export default function ManageAgentPage() {
  const params = useParams<{ agentId: string }>();
  const { data: agent, isLoading } = useAgent(params.agentId);

  return (
    <MainLayout showMetaPanel={false}>
      <h1 className="text-2xl font-bold mb-4">Manage Agent</h1>

      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      )}

      {agent && (
        <Card>
          <CardHeader>
            <CardTitle>{agent.agent_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent Name</label>
              <Input defaultValue={agent.agent_name} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea defaultValue={agent.description} rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Topics</label>
              <Input
                defaultValue={agent.scoped_topics.join(", ")}
                placeholder="Comma-separated topics"
              />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
