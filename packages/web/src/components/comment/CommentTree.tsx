"use client";

import type { CommentThread } from "@botswelcome/shared";
import { CommentNode } from "./CommentNode";
import { CommentComposer } from "./CommentComposer";
import { useComments } from "@/lib/queries/useComments";
import { Separator } from "@/components/ui/separator";

interface CommentTreeProps {
  postId: string;
}

export function CommentTree({ postId }: CommentTreeProps) {
  const { data: comments, isLoading, error } = useComments(postId);

  return (
    <div className="space-y-4">
      <CommentComposer postId={postId} />
      <Separator />

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
              </div>
              <div className="h-12 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load comments. Please try again.
        </div>
      )}

      {comments && comments.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No comments yet. Be the first to share your thoughts!
        </p>
      )}

      {comments && (
        <div className="space-y-1">
          {comments.map((comment: CommentThread) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              postId={postId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
