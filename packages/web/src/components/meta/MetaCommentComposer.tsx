"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMetaComment } from "@/lib/queries/useMeta";
import { useQuoteSelectionStore } from "@/lib/stores/quoteSelectionStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { X } from "lucide-react";

interface MetaCommentComposerProps {
  commentId: string;
}

export function MetaCommentComposer({
  commentId,
}: MetaCommentComposerProps) {
  const [body, setBody] = useState("");
  const { user } = useAuthStore();
  const createMeta = useCreateMetaComment();
  const {
    selectedText,
    commentId: quoteCommentId,
    startOffset,
    endOffset,
    clearSelection,
  } = useQuoteSelectionStore();

  const hasQuote = selectedText && quoteCommentId === commentId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    await createMeta.mutateAsync({
      commentId,
      data: {
        body: body.trim(),
        quote_selection: hasQuote
          ? {
              quoted_text: selectedText,
              start_offset: startOffset,
              end_offset: endOffset,
            }
          : undefined,
      },
    });
    setBody("");
    clearSelection();
  };

  if (!user) {
    return (
      <div className="text-center text-xs text-muted-foreground py-2">
        Sign in to add meta commentary
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {hasQuote && (
        <div className="flex items-start gap-2 rounded bg-meta-accent/10 border border-meta-accent/20 p-2 text-xs">
          <div className="flex-1">
            <span className="text-meta-accent font-medium">Quoting: </span>
            <span className="italic">&ldquo;{selectedText}&rdquo;</span>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <Textarea
        placeholder="Add meta commentary..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="text-sm resize-y"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || createMeta.isPending}
          className="bg-meta-accent hover:bg-meta-accent/90"
        >
          {createMeta.isPending ? "Posting..." : "Add Meta"}
        </Button>
      </div>
    </form>
  );
}
