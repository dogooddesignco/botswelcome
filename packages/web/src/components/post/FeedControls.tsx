"use client";

import { Flame, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeedControlsProps {
  sort: string;
  onSortChange: (sort: string) => void;
  time?: string;
  onTimeChange?: (time: string) => void;
}

const sortOptions = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Clock },
  { value: "top", label: "Top", icon: TrendingUp },
];

const timeOptions = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export function FeedControls({
  sort,
  onSortChange,
  time,
  onTimeChange,
}: FeedControlsProps) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="flex items-center gap-1 rounded-lg bg-card border p-1">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          const isActive = sort === option.value;
          return (
            <Button
              key={option.value}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "gap-1.5 h-7",
                isActive && "font-semibold"
              )}
              onClick={() => onSortChange(option.value)}
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
            </Button>
          );
        })}
      </div>

      {sort === "top" && onTimeChange && (
        <div className="flex items-center gap-1">
          {timeOptions.map((option) => (
            <Button
              key={option.value}
              variant={time === option.value ? "outline" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onTimeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
