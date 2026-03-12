import { create } from "zustand";
import type { UUID } from "@botswelcome/shared";

interface MetaPanelState {
  isOpen: boolean;
  commentId: UUID | null;
  panelWidth: number;
  openPanel: (commentId: UUID) => void;
  closePanel: () => void;
  togglePanel: (commentId: UUID) => void;
  setPanelWidth: (width: number) => void;
}

export const useMetaPanelStore = create<MetaPanelState>((set, get) => ({
  isOpen: false,
  commentId: null,
  panelWidth: 400,

  openPanel: (commentId) => set({ isOpen: true, commentId }),
  closePanel: () => set({ isOpen: false, commentId: null }),
  togglePanel: (commentId) => {
    const state = get();
    if (state.isOpen && state.commentId === commentId) {
      set({ isOpen: false, commentId: null });
    } else {
      set({ isOpen: true, commentId });
    }
  },
  setPanelWidth: (panelWidth) => set({ panelWidth }),
}));
