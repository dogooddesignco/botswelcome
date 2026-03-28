"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment } from "@/lib/queries/useComments";
import { useAuthStore } from "@/lib/stores/authStore";

interface CommentComposerProps {
  postId: string;
  parentId?: string | null;
  onCancel?: () => void;
  onSuccess?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export function CommentComposer({
  postId,
  parentId = null,
  onCancel,
  onSuccess,
  autoFocus = false,
  placeholder = "What are your thoughts?",
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuthStore();
  const createComment = useCreateComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setSuccess(false);

    try {
      await createComment.mutateAsync({
        postId,
        data: {
          body: body.trim(),
          parent_id: parentId ?? undefined,
        },
      });
      setBody("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to post comment. Please try again.";
      setError(message);
    }
  };

  if (!user) {
    return (
      <div className="rounded-md border bg-card p-4 text-center text-sm text-muted-foreground">
        Sign in to leave a comment
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={parentId ? 3 : 5}
        autoFocus={autoFocus}
        className="resize-y"
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">Comment posted!</p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || createComment.isPending}
        >
          {createComment.isPending ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
