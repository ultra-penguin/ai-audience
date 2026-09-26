import { describe, expect, it } from "vitest";
import { isApiError } from "@/shared/api/client";
import { AnalysisResultSchema, AnalysisStatusSchema } from "@/shared/api/types";
import { SAMPLE_RESULT } from "@/mocks/sample-result";
import { createMockClient } from "@/mocks/mock-client";
import { DEMO_IDS, getDemo } from "./catalog";
import { createDemoClient, demoStatus } from "./demo-client";

describe("offline demo client", () => {
  const client = createDemoClient();

  it.each(DEMO_IDS)("serves %s as a completed, schema-valid status and result", async (id) => {
    const status = await client.getAnalysisStatus(id);
    expect(AnalysisStatusSchema.parse(status)).toEqual(status);
    expect(status.stage).toBe("completed");
    expect(status.pipeline?.steps?.every((s) => s.state === "done")).toBe(true);
    expect(status.pipeline?.cells).toHaveLength(getDemo(id).result.presentationMap!.sections.length * 3);
    expect(await client.startAnalysis(id)).toEqual(status);

    const result = await client.getResult(id);
    expect(AnalysisResultSchema.parse(result)).toEqual(result);
    expect(result).toEqual(getDemo(id).result);
  });

  it("is deterministic", async () => {
    expect(demoStatus("demo-bfs")).toEqual(demoStatus("demo-bfs"));
    expect(await client.getResult("demo-recycling")).toEqual(await client.getResult("demo-recycling"));
  });

  it("rejects unknown ids and uploads with ApiErrors", async () => {
    await expect(client.getResult("demo-nope")).rejects.toSatisfy((e) => isApiError(e) && e.code === "not_found");
    await expect(client.getAnalysisStatus("sample")).rejects.toSatisfy((e) => isApiError(e) && e.code === "not_found");
    await expect(client.createPresentation({ audio: new Blob(["x"]), mimeType: "audio/webm", durationSec: 10 })).rejects.toSatisfy(
      (e) => isApiError(e) && e.code === "invalid_request",
    );
  });

  it("leaves the existing sample/mock client untouched", async () => {
    const result = await createMockClient().getResult("sample");
    expect(result.title).toBe(SAMPLE_RESULT.title);
  });
});
