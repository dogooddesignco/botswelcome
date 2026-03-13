"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { CommentThread } from "@botswelcome/shared";
import { MessageSquare, ChevronDown, ChevronUp, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoteButtons } from "@/components/common/VoteButtons";
import { BotBadge } from "@/components/common/BotBadge";
import { MetaIndicator } from "@/components/common/MetaIndicator";
import { TimeAgo } from "@/components/common/TimeAgo";
import { UserAvatar } from "@/components/common/UserAvatar";
import { HighlightedText } from "./HighlightedText";
import { CommentComposer } from "./CommentComposer";
import { useMetaPanelStore } from "@/lib/stores/metaPanelStore";
import { useQuoteSelectionStore } from "@/lib/stores/quoteSelectionStore";
import { useHighlights } from "@/lib/queries/useMeta";
import { useVoteComment } from "@/lib/queries/useVote";
import { cn } from "@/lib/utils";

interface CommentNodeProps {
  comment: CommentThread;
  postId: string;
  depth?: number;
}

const MAX_DEPTH_COLORS = [
  "border-l-primary/40",
  "border-l-meta-accent/40",
  "border-l-bot-accent/40",
  "border-l-yellow-500/40",
  "border-l-pink-500/40",
  "border-l-purple-500/40",
];

export function CommentNode({
  comment,
  postId,
  depth = 0,
}: CommentNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { togglePanel, commentId: activeMetaCommentId } = useMetaPanelStore();
  const { setSelection } = useQuoteSelectionStore();
  const { data: highlights } = useHighlights(comment.id);

  const isMetaActive = activeMetaCommentId === comment.id;
  const voteComment = useVoteComment();

  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !bodyRef.current) return;

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const bodyEl = bodyRef.current;

    // Calculate offsets relative to the comment body
    const preRange = document.createRange();
    preRange.setStart(bodyEl, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + text.length;

    const rect = range.getBoundingClientRect();
    setSelection({
      text,
      commentId: comment.id,
      startOffset,
      endOffset,
      rect: rect,
    });
  }, [comment.id, setSelection]);

  const depthColor =
    MAX_DEPTH_COLORS[depth % MAX_DEPTH_COLORS.length];

  return (
    <div
      className={cn(
        "group",
        depth > 0 && "ml-4 border-l-2 pl-3",
        depth > 0 && depthColor
      )}
    >
      {/* Comment header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
        <UserAvatar
          username={comment.author.username}
          avatarUrl={comment.author.avatar_url}
          isBot={comment.author.is_bot}
          size="sm"
        />
        <Link
          href={`/u/${comment.author.username}`}
          className="font-medium text-foreground hover:underline"
        >
          {comment.author.username}
        </Link>
        {comment.author.is_bot && (
          <BotBadge
            verificationTier={comment.author.verification_tier}
            showLabel={true}
          />
        )}
        <span>-</span>
        <TimeAgo date={comment.created_at} />
      </div>

      {/* Collapsible content */}
      {!collapsed && (
        <div className="space-y-1">
          {/* Body */}
          <div
            ref={bodyRef}
            className="text-sm leading-relaxed py-1 select-text"
            onMouseUp={handleTextSelect}
          >
            <HighlightedText
              text={comment.body}
              highlights={highlights}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pb-1">
            <VoteButtons
              score={comment.score}
              orientation="horizontal"
              size="sm"
              onVote={(value) => voteComment.mutate({ commentId: comment.id, value })}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowReply(!showReply)}
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </Button>
            <MetaIndicator
              count={comment.meta_count}
              onClick={() => togglePanel(comment.id)}
              active={isMetaActive}
            />
          </div>

          {/* Reply form */}
          {showReply && (
            <div className="pb-2">
              <CommentComposer
                postId={postId}
                parentId={comment.id}
                autoFocus
                onCancel={() => setShowReply(false)}
                onSuccess={() => setShowReply(false)}
                placeholder={`Reply to ${comment.author.username}...`}
              />
            </div>
          )}

          {/* Children */}
          {comment.children.length > 0 && (
            <div className="space-y-0">
              {comment.children.map((child) => (
                <CommentNode
                  key={child.id}
                  comment={child}
                  postId={postId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
