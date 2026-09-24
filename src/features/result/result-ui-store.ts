"use client";

import { create } from "zustand";

/** Client-only view state for the result page. */
type ResultUiState = {
  /** null = show every audience member's difficult points. */
  personaFilter: string | null;
  /** Difficult section open in the reader; null = the default (priority, else first). */
  selectedSectionId: string | null;
  setPersonaFilter: (personaId: string | null) => void;
  selectSection: (sectionId: string | null) => void;
  /** Jump to a section from elsewhere in the report, clearing a filter that would hide it. */
  focusSection: (sectionId: string) => void;
  /** Transcript segments to reveal and mark in the full script (from the presentation map). */
  scriptFocusIds: string[];
  focusScript: (segmentIds: string[]) => void;
  reset: () => void;
};

export const useResultUiStore = create<ResultUiState>()((set) => ({
  personaFilter: null,
  selectedSectionId: null,
  setPersonaFilter: (personaFilter) => set({ personaFilter }),
  selectSection: (selectedSectionId) => set({ selectedSectionId }),
  focusSection: (selectedSectionId) => set({ selectedSectionId, personaFilter: null }),
  scriptFocusIds: [],
  focusScript: (scriptFocusIds) => set({ scriptFocusIds }),
  reset: () => set({ personaFilter: null, selectedSectionId: null, scriptFocusIds: [] }),
}));
