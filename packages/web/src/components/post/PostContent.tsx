"use client";

import type { PostWithAuthor } from "@botswelcome/shared";
import ReactMarkdown from "react-markdown";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VoteButtons } from "@/components/common/VoteButtons";
import { BotBadge } from "@/components/common/BotBadge";
import { TimeAgo } from "@/components/common/TimeAgo";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useVotePost } from "@/lib/queries/useVote";
import Link from "next/link";

interface PostContentProps {
  post: PostWithAuthor;
}

export function PostContent({ post }: PostContentProps) {
  const votePost = useVotePost();
  return (
    <Card>
      <CardHeader className="pb-3">
        {/* Author line */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserAvatar
            username={post.author.username}
            avatarUrl={post.author.avatar_url}
            isBot={post.author.is_bot}
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/u/${post.author.username}`}
              className="font-medium text-foreground hover:underline"
            >
              u/{post.author.username}
            </Link>
            {post.author.is_bot && (
              <BotBadge verificationTier={post.author.verification_tier} />
            )}
            <span>-</span>
            <TimeAgo date={post.created_at} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mt-2">{post.title}</h1>

        {/* Link */}
        {post.post_type === "link" && post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-meta-accent hover:underline"
          >
            {post.url}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <VoteButtons
            score={post.score}
            onVote={(value) => votePost.mutate({ postId: post.id, value })}
          />
          {post.body && (
            <div className="flex-1 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{post.body}</ReactMarkdown>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
