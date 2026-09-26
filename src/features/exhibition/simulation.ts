/**
 * Exhibition simulation timeline. The demo result already exists, so this only paces
 * how it is revealed: each state is a real step of the product's pipeline, shown in
 * order, and the screen names the step instead of inventing a percentage.
 *
 *   preview    the talk's context, before the visitor presses start
 *   listening  the audience hears the talk section by section; reactions appear per section
 *   comparing  reactions are laid side by side and the widest split is pointed out
 *   writing    the report is assembled (counts come from the result)
 *   done       the report is ready
 */

export type SimulationPhase = "preview" | "listening" | "comparing" | "writing" | "done";

export const SIMULATION_TIMING = {
  /** How long the context preview holds before the start action is emphasised. */
  previewMs: 2400,
  /** Per presentation-map section while listening. */
  sectionMs: 950,
  comparingMs: 2000,
  writingMs: 1600,
  /** Pause on "done" before moving to the report on its own. */
  handoffMs: 1400,
} as const;

export type SimulationFrame = {
  phase: Exclude<SimulationPhase, "preview">;
  /** Sections fully heard so far (0…sectionCount). */
  heard: number;
  /** Section currently being heard, or -1 outside "listening". */
  current: number;
};

/** Length of the simulation from start to "done". */
export function simulationDurationMs(sectionCount: number): number {
  const t = SIMULATION_TIMING;
  return Math.max(1, sectionCount) * t.sectionMs + t.comparingMs + t.writingMs;
}

/** The frame `elapsedMs` after the visitor pressed start. Pure, so it can be tested and resumed. */
export function simulationFrame(elapsedMs: number, sectionCount: number): SimulationFrame {
  const t = SIMULATION_TIMING;
  const count = Math.max(1, sectionCount);
  const elapsed = Math.max(0, elapsedMs);
  const listenEnd = count * t.sectionMs;
  if (elapsed < listenEnd) {
    const current = Math.floor(elapsed / t.sectionMs);
    return { phase: "listening", heard: current, current };
  }
  if (elapsed < listenEnd + t.comparingMs) return { phase: "comparing", heard: count, current: -1 };
  if (elapsed < listenEnd + t.comparingMs + t.writingMs) return { phase: "writing", heard: count, current: -1 };
  return { phase: "done", heard: count, current: -1 };
}

export const PHASE_STEPS: { phase: Exclude<SimulationPhase, "preview" | "done">; label: string; detail: string }[] = [
  { phase: "listening", label: "관중이 듣는 중", detail: "세 관중이 발표를 구간마다 따라 들어요." },
  { phase: "comparing", label: "반응 비교", detail: "같은 구간에서 관중 반응이 어디서 갈렸는지 맞대어 봐요." },
  { phase: "writing", label: "리포트 정리", detail: "막힌 이유와 고칠 문장을 리포트로 묶어요." },
];

const ORDER: SimulationPhase[] = ["preview", "listening", "comparing", "writing", "done"];

/** Where a step sits relative to the current phase. */
export function stepState(step: SimulationPhase, current: SimulationPhase): "done" | "active" | "pending" {
  const a = ORDER.indexOf(step);
  const b = ORDER.indexOf(current);
  return a < b ? "done" : a === b ? "active" : "pending";
}
