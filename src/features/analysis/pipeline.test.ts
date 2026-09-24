import { describe, expect, it } from "vitest";
import type { AnalysisPipeline, AnalysisStatus } from "@/shared/api/types";
import { activePersonaId, analysisTimeline, seatStatesFor } from "./pipeline";

const personas: AnalysisPipeline["personas"] = [
  { id: "p-beginner", kind: "beginner", name: "비전공 관중" },
  { id: "p-peer", kind: "peer", name: "일반 관중" },
  { id: "p-expert", kind: "expert", name: "전문가 관중" },
];

const status = (patch: Partial<AnalysisStatus>): AnalysisStatus => ({
  presentationId: "p",
  stage: "listening",
  updatedAt: "2026-09-25T00:00:00.000Z",
  ...patch,
});

const states = (s: AnalysisStatus) => analysisTimeline(s).map((i) => `${i.key}:${i.state}`);

describe("analysis pipeline view model", () => {
  it("keeps the Phase 3 stage list when no step detail is reported", () => {
    expect(states(status({ stage: "transcribing" }))).toEqual([
      "queued:done",
      "transcribing:running",
      "listening:pending",
      "synthesizing:pending",
    ]);
    expect(seatStatesFor(status({ stage: "listening" }))).toBe("listening");
  });

  it("shows only the steps the backend reports as running", () => {
    const s = status({
      pipeline: {
        steps: [
          { step: "structure", state: "done" },
          { step: "section", state: "running" },
        ],
        personas,
        currentPersonaId: "p-peer", // named, but the persona step is not running
      },
    });
    expect(states(s)).toEqual([
      "queued:done",
      "transcribing:done",
      "structure:done",
      "section:running",
      "persona:pending",
      "cross_check:pending",
    ]);
    expect(activePersonaId(s)).toBeUndefined();
    expect(seatStatesFor(s)).toEqual({ beginner: "waiting", peer: "waiting", expert: "waiting" });
  });

  it("marks one persona listening from a running cell and finished personas as listened", () => {
    const s = status({
      pipeline: {
        steps: [
          { step: "structure", state: "done" },
          { step: "section", state: "done" },
          { step: "persona", state: "running" },
        ],
        personas,
        cells: [
          { sectionId: "a", personaId: "p-beginner", state: "done" },
          { sectionId: "b", personaId: "p-beginner", state: "done" },
          { sectionId: "a", personaId: "p-peer", state: "running" },
          { sectionId: "b", personaId: "p-peer", state: "pending" },
        ],
      },
    });
    expect(activePersonaId(s)).toBe("p-peer");
    expect(seatStatesFor(s)).toEqual({ beginner: "listened", peer: "listening", expert: "waiting" });
  });

  it("turns the running step into the failed one when the pipeline fails", () => {
    const s = status({
      stage: "failed",
      failedStage: "listening",
      pipeline: { steps: [{ step: "structure", state: "done" }, { step: "section", state: "running" }], personas },
    });
    expect(states(s)).toContain("section:failed");
    expect(states(s)).toContain("transcribing:done");
    expect(seatStatesFor(s)).toBe("stopped");
  });
});
