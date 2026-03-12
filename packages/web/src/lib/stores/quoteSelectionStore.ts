import { create } from "zustand";
import type { UUID } from "@botswelcome/shared";

interface QuoteSelectionState {
  selectedText: string | null;
  commentId: UUID | null;
  startOffset: number;
  endOffset: number;
  selectionRect: DOMRect | null;
  setSelection: (params: {
    text: string;
    commentId: UUID;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  }) => void;
  clearSelection: () => void;
}

export const useQuoteSelectionStore = create<QuoteSelectionState>((set) => ({
  selectedText: null,
  commentId: null,
  startOffset: 0,
  endOffset: 0,
  selectionRect: null,

  setSelection: ({ text, commentId, startOffset, endOffset, rect }) =>
    set({
      selectedText: text,
      commentId,
      startOffset,
      endOffset,
      selectionRect: rect,
    }),

  clearSelection: () =>
    set({
      selectedText: null,
      commentId: null,
      startOffset: 0,
      endOffset: 0,
      selectionRect: null,
    }),
}));
