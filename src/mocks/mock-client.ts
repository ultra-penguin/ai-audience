import { ApiError, type ApiClient } from "@/shared/api/client";
import {
  AnalysisResultSchema,
  AnalysisStatusSchema,
  type AnalysisStage,
  type AnalysisStatus,
} from "@/shared/api/types";
import { SAMPLE_RESULT, SAMPLE_RESULT_NO_ISSUES } from "./sample-result";

/**
 * In-browser mock of the analysis backend.
 *
 * Status is derived from the time analysis started, so a page reload keeps
 * progressing (the start time is also encoded in generated ids). Reserved ids:
 *   - "sample"      completed sample result
 *   - "demo-empty"  completed, no difficult sections (empty state)
 *   - "demo-failed" analysis fails once; retry succeeds
 */

const STAGE_TIMELINE: { stage: AnalysisStage; untilMs: number }[] = [
  { stage: "queued", untilMs: 1200 },
  { stage: "transcribing", untilMs: 4500 },
  { stage: "listening", untilMs: 8500 },
  { stage: "synthesizing", untilMs: 11000 },
];
const TOTAL_MS = STAGE_TIMELINE[STAGE_TIMELINE.length - 1].untilMs;
const FAIL_AT_MS = 6000;

type MockRecord = {
  title: string;
  durationSec: number;
  analysisStartedAt?: number;
  failedOnce?: boolean;
};

const records = new Map<string, MockRecord>();
const RESERVED = new Set(["sample", "demo-empty", "demo-failed"]);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

function timestampFromId(id: string): number | undefined {
  const match = /^mock-([0-9a-z]+)-[0-9a-z]+$/.exec(id);
  if (!match) return undefined;
  const ts = parseInt(match[1], 36);
  return Number.isFinite(ts) ? ts : undefined;
}

function assertKnown(id: string) {
  if (!RESERVED.has(id) && !records.has(id) && timestampFromId(id) === undefined) {
    throw new ApiError("not_found", "해당 발표를 찾을 수 없어요.", 404);
  }
}

function stageAt(elapsedMs: number): AnalysisStage {
  for (const { stage, untilMs } of STAGE_TIMELINE) if (elapsedMs < untilMs) return stage;
  return "completed";
}

function computeStatus(id: string): AnalysisStatus {
  if (id === "sample" || id === "demo-empty") {
    return { presentationId: id, stage: "completed", progress: 1, updatedAt: iso(now()) };
  }

  let record = records.get(id);
  if (!record && timestampFromId(id) === undefined) {
    // Reserved demo id opened directly: start its clock on first look.
    record = { title: SAMPLE_RESULT.title, durationSec: SAMPLE_RESULT.durationSec, analysisStartedAt: now() };
    records.set(id, record);
  }
  const startedAt = record?.analysisStartedAt ?? timestampFromId(id) ?? now();
  const elapsed = now() - startedAt;

  if (id === "demo-failed" && !record?.failedOnce && elapsed >= FAIL_AT_MS) {
    return {
      presentationId: id,
      stage: "failed",
      error: { code: "analysis_failed", message: "관중 분석 중 문제가 생겼어요." },
      failedStage: stageAt(FAIL_AT_MS),
      updatedAt: iso(now()),
    };
  }

  return {
    presentationId: id,
    stage: stageAt(elapsed),
    progress: Math.min(1, elapsed / TOTAL_MS),
    updatedAt: iso(now()),
  };
}

export function createMockClient(): ApiClient {
  return {
    async createPresentation({ audio, durationSec, title }) {
      await delay(900);
      if (audio.size === 0) throw new ApiError("invalid_audio", "녹음된 오디오가 비어 있어요.", 400);
      if (durationSec < 5) throw new ApiError("audio_too_short", "분석하기에는 녹음이 너무 짧아요.", 400);

      const createdAt = now();
      const presentationId = `mock-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      records.set(presentationId, { title: title?.trim() || "제목 없는 발표", durationSec });
      return { presentationId, createdAt: iso(createdAt) };
    },

    async startAnalysis(id) {
      await delay(300);
      assertKnown(id);
      const record = records.get(id) ?? { title: SAMPLE_RESULT.title, durationSec: SAMPLE_RESULT.durationSec };
      if (id === "demo-failed" && record.analysisStartedAt !== undefined) record.failedOnce = true;
      record.analysisStartedAt = now();
      records.set(id, record);
      return AnalysisStatusSchema.parse(computeStatus(id));
    },

    async getAnalysisStatus(id) {
      await delay(200);
      assertKnown(id);
      return AnalysisStatusSchema.parse(computeStatus(id));
    },

    async getResult(id) {
      await delay(500);
      assertKnown(id);
      if (computeStatus(id).stage !== "completed") {
        throw new ApiError("result_not_ready", "아직 분석이 끝나지 않았어요.", 409);
      }
      if (id === "demo-empty") return AnalysisResultSchema.parse(SAMPLE_RESULT_NO_ISSUES);

      const record = records.get(id);
      return AnalysisResultSchema.parse({
        ...SAMPLE_RESULT,
        presentationId: id,
        title: record?.title ?? SAMPLE_RESULT.title,
        durationSec: record?.durationSec ?? SAMPLE_RESULT.durationSec,
        analyzedAt: iso(now()),
        isSample: true,
      });
    },
  };
}
