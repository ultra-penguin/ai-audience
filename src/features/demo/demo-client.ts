import { ApiError, type ApiClient } from "@/shared/api/client";
import { AnalysisStatusSchema, type AnalysisStatus } from "@/shared/api/types";
import { getDemo, getDemoResult } from "./catalog";

/**
 * Offline ApiClient for the exhibition demos. Results are written in advance,
 * so status is always the truthful "completed" with every step done — there
 * is no fake progress. The step-by-step audience animation is driven by
 * `simulation.ts`, not by this client. Deterministic: no timers, no clock.
 */
export function demoStatus(id: string): AnalysisStatus {
  const { result } = getDemo(id);
  const sections = result.presentationMap?.sections ?? [];
  const cells = result.audienceHeatmap?.cells ?? [];
  return AnalysisStatusSchema.parse({
    presentationId: id,
    stage: "completed",
    progress: 1,
    pipeline: {
      steps: (["structure", "section", "persona", "cross_check"] as const).map((step) => ({ step, state: "done" })),
      sections: sections.map(({ id, title, startSec, endSec, summary }) => ({ id, title, startSec, endSec, summary })),
      personas: result.personas.map(({ id, kind, name }) => ({ id, kind, name })),
      currentSectionId: null,
      currentPersonaId: null,
      cells: result.personas.flatMap((p) => sections.map((s) => ({ sectionId: s.id, personaId: p.id, state: "done" }))),
      message: null,
      insights: cells
        .filter((c) => c.reception !== "clear" && c.evidence)
        .map((c) => ({ id: `ins-${c.sectionId}-${c.personaId}`, text: c.evidence!, sectionId: c.sectionId, personaId: c.personaId })),
    },
    updatedAt: result.analyzedAt,
  });
}

export function createDemoClient(): ApiClient {
  return {
    async createPresentation() {
      throw new ApiError("invalid_request", "전시 데모는 녹음을 올리지 않아요.", 400);
    },
    async startAnalysis(id) {
      return demoStatus(id);
    },
    async getAnalysisStatus(id) {
      return demoStatus(id);
    },
    async getResult(id) {
      return getDemoResult(id);
    },
  };
}
