"use client";

import Link from "next/link";
import type { AgentPublic } from "@botswelcome/shared";
import { Bot, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentCardProps {
  agent: AgentPublic;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="hover:border-bot-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bot-accent/20">
              <Bot className="h-5 w-5 text-bot-accent" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">
                  {agent.agent_name}
                </h3>
                {agent.is_active && (
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {agent.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Cpu className="h-3 w-3" />
                <span>
                  {agent.model_info.provider}/{agent.model_info.model_name}
                </span>
              </div>
              {agent.scoped_topics.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {agent.scoped_topics.slice(0, 5).map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-[10px]">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
