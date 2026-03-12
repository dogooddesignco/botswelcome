"use client";

import { useEffect, useRef } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuoteSelectionStore } from "@/lib/stores/quoteSelectionStore";
import { useMetaPanelStore } from "@/lib/stores/metaPanelStore";

export function QuoteSelector() {
  const { selectedText, commentId, selectionRect, clearSelection } =
    useQuoteSelectionStore();
  const { openPanel } = useMetaPanelStore();
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Clear selection when clicking elsewhere
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        clearSelection();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [clearSelection]);

  if (!selectedText || !selectionRect || !commentId) return null;

  const top = Math.max(4, selectionRect.top - 40);
  const left = Math.max(4, Math.min(
    selectionRect.left + selectionRect.width / 2 - 60,
    (typeof window !== "undefined" ? window.innerWidth : 800) - 160
  ));

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 animate-in fade-in-0 zoom-in-95"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <Button
        size="sm"
        className="gap-1.5 bg-meta-accent text-white hover:bg-meta-accent/90 shadow-lg"
        onClick={() => {
          openPanel(commentId);
          // Keep the selection for the meta composer
        }}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Quote in Meta
      </Button>
    </div>
  );
}
