import { describe, expect, it } from "vitest";
import { DEMO_CATALOG, getDemo } from "./catalog";
import {
  PERSONA_PHASES,
  PERSONA_PHASE_META,
  SIMULATION_STAGES,
  SIMULATION_STAGE_META,
  createSimulation,
  simulationReducer,
  simulationSteps,
  simulationView,
  type SimulationState,
} from "./simulation";

const demo = getDemo("demo-bfs");
const sectionCount = demo.result.presentationMap!.sections.length;
const advance = (s: SimulationState, n = 1) => {
  for (let i = 0; i < n; i++) s = simulationReducer(s, { type: "ADVANCE" });
  return s;
};

describe("simulation state machine", () => {
  it("starts idle with every persona waiting", () => {
    const state = createSimulation(demo);
    expect(state.stage).toBe("idle");
    expect(state.personas.map((p) => p.phase)).toEqual(["waiting", "waiting", "waiting"]);
    const view = simulationView(state, demo);
    expect(view.activePersonaId).toBeNull();
    expect(view.insight).toBeNull();
  });

  it("ignores ADVANCE before START and after completion", () => {
    const idle = createSimulation(demo);
    expect(advance(idle)).toBe(idle);
    const done = simulationReducer(idle, { type: "COMPLETE" });
    expect(advance(done)).toBe(done);
    const running = simulationReducer(idle, { type: "START" });
    expect(simulationReducer(running, { type: "START" })).toBe(running);
  });

  it("walks the first persona through listening (one step per section), understanding, reacting, complete", () => {
    let state = simulationReducer(createSimulation(demo), { type: "START" });
    const seen: string[] = [];
    for (let i = 0; i < sectionCount; i++) {
      expect(state.personas[0]).toMatchObject({ phase: "listening", sectionIndex: i });
      seen.push(simulationView(state, demo).personas[0]!.currentSection!.id);
      state = advance(state);
    }
    expect(seen).toEqual(demo.result.presentationMap!.sections.map((s) => s.id));
    expect(state.personas[0]!.phase).toBe("understanding");
    state = advance(state);
    expect(state.personas[0]!.phase).toBe("reacting");
    state = advance(state);
    expect(state.personas[0]!.phase).toBe("complete");
    // Personas listen one after another.
    expect(state.personas[1]).toMatchObject({ phase: "listening", sectionIndex: 0 });
    expect(state.personas[2]!.phase).toBe("waiting");
  });

  it.each(DEMO_CATALOG.map((d) => [d.id, d] as const))("%s: phases only move forward and end in synthesis → complete", (_id, d) => {
    const steps = simulationSteps(d);
    const sections = d.result.presentationMap!.sections.length;
    // START + (sections + 3 phase steps) per persona, then synthesizing → complete.
    expect(steps).toHaveLength(1 + 3 * (sections + 2) + 1);
    for (let i = 1; i < steps.length; i++) {
      steps[i]!.personas.forEach((p, j) => {
        expect(PERSONA_PHASES.indexOf(p.phase)).toBeGreaterThanOrEqual(PERSONA_PHASES.indexOf(steps[i - 1]!.personas[j]!.phase));
      });
      expect(SIMULATION_STAGES.indexOf(steps[i]!.stage)).toBeGreaterThanOrEqual(SIMULATION_STAGES.indexOf(steps[i - 1]!.stage));
    }
    // At most one persona is ever active.
    for (const s of steps) expect(s.personas.filter((p) => p.phase !== "waiting" && p.phase !== "complete").length).toBeLessThanOrEqual(1);
    // Every persona passes through at least three sequential working states.
    for (const j of [0, 1, 2]) {
      const phases = [...new Set(steps.map((s) => s.personas[j]!.phase))];
      expect(phases).toEqual(["waiting", "listening", "understanding", "reacting", "complete"].slice(j === 0 ? 1 : 0));
    }
    expect(steps.at(-2)!.stage).toBe("synthesizing");
    expect(steps.at(-1)!.stage).toBe("complete");
  });

  it("reveals only what each step has produced", () => {
    let state = simulationReducer(createSimulation(demo), { type: "START" });
    state = advance(state, 2);
    let view = simulationView(state, demo).personas[0]!;
    expect(view.heardSections).toHaveLength(2);
    expect(view.reception).toEqual([]);
    expect(view.feedback).toBeNull();

    state = advance(state, sectionCount - 2); // understanding
    view = simulationView(state, demo).personas[0]!;
    expect(view.heardSections).toHaveLength(sectionCount);
    expect(view.reception).toHaveLength(sectionCount);
    expect(view.feedback).toBeNull();

    state = advance(state); // reacting
    view = simulationView(state, demo).personas[0]!;
    expect(view.feedback?.reaction).toBe(demo.result.personaFeedback[0]!.reaction);
    expect(simulationView(state, demo).insight).toBeNull();
  });

  it("describes the current step in Korean and exposes no numeric progress", () => {
    for (const state of simulationSteps(demo)) {
      const view = simulationView(state, demo);
      expect(view.message).toMatch(/[가-힣]/);
      expect(view).not.toHaveProperty("progress");
    }
    const listening = simulationView(simulationReducer(createSimulation(demo), { type: "START" }), demo);
    expect(listening.message).toContain(demo.result.personas[0]!.name);
    expect(listening.message).toContain(demo.result.presentationMap!.sections[0]!.title);
    for (const meta of [...Object.values(PERSONA_PHASE_META), ...Object.values(SIMULATION_STAGE_META)]) {
      expect(meta.label).toMatch(/[가-힣]/);
      expect(meta.description).toMatch(/[가-힣]/);
    }
  });

  it("reveals the common insight and recommendation only when complete", () => {
    const final = simulationView(simulationSteps(demo).at(-1)!, demo);
    expect(final.insight).toEqual(demo.commonInsight);
    expect(final.recommendation).toEqual(demo.recommendation);
    expect(final.personas.every((p) => p.phase === "complete" && p.feedback)).toBe(true);
  });

  it("COMPLETE skips to the end and RESET returns to idle", () => {
    const running = advance(simulationReducer(createSimulation(demo), { type: "START" }), 3);
    const done = simulationReducer(running, { type: "COMPLETE" });
    expect(done).toEqual(simulationSteps(demo).at(-1));
    expect(simulationReducer(done, { type: "RESET" })).toEqual(createSimulation(demo));
  });

  it("refuses to view a state with a different demo", () => {
    expect(() => simulationView(createSimulation(demo), getDemo("demo-recycling"))).toThrow();
  });
});
