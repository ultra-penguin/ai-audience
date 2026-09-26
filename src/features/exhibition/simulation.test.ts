import { describe, expect, it } from "vitest";
import { PHASE_STEPS, SIMULATION_TIMING, simulationDurationMs, simulationFrame, stepState } from "./simulation";

const T = SIMULATION_TIMING;

describe("exhibition simulation timeline", () => {
  it("hears sections one at a time, in order", () => {
    expect(simulationFrame(0, 4)).toEqual({ phase: "listening", heard: 0, current: 0 });
    expect(simulationFrame(T.sectionMs * 2 + 10, 4)).toEqual({ phase: "listening", heard: 2, current: 2 });
  });

  it("passes through at least three visible states before done", () => {
    const seen = new Set<string>();
    for (let ms = 0; ms <= simulationDurationMs(4); ms += 50) seen.add(simulationFrame(ms, 4).phase);
    expect([...seen]).toEqual(["listening", "comparing", "writing", "done"]);
    expect(PHASE_STEPS.map((s) => s.phase)).toEqual(["listening", "comparing", "writing"]);
  });

  it("marks every section heard once listening ends", () => {
    const f = simulationFrame(T.sectionMs * 4, 4);
    expect(f).toEqual({ phase: "comparing", heard: 4, current: -1 });
    expect(simulationFrame(simulationDurationMs(4), 4).phase).toBe("done");
  });

  it("stays well-defined for odd input", () => {
    expect(simulationFrame(-500, 3).phase).toBe("listening");
    expect(simulationFrame(0, 0)).toEqual({ phase: "listening", heard: 0, current: 0 });
    expect(simulationFrame(Number.MAX_SAFE_INTEGER, 3).phase).toBe("done");
  });

  it("orders step states relative to the current phase", () => {
    expect(stepState("listening", "comparing")).toBe("done");
    expect(stepState("comparing", "comparing")).toBe("active");
    expect(stepState("writing", "comparing")).toBe("pending");
    expect(stepState("writing", "done")).toBe("done");
  });

  it("never exposes a percentage", () => {
    expect(Object.keys(simulationFrame(1000, 4))).not.toContain("progress");
    for (const step of PHASE_STEPS) expect(`${step.label}${step.detail}`).not.toMatch(/%/);
  });
});
