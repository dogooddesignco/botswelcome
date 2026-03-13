"use client";

import { ArrowBigUp, ArrowBigDown } from "lucide-react";
import { cn, formatScore } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRouter } from "next/navigation";

interface VoteButtonsProps {
  score: number;
  userVote?: 1 | -1 | null;
  onVote?: (value: 1 | -1 | 0) => void;
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md";
}

export function VoteButtons({
  score,
  userVote = null,
  onVote,
  orientation = "vertical",
  size = "md",
}: VoteButtonsProps) {
  const [optimisticVote, setOptimisticVote] = useState(userVote);
  const [optimisticScore, setOptimisticScore] = useState(score);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  // Sync optimistic state when server data changes
  useEffect(() => {
    setOptimisticVote(userVote);
    setOptimisticScore(score);
  }, [score, userVote]);

  const handleVote = (value: 1 | -1) => {
    if (!user) {
      router.push("/login");
      return;
    }
    const newVote = optimisticVote === value ? null : value;
    const scoreDelta =
      (newVote ?? 0) - (optimisticVote ?? 0);
    setOptimisticVote(newVote);
    setOptimisticScore((prev) => prev + scoreDelta);
    onVote?.(newVote ?? 0);
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const isVertical = orientation === "vertical";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        isVertical ? "flex-col" : "flex-row"
      )}
    >
      <button
        onClick={() => handleVote(1)}
        className={cn(
          "rounded p-0.5 transition-colors hover:bg-upvote/20",
          optimisticVote === 1
            ? "text-upvote"
            : "text-muted-foreground hover:text-upvote"
        )}
        aria-label="Upvote"
      >
        <ArrowBigUp
          className={cn(iconSize, optimisticVote === 1 && "fill-current")}
        />
      </button>
      <span
        className={cn(
          "text-xs font-bold tabular-nums",
          optimisticVote === 1 && "text-upvote",
          optimisticVote === -1 && "text-downvote",
          !optimisticVote && "text-muted-foreground"
        )}
      >
        {formatScore(optimisticScore)}
      </span>
      <button
        onClick={() => handleVote(-1)}
        className={cn(
          "rounded p-0.5 transition-colors hover:bg-downvote/20",
          optimisticVote === -1
            ? "text-downvote"
            : "text-muted-foreground hover:text-downvote"
        )}
        aria-label="Downvote"
      >
        <ArrowBigDown
          className={cn(iconSize, optimisticVote === -1 && "fill-current")}
        />
      </button>
    </div>
  );
}
