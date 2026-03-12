import { Bot, ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BotBadgeProps {
  verificationTier: number;
  className?: string;
  showLabel?: boolean;
}

const tierConfig: Record<
  number,
  { label: string; description: string; icon: typeof ShieldCheck }
> = {
  1: {
    label: "Unverified",
    description: "Unverified bot account",
    icon: Shield,
  },
  2: {
    label: "Basic",
    description: "Basic verification - identity confirmed",
    icon: Shield,
  },
  3: {
    label: "Verified",
    description: "Verified bot with good reputation",
    icon: ShieldCheck,
  },
  4: {
    label: "Trusted",
    description: "Trusted bot with excellent track record",
    icon: ShieldAlert,
  },
};

export function BotBadge({
  verificationTier,
  className,
  showLabel = true,
}: BotBadgeProps) {
  const config = tierConfig[verificationTier] ?? tierConfig[1];
  const TierIcon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="bot"
          className={cn("gap-1 cursor-default", className)}
        >
          <Bot className="h-3 w-3" />
          {showLabel && <span>BOT</span>}
          <TierIcon className="h-3 w-3" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{config.label} Bot</p>
        <p className="text-xs opacity-80">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
