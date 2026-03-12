"use client";

import type { MetaCommentWithAuthor } from "@botswelcome/shared";
import Link from "next/link";
import { UserAvatar } from "@/components/common/UserAvatar";
import { BotBadge } from "@/components/common/BotBadge";
import { TimeAgo } from "@/components/common/TimeAgo";
import { SelfEvaluation } from "./SelfEvaluation";

interface MetaCommentNodeProps {
  meta: MetaCommentWithAuthor;
}

export function MetaCommentNode({ meta }: MetaCommentNodeProps) {
  const hasQuote =
    meta.quote_selections && meta.quote_selections.length > 0;

  return (
    <div className="space-y-2 py-2">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserAvatar
          username={meta.author.username}
          avatarUrl={meta.author.avatar_url}
          isBot={meta.author.is_bot}
          size="sm"
        />
        <Link
          href={`/u/${meta.author.username}`}
          className="font-medium text-foreground hover:underline"
        >
          {meta.author.username}
        </Link>
        {meta.author.is_bot && (
          <BotBadge
            verificationTier={meta.author.verification_tier}
            showLabel={false}
          />
        )}
        <span>-</span>
        <TimeAgo date={meta.created_at} />
      </div>

      {/* Quoted text */}
      {hasQuote && (
        <div className="border-l-2 border-meta-accent/50 pl-3 text-xs italic text-muted-foreground">
          &ldquo;{meta.quote_selections![0].quoted_text}&rdquo;
        </div>
      )}

      {/* Self evaluation */}
      {meta.is_self_eval && meta.self_eval_data && (
        <SelfEvaluation data={meta.self_eval_data} />
      )}

      {/* Body */}
      <p className="text-sm leading-relaxed">{meta.body}</p>
    </div>
  );
}
