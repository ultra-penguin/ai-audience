"use client";

import { create } from "zustand";

/** Client-only view state for the result page. */
type ResultUiState = {
  /** null = show every audience member's difficult points. */
  personaFilter: string | null;
  setPersonaFilter: (personaId: string | null) => void;
};

export const useResultUiStore = create<ResultUiState>()((set) => ({
  personaFilter: null,
  setPersonaFilter: (personaFilter) => set({ personaFilter }),
}));
