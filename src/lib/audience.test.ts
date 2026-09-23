import { describe, expect, it } from "vitest";
import { AUDIENCE_SEATS, seatStateFor } from "./audience";
import { FIXED_PERSONAS } from "./presentations/analysis";

describe("audience seats", () => {
  it("mirrors the backend's fixed personas", () => {
    expect(AUDIENCE_SEATS.map((s) => s.name)).toEqual(FIXED_PERSONAS.map((p) => p.name));
  });

  it("only listens while the backend reports the listening stage", () => {
    expect(seatStateFor(undefined)).toBe("waiting");
    expect(seatStateFor("queued")).toBe("waiting");
    expect(seatStateFor("transcribing")).toBe("waiting");
    expect(seatStateFor("listening")).toBe("listening");
    expect(seatStateFor("synthesizing")).toBe("listened");
    expect(seatStateFor("completed")).toBe("listened");
    expect(seatStateFor("failed")).toBe("stopped");
  });
});
