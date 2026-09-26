import type { HeatmapCell, MapSection, Persona, PersonaFeedback } from "@/shared/api/types";
import type { DemoId, DemoInsight, DemoRecommendation, ExhibitionDemo } from "./schema";

/**
 * Exhibition audience simulation as a pure state machine.
 *
 * Personas listen one after another. Each moves through
 *   waiting → listening (one step per presentation-map section) → understanding → reacting → complete
 * and after the last persona the demo synthesizes the common insight. Every
 * step only reveals data the step has actually "produced" from the demo:
 * listening reveals which sections were heard, understanding reveals the
 * per-section reception, reacting reveals the listener's own words. There is
 * no percentage or estimated time — the UI decides pacing by dispatching
 * ADVANCE (timer, click or reduced-motion COMPLETE).
 */

export const PERSONA_PHASES = ["waiting", "listening", "understanding", "reacting", "complete"] as const;
export type PersonaPhase = (typeof PERSONA_PHASES)[number];

export const SIMULATION_STAGES = ["idle", "simulating", "synthesizing", "complete"] as const;
export type SimulationStage = (typeof SIMULATION_STAGES)[number];

export type StageMeta = { label: string; description: string };

export const PERSONA_PHASE_META: Record<PersonaPhase, StageMeta> = {
  waiting: { label: "기다리는 중", description: "아직 발표를 듣기 전이에요." },
  listening: { label: "듣는 중", description: "발표를 구간 순서대로 듣고 있어요." },
  understanding: { label: "이해하는 중", description: "들은 내용을 자기 배경지식과 맞춰 보며 구간마다 따라왔는지 확인하고 있어요." },
  reacting: { label: "반응 정리 중", description: "와닿은 곳과 막힌 곳을 자기 말로 정리하고 있어요." },
  complete: { label: "다 들었어요", description: "이 관중의 반응이 모두 정리됐어요." },
};

export const SIMULATION_STAGE_META: Record<SimulationStage, StageMeta> = {
  idle: { label: "시작 전", description: "관중이 자리에 앉아 발표를 기다리고 있어요." },
  simulating: { label: "관중이 듣는 중", description: "관중이 한 명씩 발표를 듣고 반응을 정리하고 있어요." },
  synthesizing: { label: "공통 발견 정리", description: "세 관중의 반응을 맞대어 공통 발견과 개선 제안을 정리하고 있어요." },
  complete: { label: "분석 완료", description: "공통 발견과 개선 제안이 준비됐어요." },
};

export type PersonaSimState = {
  personaId: string;
  phase: PersonaPhase;
  /** Section being heard while `listening`; null otherwise. */
  sectionIndex: number | null;
};

export type SimulationState = {
  demoId: DemoId;
  stage: SimulationStage;
  sectionIds: readonly string[];
  personas: readonly PersonaSimState[];
};

export type SimulationEvent =
  | { type: "START" }
  /** One step forward. Ignored in `idle` (START first) and `complete`. */
  | { type: "ADVANCE" }
  /** Jump to the end, e.g. for reduced motion or a "skip" button. */
  | { type: "COMPLETE" }
  | { type: "RESET" };

export function createSimulation(demo: ExhibitionDemo): SimulationState {
  const sectionIds = (demo.result.presentationMap?.sections ?? []).map((s) => s.id);
  if (sectionIds.length === 0) throw new Error(`Demo ${demo.id} has no presentation-map sections to simulate.`);
  return {
    demoId: demo.id,
    stage: "idle",
    sectionIds,
    personas: demo.result.personas.map((p) => ({ personaId: p.id, phase: "waiting", sectionIndex: null })),
  };
}

function withPersona(state: SimulationState, index: number, next: PersonaSimState): SimulationState {
  return { ...state, personas: state.personas.map((p, i) => (i === index ? next : p)) };
}

function startPersona(state: SimulationState, index: number): SimulationState {
  return withPersona(state, index, { ...state.personas[index]!, phase: "listening", sectionIndex: 0 });
}

function advance(state: SimulationState): SimulationState {
  if (state.stage === "synthesizing") return { ...state, stage: "complete" };
  if (state.stage !== "simulating") return state;

  const index = state.personas.findIndex((p) => p.phase !== "waiting" && p.phase !== "complete");
  if (index === -1) return state;
  const current = state.personas[index]!;
  const lastSection = state.sectionIds.length - 1;

  switch (current.phase) {
    case "listening":
      return current.sectionIndex! < lastSection
        ? withPersona(state, index, { ...current, sectionIndex: current.sectionIndex! + 1 })
        : withPersona(state, index, { ...current, phase: "understanding", sectionIndex: null });
    case "understanding":
      return withPersona(state, index, { ...current, phase: "reacting" });
    case "reacting": {
      const done = withPersona(state, index, { ...current, phase: "complete" });
      return index + 1 < state.personas.length ? startPersona(done, index + 1) : { ...done, stage: "synthesizing" };
    }
    default:
      return state;
  }
}

export function simulationReducer(state: SimulationState, event: SimulationEvent): SimulationState {
  switch (event.type) {
    case "START":
      return state.stage === "idle" ? startPersona({ ...state, stage: "simulating" }, 0) : state;
    case "ADVANCE":
      return advance(state);
    case "COMPLETE":
      return {
        ...state,
        stage: "complete",
        personas: state.personas.map((p) => ({ ...p, phase: "complete", sectionIndex: null })),
      };
    case "RESET":
      return {
        ...state,
        stage: "idle",
        personas: state.personas.map((p) => ({ ...p, phase: "waiting", sectionIndex: null })),
      };
  }
}

export const isSimulationDone = (state: SimulationState) => state.stage === "complete";

/** Every state from START to complete, in order. Handy for autoplay and tests. */
export function simulationSteps(demo: ExhibitionDemo): SimulationState[] {
  let state = simulationReducer(createSimulation(demo), { type: "START" });
  const steps = [state];
  while (!isSimulationDone(state)) {
    state = simulationReducer(state, { type: "ADVANCE" });
    steps.push(state);
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Views: what the UI may show for a state. Only data the step has produced.
// ---------------------------------------------------------------------------

export type PersonaSimView = {
  persona: Persona;
  phase: PersonaPhase;
  meta: StageMeta;
  /** The section being heard right now (listening only). */
  currentSection: MapSection | null;
  /** Sections this persona has finished hearing, in speaking order. */
  heardSections: MapSection[];
  /** Per-section reception with evidence; revealed from `understanding` on. */
  reception: HeatmapCell[];
  /** The listener's own summary; revealed from `reacting` on. */
  feedback: PersonaFeedback | null;
};

export type SimulationView = {
  stage: SimulationStage;
  meta: StageMeta;
  /** Short Korean line describing exactly what is happening now. */
  message: string;
  activePersonaId: string | null;
  personas: PersonaSimView[];
  /** Revealed only when the whole simulation is complete. */
  insight: DemoInsight | null;
  recommendation: DemoRecommendation | null;
};

const PHASE_ORDER: Record<PersonaPhase, number> = { waiting: 0, listening: 1, understanding: 2, reacting: 3, complete: 4 };
const reached = (phase: PersonaPhase, target: PersonaPhase) => PHASE_ORDER[phase] >= PHASE_ORDER[target];

export function simulationView(state: SimulationState, demo: ExhibitionDemo): SimulationView {
  if (state.demoId !== demo.id) throw new Error(`Simulation for ${state.demoId} cannot be viewed with demo ${demo.id}.`);
  const { result } = demo;
  const sections = result.presentationMap?.sections ?? [];
  const cells = result.audienceHeatmap?.cells ?? [];

  const personas = state.personas.map((sim): PersonaSimView => {
    const persona = result.personas.find((p) => p.id === sim.personaId)!;
    const heardCount =
      sim.phase === "listening" ? sim.sectionIndex! : reached(sim.phase, "understanding") ? sections.length : 0;
    return {
      persona,
      phase: sim.phase,
      meta: PERSONA_PHASE_META[sim.phase],
      currentSection: sim.phase === "listening" ? sections[sim.sectionIndex!]! : null,
      heardSections: sections.slice(0, heardCount),
      reception: reached(sim.phase, "understanding")
        ? sections.flatMap((s) => cells.find((c) => c.sectionId === s.id && c.personaId === sim.personaId) ?? [])
        : [],
      feedback: reached(sim.phase, "reacting") ? (result.personaFeedback.find((f) => f.personaId === sim.personaId) ?? null) : null,
    };
  });

  const active = personas.find((p) => p.phase !== "waiting" && p.phase !== "complete") ?? null;
  const done = state.stage === "complete";
  return {
    stage: state.stage,
    meta: SIMULATION_STAGE_META[state.stage],
    message: messageFor(state.stage, active),
    activePersonaId: active?.persona.id ?? null,
    personas,
    insight: done ? demo.commonInsight : null,
    recommendation: done ? demo.recommendation : null,
  };
}

function messageFor(stage: SimulationStage, active: PersonaSimView | null): string {
  if (stage !== "simulating" || !active) return SIMULATION_STAGE_META[stage].description;
  const name = active.persona.name;
  switch (active.phase) {
    case "listening":
      return `${name}이(가) ‘${active.currentSection!.title}’ 구간을 듣고 있어요.`;
    case "understanding":
      return `${name}이(가) 구간마다 따라왔는지 되짚어 보고 있어요.`;
    case "reacting":
      return `${name}이(가) 와닿은 곳과 막힌 곳을 정리하고 있어요.`;
    default:
      return SIMULATION_STAGE_META[stage].description;
  }
}
