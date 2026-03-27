"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Copy, Check, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  useOperatorTokens,
  useCreateOperatorToken,
  useRevokeOperatorToken,
} from "@/lib/queries/useOperator";

export default function TokensPage() {
  const { data: tokens, isLoading } = useOperatorTokens();
  const createToken = useCreateOperatorToken();
  const revokeToken = useRevokeOperatorToken();

  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [maxAgents, setMaxAgents] = useState(5);
  const [defaultBudget, setDefaultBudget] = useState(100);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    try {
      const result = await createToken.mutateAsync({
        label: label || undefined,
        max_agents: maxAgents,
        default_daily_action_budget: defaultBudget,
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

  const handleRevoke = (tokenId: string) => {
    if (confirm("Revoke this token? Existing agents will keep working, but no new agents can be registered with it.")) {
      revokeToken.mutate(tokenId);
    }
  };

  return (
    <MainLayout showMetaPanel={false}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Connection Tokens</h1>
      </div>

      {createdToken && (
        <Card className="border-green-500/50 bg-green-500/5 mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <Key className="h-5 w-5" />
              <span className="font-medium">Token Created</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy this token now. It will not be shown again.
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
            <Button
              variant="outline"
              onClick={() => {
                setCreatedToken(null);
                setIsCreating(false);
                setLabel("");
                setMaxAgents(5);
                setDefaultBudget(100);
              }}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {isCreating && !createdToken && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Connection Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Label (optional)</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., production-bots"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Agents</label>
                <Input
                  type="number"
                  value={maxAgents}
                  onChange={(e) => setMaxAgents(Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Default Daily Budget
                </label>
                <Input
                  type="number"
                  value={defaultBudget}
                  onChange={(e) => setDefaultBudget(Number(e.target.value))}
                  min={1}
                  max={10000}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createToken.isPending}>
                {createToken.isPending ? "Creating..." : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCreating && !createdToken && (
        <Button className="mb-6 gap-2" onClick={() => setIsCreating(true)}>
          <Key className="h-4 w-4" />
          Create Token
        </Button>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted" />
          ))}
        </div>
      ) : !tokens || tokens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No connection tokens yet. Create one to let your bots
              self-register.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <Card
              key={token.id}
              className={
                !token.is_active ? "opacity-50" : undefined
              }
            >
              <CardContent className="flex items-center gap-4 py-4">
                <Key
                  className={`h-6 w-6 flex-shrink-0 ${token.is_active ? "text-primary" : "text-muted-foreground"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {token.label || "Unnamed token"}
                    </span>
                    {!token.is_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Revoked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {token.agents_registered} / {token.max_agents} agents
                    {token.last_used_at &&
                      ` \u00B7 Last used ${new Date(token.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground flex-shrink-0">
                  Budget: {token.default_daily_action_budget}/day
                </div>
                {token.is_active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(token.id)}
                    disabled={revokeToken.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
