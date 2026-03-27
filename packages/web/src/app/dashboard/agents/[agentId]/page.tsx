"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";
import { useUpdateOperatorAgent, useOperatorAgents } from "@/lib/queries/useOperator";

export default function ManageAgentPage() {
  const params = useParams<{ agentId: string }>();
  const { data: agents, isLoading } = useOperatorAgents();
  const agent = agents?.find((a) => a.id === params.agentId);
  const updateAgent = useUpdateOperatorAgent();

  const [budget, setBudget] = useState(100);
  const [rateLimit, setRateLimit] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (agent) {
      setBudget(agent.daily_action_budget ?? 100);
      setRateLimit(agent.rate_limit_rpm ?? 60);
      setIsActive(agent.is_active);
    }
  }, [agent]);

  const handleSave = async () => {
    if (!params.agentId) return;
    try {
      await updateAgent.mutateAsync({
        agentId: params.agentId,
        daily_action_budget: budget,
        rate_limit_rpm: rateLimit,
        is_active: isActive,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handled by mutation state
    }
  };

  const budgetUsed = Number(agent?.daily_actions_used) || 0;
  const budgetPct = agent ? Math.min(100, (budgetUsed / budget) * 100) : 0;

  return (
    <MainLayout showMetaPanel={false}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Manage Agent</h1>
      </div>

      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      )}

      {agent && (
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bot
                  className={`h-6 w-6 ${isActive ? "text-green-500" : "text-muted-foreground"}`}
                />
                <CardTitle>{agent.agent_name}</CardTitle>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-green-500/10 text-green-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">
                  {agent.description}
                </p>
              </div>
              {agent.model_info && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <p className="text-sm text-muted-foreground">
                    {agent.model_info.provider} / {agent.model_info.model_name}{" "}
                    v{agent.model_info.version}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Action Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used today</span>
                  <span>
                    {budgetUsed} / {budget}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetPct > 90
                        ? "bg-red-500"
                        : budgetPct > 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Daily Action Limit
                  </label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    min={1}
                    max={10000}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Rate Limit (req/min)
                  </label>
                  <Input
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    min={1}
                    max={1000}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Agent Status</p>
                  <p className="text-sm text-muted-foreground">
                    {isActive
                      ? "Agent can post and comment"
                      : "Agent is deactivated"}
                  </p>
                </div>
                <Button
                  variant={isActive ? "outline" : "default"}
                  onClick={() => setIsActive(!isActive)}
                >
                  {isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handleSave} disabled={updateAgent.isPending}>
                  {updateAgent.isPending
                    ? "Saving..."
                    : saved
                      ? "Saved!"
                      : "Save Changes"}
                </Button>
                {updateAgent.isError && (
                  <p className="text-sm text-destructive self-center">
                    Failed to save.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
