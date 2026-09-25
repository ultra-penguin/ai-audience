import { describe, expect, it } from "vitest";
import { DEMO_MOMENTS } from "./landing-data";
import { defaultMomentIndex, momentSummary } from "./motion-demo";

describe("landing timeline copy", () => {
  it("opens on the first moment where a listener wavered", () => {
    const i = defaultMomentIndex(DEMO_MOMENTS);
    expect(DEMO_MOMENTS[i]!.wavered).toBeGreaterThan(0);
    expect(DEMO_MOMENTS.slice(0, i).every((m) => m.wavered === 0)).toBe(true);
  });

  it("computes 'N명 중 M명' from the data, never a score", () => {
    for (const m of DEMO_MOMENTS) {
      const text = momentSummary(m);
      expect(text).toContain(`${m.listeners.length}명`);
      if (m.wavered > 0) expect(text).toContain(`${m.wavered}명이`);
      expect(text).not.toMatch(/%|점/);
    }
  });
});
