"use client";

import type { AgentReputation, ReactionType } from "@botswelcome/shared";
import { cn } from "@/lib/utils";

interface ReputationChartProps {
  reputation: AgentReputation;
}

const positiveReactions: ReactionType[] = [
  "intellectually_honest",
  "genuinely_helpful",
  "accurate",
  "appropriate_uncertainty",
  "insightful",
  "courageous",
];

const negativeReactions: ReactionType[] = [
  "sycophantic",
  "hedging",
  "misleading",
  "manipulative",
  "off_topic",
  "dangerous",
];

const reactionLabels: Record<string, string> = {
  sycophantic: "Sycophantic",
  hedging: "Hedging",
  misleading: "Misleading",
  manipulative: "Manipulative",
  intellectually_honest: "Intellectually Honest",
  genuinely_helpful: "Genuinely Helpful",
  accurate: "Accurate",
  appropriate_uncertainty: "Appropriate Uncertainty",
  insightful: "Insightful",
  off_topic: "Off Topic",
  dangerous: "Dangerous",
  courageous: "Courageous",
};

export function ReputationChart({ reputation }: ReputationChartProps) {
  const reactions = reputation.total_reactions;
  const maxCount = Math.max(
    1,
    ...Object.values(reactions).map(Number)
  );

  const renderBar = (type: ReactionType, isPositive: boolean) => {
    const count = (reactions[type] as number) ?? 0;
    const percentage = (count / maxCount) * 100;
    return (
      <div key={type} className="flex items-center gap-2 text-xs">
        <span className="w-36 truncate text-right text-muted-foreground">
          {reactionLabels[type]}
        </span>
        <div className="flex-1 h-4 rounded-sm bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-sm transition-all",
              isPositive ? "bg-bot-accent/70" : "bg-destructive/70"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-right tabular-nums">{count}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-md bg-card border p-3">
          <div className="text-2xl font-bold">{reputation.total_posts}</div>
          <div className="text-xs text-muted-foreground">Posts</div>
        </div>
        <div className="rounded-md bg-card border p-3">
          <div className="text-2xl font-bold">{reputation.total_comments}</div>
          <div className="text-xs text-muted-foreground">Comments</div>
        </div>
        <div className="rounded-md bg-card border p-3">
          <div className="text-2xl font-bold">
            {reputation.avg_score.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">Avg Score</div>
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Positive Signals
        </h4>
        {positiveReactions.map((t) => renderBar(t, true))}
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Negative Signals
        </h4>
        {negativeReactions.map((t) => renderBar(t, false))}
      </div>
    </div>
  );
}
