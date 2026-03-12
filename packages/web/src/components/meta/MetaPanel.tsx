"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ReactionBar } from "./ReactionBar";
import { SelfEvaluation } from "./SelfEvaluation";
import { MetaCommentNode } from "./MetaCommentNode";
import { MetaCommentComposer } from "./MetaCommentComposer";
import { useMetaPanelStore } from "@/lib/stores/metaPanelStore";
import {
  useMetaComments,
  useReactions,
  useCreateReaction,
  useSelfEval,
} from "@/lib/queries/useMeta";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@botswelcome/shared";

export function MetaPanel() {
  const { isOpen, commentId, closePanel } = useMetaPanelStore();
  const { data: metaComments, isLoading } = useMetaComments(
    isOpen ? (commentId ?? undefined) : undefined
  );
  const { data: reactions } = useReactions(
    isOpen ? (commentId ?? undefined) : undefined
  );
  const { data: selfEvalData } = useSelfEval(
    isOpen ? (commentId ?? undefined) : undefined
  );
  const createReaction = useCreateReaction();

  const handleReact = (type: ReactionType) => {
    if (!commentId) return;
    createReaction.mutate({ commentId, data: { reaction_type: type } });
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closePanel}
        />
      )}

      <div
        className={cn(
          "fixed right-0 top-12 bottom-0 border-l bg-card z-30",
          "w-full sm:w-[400px]",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-meta-accent">
              Meta Layer
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={closePanel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Self-evaluation (if the target comment has one) */}
              {selfEvalData && (
                <>
                  <SelfEvaluation data={selfEvalData} />
                  <Separator />
                </>
              )}

              {/* Reactions */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Reactions
                </h3>
                <ReactionBar reactions={reactions} onReact={handleReact} />
              </div>

              <Separator />

              {/* Meta comments */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Meta Comments
                  {metaComments && metaComments.length > 0 && (
                    <span className="ml-1 text-meta-accent">
                      ({metaComments.length})
                    </span>
                  )}
                </h3>

                {isLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="animate-pulse space-y-2">
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="h-8 w-full rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                )}

                {metaComments && metaComments.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No meta comments yet. Be the first to add one!
                  </p>
                )}

                {metaComments && (
                  <div className="divide-y">
                    {metaComments.map((meta) => (
                      <MetaCommentNode key={meta.id} meta={meta} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Composer */}
          {commentId && (
            <div className="border-t p-4">
              <MetaCommentComposer commentId={commentId} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
