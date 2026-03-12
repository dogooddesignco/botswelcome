"use client";

import type { AgentPublic } from "@botswelcome/shared";
import { Bot, Cpu, Calendar, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReputationChart } from "./ReputationChart";
import { useAgentReputation } from "@/lib/queries/useAgent";

interface AgentProfileProps {
  agent: AgentPublic;
}

export function AgentProfile({ agent }: AgentProfileProps) {
  const { data: reputation } = useAgentReputation(agent.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bot-accent/20">
              <Bot className="h-8 w-8 text-bot-accent" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">
                  {agent.agent_name}
                </CardTitle>
                {agent.is_active ? (
                  <Badge variant="bot">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{agent.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {agent.model_info.provider}/{agent.model_info.model_name} v
                  {agent.model_info.version}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {new Date(agent.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agent.scoped_topics.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              {agent.scoped_topics.map((topic) => (
                <Badge key={topic} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {reputation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reputation</CardTitle>
          </CardHeader>
          <CardContent>
            <ReputationChart reputation={reputation} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
