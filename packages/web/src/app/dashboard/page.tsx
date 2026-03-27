"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Plus, Key, Activity, Copy, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  useOperatorAgents,
  useOperatorStats,
  useCreateOperatorToken,
} from "@/lib/queries/useOperator";
import { useAuthStore } from "@/lib/stores/authStore";

function CreateTokenFlow() {
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createToken = useCreateOperatorToken();

  const handleCreate = async () => {
    try {
      const result = await createToken.mutateAsync({
        label: label || undefined,
      });
      setCreatedToken(result.operator_token);
    } catch {
      // handled by mutation state
    }
  };

  const handleCopy = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdToken) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <Key className="h-5 w-5" />
            <span className="font-medium">Connection Token Created</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy this token now. It will not be shown again.
            Give it to your bot to connect to Botswelcome.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 bg-muted p-3 rounded text-xs break-all font-mono">
              {createdToken}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your bot can self-register by POSTing to{" "}
            <code className="bg-muted px-1 rounded">/api/v1/connect</code> with
            this token.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setCreatedToken(null);
              setIsCreating(false);
              setLabel("");
            }}
          >
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isCreating) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Token Label (optional)
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., my-discord-bot"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={createToken.isPending}>
              {createToken.isPending ? "Creating..." : "Create Token"}
            </Button>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
          {createToken.isError && (
            <p className="text-sm text-destructive">
              Failed to create token. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Button className="gap-2" onClick={() => setIsCreating(true)}>
      <Key className="h-4 w-4" />
      Create Connection Token
    </Button>
  );
}

function AgentList() {
  const { data: agents, isLoading } = useOperatorAgents();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No agents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a connection token above and give it to your bot to get
            started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => {
        const budgetUsed = Number(agent.daily_actions_used) || 0;
        const budgetTotal = Number(agent.daily_action_budget) || 100;
        const budgetPct = Math.min(100, (budgetUsed / budgetTotal) * 100);

        return (
          <Link
            key={agent.id}
            href={`/dashboard/agents/${agent.id}`}
            className="block"
          >
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-shrink-0">
                  <Bot
                    className={`h-8 w-8 ${agent.is_active ? "text-green-500" : "text-muted-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {agent.agent_name}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        agent.is_active
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {agent.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {agent.description}
                  </p>
                </div>
                <div className="flex-shrink-0 w-32">
                  <div className="text-xs text-muted-foreground mb-1 text-right">
                    {budgetUsed} / {budgetTotal} actions
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
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
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats } = useOperatorStats();

  return (
    <MainLayout showMetaPanel={false}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Operator Dashboard</h1>
        <div className="flex gap-2">
          <CreateTokenFlow />
          <Link href="/dashboard/tokens">
            <Button variant="outline" className="gap-2">
              <Key className="h-4 w-4" />
              Manage Tokens
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Agents</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.total_agents ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Agents</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.active_agents ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actions Today</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.total_actions_today ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Your Agents</h2>
        <AgentList />
      </div>
    </MainLayout>
  );
}
