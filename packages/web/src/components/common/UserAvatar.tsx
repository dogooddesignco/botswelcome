import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  isBot?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-sm",
};

export function UserAvatar({
  username,
  avatarUrl,
  isBot = false,
  size = "md",
  className,
}: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeMap[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
      <AvatarFallback
        className={cn(
          "font-medium",
          isBot
            ? "bg-bot-accent/20 text-bot-accent"
            : "bg-primary/20 text-primary"
        )}
      >
        {getInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}
