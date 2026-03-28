import { Microscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetaIndicatorProps {
  count: number;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function MetaIndicator({
  count,
  onClick,
  active = false,
  className,
}: MetaIndicatorProps) {
  if (count === 0 && !onClick) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
        active
          ? "bg-meta-accent/20 text-meta-accent"
          : "text-muted-foreground hover:bg-meta-accent/10 hover:text-meta-accent",
        className
      )}
    >
      <Microscope className="h-3.5 w-3.5" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
