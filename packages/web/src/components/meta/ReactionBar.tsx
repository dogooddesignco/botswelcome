"use client";

import type { ReactionType, ReactionCounts } from "@botswelcome/shared";
import { cn } from "@/lib/utils";

interface ReactionBarProps {
  reactions?: ReactionCounts;
  onReact?: (type: ReactionType) => void;
  userReactions?: ReactionType[];
}

const reactionConfig: Record<
  ReactionType,
  { emoji: string; label: string; color: string }
> = {
  sycophantic: { emoji: "🎭", label: "Sycophantic", color: "text-yellow-500" },
  hedging: { emoji: "🌫️", label: "Hedging", color: "text-gray-400" },
  misleading: { emoji: "⚠️", label: "Misleading", color: "text-orange-500" },
  manipulative: { emoji: "🕸️", label: "Manipulative", color: "text-red-500" },
  intellectually_honest: {
    emoji: "💡",
    label: "Intellectually Honest",
    color: "text-blue-400",
  },
  genuinely_helpful: {
    emoji: "🤝",
    label: "Genuinely Helpful",
    color: "text-green-400",
  },
  accurate: { emoji: "✅", label: "Accurate", color: "text-emerald-400" },
  appropriate_uncertainty: {
    emoji: "🤔",
    label: "Appropriate Uncertainty",
    color: "text-purple-400",
  },
  insightful: { emoji: "🔍", label: "Insightful", color: "text-cyan-400" },
  off_topic: { emoji: "🗺️", label: "Off Topic", color: "text-gray-500" },
  dangerous: { emoji: "☢️", label: "Dangerous", color: "text-red-600" },
  courageous: { emoji: "🦁", label: "Courageous", color: "text-amber-400" },
};

export function ReactionBar({
  reactions,
  onReact,
  userReactions = [],
}: ReactionBarProps) {
  const counts = reactions?.counts ?? ({} as Partial<Record<ReactionType, number>>);
  const allTypes = Object.keys(reactionConfig) as ReactionType[];

  // Show reactions with counts first, then the rest
  const withCounts = allTypes.filter(
    (t) => (counts[t] ?? 0) > 0
  );
  const withoutCounts = allTypes.filter(
    (t) => (counts[t] ?? 0) === 0
  );

  return (
    <div className="space-y-2">
      {/* Active reactions */}
      {withCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {withCounts.map((type) => {
            const config = reactionConfig[type];
            const count = counts[type] ?? 0;
            const isUserReaction = userReactions.includes(type);
            return (
              <button
                key={type}
                onClick={() => onReact?.(type)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  isUserReaction
                    ? "border-meta-accent bg-meta-accent/10"
                    : "border-border hover:border-meta-accent/50"
                )}
                title={config.label}
              >
                <span>{config.emoji}</span>
                <span className={config.color}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Add reaction */}
      <div className="flex flex-wrap gap-1">
        {withoutCounts.map((type) => {
          const config = reactionConfig[type];
          return (
            <button
              key={type}
              onClick={() => onReact?.(type)}
              className="rounded-full px-1.5 py-0.5 text-xs opacity-40 hover:opacity-100 transition-opacity"
              title={config.label}
            >
              {config.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
