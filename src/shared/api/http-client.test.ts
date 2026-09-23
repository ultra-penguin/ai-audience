import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as createRoute from "@/app/api/presentations/route";
import * as analyzeRoute from "@/app/api/presentations/[id]/analyze/route";
import * as resultRoute from "@/app/api/presentations/[id]/result/route";
import * as statusRoute from "@/app/api/presentations/[id]/status/route";
import { MockPresentationAnalysisProvider, setAnalysisProvider } from "@/lib/presentations/analysis";
import type { AnalysisResult as BackendAnalysisResult } from "@/lib/presentations/schemas";
import { presentationRepository } from "@/lib/presentations/store";
import { ApiError, isNotFoundError, type ApiClient } from "./client";
import { createHttpClient } from "./http-client";

const BASE = "http://test.local/api";

/** Route real Next route handlers through `fetch`, so the HTTP client is tested against the actual backend payloads. */
async function routeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const path = new URL(request.url).pathname.replace(/^\/api/, "");
  const match = /^\/presentations\/([^/]+)\/(analyze|status|result)$/.exec(path);
  if (path === "/presentations" && request.method === "POST") return createRoute.POST(request);
  if (!match) return new Response("not found", { status: 404 });
  const context = { params: Promise.resolve({ id: decodeURIComponent(match[1]!) }) };
  if (match[2] === "analyze" && request.method === "POST") return analyzeRoute.POST(request, context);
  if (match[2] === "status") return statusRoute.GET(request, context);
  return resultRoute.GET(request, context);
}

const audio = () => new Blob([new Uint8Array(64)], { type: "audio/webm" });

async function waitForTerminal(client: ApiClient, id: string) {
  for (let i = 0; i < 50; i++) {
    const status = await client.getAnalysisStatus(id);
    if (status.stage === "completed" || status.stage === "failed") return status;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("analysis did not finish");
}

/** Shaped like a real STT + persona provider result (mode "provider", Korean content). */
function providerResult(): BackendAnalysisResult {
  return {
    version: "1.0",
    mode: "provider",
    disclaimer: "AI가 생성한 피드백이에요.",
    generatedAt: "2026-09-23T06:00:00.000Z",
    summary: { overview: "핵심 메시지는 전달됐지만 지표 설명에서 초보 청중이 멈췄어요.", comprehensionScore: 70, attentionScore: 80, keyMessageScore: 65 },
    transcript: {
      text: "안녕하세요. 오늘은 MAPE 지표로 수요 예측 성능을 설명하겠습니다. 결론적으로 폐기 비용이 줄어듭니다.",
      segments: [
        { id: "seg-1", startSeconds: 0, endSeconds: 3.2, text: "안녕하세요.", difficulty: "low", issue: null },
        { id: "seg-2", startSeconds: 3.2, endSeconds: 11.5, text: "오늘은 MAPE 지표로 수요 예측 성능을 설명하겠습니다.", difficulty: "high", issue: "MAPE 정의 없음" },
        { id: "seg-3", startSeconds: 11.5, endSeconds: 16, text: "결론적으로 폐기 비용이 줄어듭니다.", difficulty: "medium", issue: null },
      ],
    },
    personas: [
      { id: "beginner", name: "비전공 대학생", perspective: "배경지식이 없는 청중", comprehensionScore: 48, attentionScore: 70, reaction: "MAPE가 뭔지 몰라서 그다음을 놓쳤어요.", blockers: ["MAPE 용어"], questions: ["MAPE가 낮으면 좋은 건가요?"] },
      { id: "peer", name: "동료 발표자", perspective: "발표 흐름을 보는 청중", comprehensionScore: 76, attentionScore: 82, reaction: "흐름은 좋았어요.", blockers: [], questions: [] },
      { id: "specialist", name: "데이터 전문가", perspective: "방법론을 보는 청중", comprehensionScore: 81, attentionScore: 77, reaction: "기준선 비교가 빠졌어요.", blockers: ["기준선 없음"], questions: ["기존 방식 대비 얼마나 좋아졌나요?"] },
    ],
    difficultSections: [{ segmentId: "seg-2", reason: "지표 이름만 나오고 의미가 설명되지 않았어요." }],
    missingExplanations: ["MAPE를 한 문장으로 정의하기"],
    improvements: [
      { id: "imp-1", title: "지표를 일상어로", problem: "용어가 낯설어요.", action: "MAPE를 '평균적으로 몇 % 틀리는지'로 바꿔 말하세요.", example: "예측이 평균 8% 정도 빗나가요.", sourceSegmentIds: ["seg-2"] },
    ],
  };
}

describe("HTTP client against the real API routes", () => {
  let client: ApiClient;

  beforeEach(() => {
    presentationRepository.clear();
    setAnalysisProvider(new MockPresentationAnalysisProvider());
    vi.stubGlobal("fetch", vi.fn(routeFetch));
    vi.spyOn(console, "error").mockImplementation(() => {});
    client = createHttpClient(BASE);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uploads, polls to completion and parses a real-shaped 3-persona result with its transcript", async () => {
    setAnalysisProvider({ analyze: async () => providerResult() });

    const { presentationId } = await client.createPresentation({ audio: audio(), mimeType: "audio/webm", durationSec: 16, title: "수요 예측 제안" });
    const started = await client.startAnalysis(presentationId);
    expect(started.stage).toBe("queued");

    const status = await waitForTerminal(client, presentationId);
    expect(status.stage).toBe("completed");

    const result = await client.getResult(presentationId);
    expect(result.isSample).toBe(false);
    expect(result.title).toBe("수요 예측 제안");
    expect(result.durationSec).toBe(16);
    expect(result.personas.map((p) => p.kind)).toEqual(["beginner", "peer", "expert"]);
    expect(result.personaFeedback.find((f) => f.personaId === "p-beginner")?.understanding).toBe("lost");
    expect(result.difficultSections[0]).toMatchObject({ id: "seg-2", startSec: 3.2, severity: "high" });
    expect(result.transcript?.segments.map((s) => s.id)).toEqual(["seg-1", "seg-2", "seg-3"]);
    expect(result.transcript?.text).toContain("MAPE");
  });

  it("labels mock-provider results as samples", async () => {
    const { presentationId } = await client.createPresentation({ audio: audio(), mimeType: "audio/webm", durationSec: 30 });
    await client.startAnalysis(presentationId);
    await waitForTerminal(client, presentationId);
    const result = await client.getResult(presentationId);
    expect(result.isSample).toBe(true);
    expect(result.transcript?.segments.length).toBeGreaterThan(0);
  });

  it("reports a failed pipeline with a safe message and recovers on retry", async () => {
    setAnalysisProvider({ analyze: async () => { throw new Error("provider exploded: sk-secret"); } });
    const { presentationId } = await client.createPresentation({ audio: audio(), mimeType: "audio/webm", durationSec: 30 });
    await client.startAnalysis(presentationId);

    const failed = await waitForTerminal(client, presentationId);
    expect(failed.stage).toBe("failed");
    expect(failed.error?.code).toBe("analysis_failed");

    const resultError = await client.getResult(presentationId).catch((e: unknown) => e);
    expect(resultError).toBeInstanceOf(ApiError);
    expect((resultError as ApiError).code).toBe("analysis_failed");
    expect((resultError as ApiError).message).not.toMatch(/secret|Analysis/);

    setAnalysisProvider({ analyze: async () => providerResult() });
    await client.startAnalysis(presentationId);
    expect((await waitForTerminal(client, presentationId)).stage).toBe("completed");
    expect((await client.getResult(presentationId)).personas).toHaveLength(3);
  });

  it("unwraps the backend error envelope into known codes with Korean messages", async () => {
    const missing = await client.getAnalysisStatus("nope").catch((e: unknown) => e);
    expect(isNotFoundError(missing)).toBe(true);
    expect((missing as ApiError).code).toBe("presentation_not_found");
    expect((missing as ApiError).message).toBe("해당 발표를 찾을 수 없어요.");

    const { presentationId } = await client.createPresentation({ audio: audio(), mimeType: "audio/webm", durationSec: 30 });
    const notReady = await client.getResult(presentationId).catch((e: unknown) => e);
    expect((notReady as ApiError).code).toBe("result_not_ready");

    const badType = await client
      .createPresentation({ audio: new Blob([new Uint8Array(8)], { type: "video/x-flv" }), mimeType: "video/x-flv", durationSec: 30 })
      .catch((e: unknown) => e);
    expect((badType as ApiError).code).toBe("unsupported_audio_type");
    expect((badType as ApiError).message).not.toContain("x-flv");
  });

  it("normalises unknown codes, non-JSON bodies and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "provider_quota", message: "Quota exceeded for key abc" } }, { status: 503 })));
    const unknown = await client.getResult("x").catch((e: unknown) => e);
    expect((unknown as ApiError).code).toBe("unknown");
    expect((unknown as ApiError).message).not.toContain("abc");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })));
    expect(await client.getResult("x").catch((e: ApiError) => e.code)).toBe("unknown");

    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await client.getResult("x").catch((e: ApiError) => e.code)).toBe("network_error");
  });
});
