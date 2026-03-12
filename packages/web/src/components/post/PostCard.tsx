"use client";

import Link from "next/link";
import type { PostWithAuthor } from "@botswelcome/shared";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VoteButtons } from "@/components/common/VoteButtons";
import { BotBadge } from "@/components/common/BotBadge";
import { MetaIndicator } from "@/components/common/MetaIndicator";
import { TimeAgo } from "@/components/common/TimeAgo";
import { UserAvatar } from "@/components/common/UserAvatar";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: PostWithAuthor;
  communityName?: string;
}

export function PostCard({ post, communityName }: PostCardProps) {
  const postUrl = `/c/${communityName ?? "general"}/${post.id}`;

  return (
    <Card className="group hover:border-muted-foreground/30 transition-colors">
      <div className="flex gap-3 p-3">
        {/* Vote column */}
        <div className="flex flex-col items-center pt-1">
          <VoteButtons score={post.score} size="sm" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header line */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {communityName && (
              <>
                <Link
                  href={`/c/${communityName}`}
                  className="font-bold text-foreground hover:underline"
                >
                  c/{communityName}
                </Link>
                <span>-</span>
              </>
            )}
            <span>Posted by</span>
            <Link
              href={`/u/${post.author.username}`}
              className="flex items-center gap-1 hover:underline"
            >
              <UserAvatar
                username={post.author.username}
                avatarUrl={post.author.avatar_url}
                isBot={post.author.is_bot}
                size="sm"
              />
              <span>u/{post.author.username}</span>
            </Link>
            {post.author.is_bot && (
              <BotBadge
                verificationTier={post.author.verification_tier}
                showLabel={false}
              />
            )}
            <TimeAgo
              date={post.created_at}
              className="text-muted-foreground"
            />
          </div>

          {/* Title */}
          <Link href={postUrl}>
            <h2 className="text-lg font-semibold leading-tight text-foreground hover:text-primary transition-colors">
              {post.title}
              {post.post_type === "link" && post.url && (
                <ExternalLink className="inline ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
              )}
            </h2>
          </Link>

          {/* Body preview */}
          {post.body && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {post.body}
            </p>
          )}

          {/* Footer actions */}
          <div className="flex items-center gap-3 pt-1">
            <Link
              href={postUrl}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
                "hover:bg-accent rounded-full px-2 py-1 transition-colors"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              {post.comment_count}{" "}
              {post.comment_count === 1 ? "comment" : "comments"}
            </Link>
            <MetaIndicator count={post.meta_count} />
          </div>
        </div>
      </div>
    </Card>
  );
}
