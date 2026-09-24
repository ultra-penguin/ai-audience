import { ApiError, type ApiClient } from "@/shared/api/client";
import {
  AnalysisResultSchema,
  AnalysisStatusSchema,
  type AnalysisPipeline,
  type AnalysisStage,
  type AnalysisStatus,
  type AnalysisStep,
  type StepState,
} from "@/shared/api/types";
import { SAMPLE_RESULT, SAMPLE_RESULT_LEGACY, SAMPLE_RESULT_NO_ISSUES } from "./sample-result";

/**
 * In-browser mock of the analysis backend.
 *
 * Status is derived from the time analysis started, so a page reload keeps
 * progressing (the start time is also encoded in generated ids). Reserved ids:
 *   - "sample"      completed sample result
 *   - "demo-empty"  completed, no difficult sections (empty state)
 *   - "demo-failed" analysis fails once; retry succeeds
 *   - "demo-legacy" Phase 3 status/result shape without pipeline detail
 */

// Phase 4 steps run inside "listening" (structure → section → persona) and "synthesizing" (cross_check).
const SECTIONS = SAMPLE_RESULT.presentationMap!.sections;
const PERSONAS = SAMPLE_RESULT.personas;
const T = {
  transcribing: 1200,
  structure: 4500,
  section: 5700,
  persona: 5700 + SECTIONS.length * 450,
  crossCheck: 5700 + SECTIONS.length * 450 + PERSONAS.length * SECTIONS.length * 450,
};
const CELL_MS = 450;

const STAGE_TIMELINE: { stage: AnalysisStage; untilMs: number }[] = [
  { stage: "queued", untilMs: T.transcribing },
  { stage: "transcribing", untilMs: T.structure },
  { stage: "listening", untilMs: T.crossCheck },
  { stage: "synthesizing", untilMs: T.crossCheck + 2200 },
];
const TOTAL_MS = STAGE_TIMELINE[STAGE_TIMELINE.length - 1].untilMs;
const FAIL_AT_MS = T.section + 2 * CELL_MS;
type MockRecord = {
  title: string;
  durationSec: number;
  analysisStartedAt?: number;
  failedOnce?: boolean;
};

const records = new Map<string, MockRecord>();
const RESERVED = new Set(["sample", "demo-empty", "demo-failed", "demo-legacy"]);

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

/**
 * What a real Phase 4 backend would report at `elapsedMs`. Insights come from
 * sample heatmap cells that have finished, so nothing appears before it is "heard".
 */
function pipelineAt(elapsedMs: number, failed = false): AnalysisPipeline | null {
  if (elapsedMs < T.structure) return null;
  const order: AnalysisStep[] = ["structure", "section", "persona", "cross_check"];
  const starts = [T.structure, T.section, T.persona, T.crossCheck];
  const steps = order.map((step, i) => {
    const state: StepState = elapsedMs >= (starts[i + 1] ?? Infinity) ? "done" : elapsedMs >= starts[i] ? "running" : "pending";
    return { step, state: failed && state === "running" ? ("failed" as const) : state };
  });
  const structureDone = elapsedMs >= T.section;
  const sections = structureDone
    ? SECTIONS.map(({ id, title, startSec, endSec, summary }) => ({ id, title, startSec, endSec, summary }))
    : undefined;

  let currentSectionId: string | null = null;
  let currentPersonaId: string | null = null;
  let message = "발표를 문장 흐름에 따라 나누고 있어요.";
  if (elapsedMs >= T.section && elapsedMs < T.persona) {
    const section = SECTIONS[Math.floor((elapsedMs - T.section) / CELL_MS)];
    currentSectionId = section.id;
    message = `‘${section.title}’ 구간이 무엇을 말하려는지 읽고 있어요.`;
  }

  const cellIndex = Math.floor((elapsedMs - T.persona) / CELL_MS);
  const cells =
    elapsedMs >= T.persona
      ? PERSONAS.flatMap((p, pi) =>
          SECTIONS.map((sec, si) => {
            const i = pi * SECTIONS.length + si;
            const state: StepState = elapsedMs >= T.crossCheck || i < cellIndex ? "done" : i === cellIndex ? "running" : "pending";
            return { sectionId: sec.id, personaId: p.id, state };
          }),
        )
      : undefined;
  if (elapsedMs >= T.persona && elapsedMs < T.crossCheck) {
    const persona = PERSONAS[Math.floor(cellIndex / SECTIONS.length)];
    const section = SECTIONS[cellIndex % SECTIONS.length];
    currentPersonaId = persona.id;
    currentSectionId = section.id;
    message = `${persona.name}이 ‘${section.title}’ 구간을 듣고 있어요.`;
  }
  if (elapsedMs >= T.crossCheck) message = "세 관중의 반응을 구간별로 맞대어 보고, 엇갈린 곳을 정리하고 있어요.";

  const finished = new Set(cells?.filter((c) => c.state === "done").map((c) => `${c.sectionId}:${c.personaId}`));
  const insights = SAMPLE_RESULT.audienceHeatmap!.cells.filter(
    (c) => c.reception !== "clear" && c.evidence && finished.has(`${c.sectionId}:${c.personaId}`),
  ).map((c) => ({ id: `ins-${c.sectionId}-${c.personaId}`, text: c.evidence!, sectionId: c.sectionId, personaId: c.personaId }));

  return {
    steps,
    sections,
    personas: PERSONAS.map(({ id, kind, name }) => ({ id, kind, name })),
    currentSectionId: failed ? null : currentSectionId,
    currentPersonaId: failed ? null : currentPersonaId,
    cells,
    message: failed ? null : message,
    insights,
  };
}

function computeStatus(id: string): AnalysisStatus {
  if (id === "sample" || id === "demo-empty") {
    return { presentationId: id, stage: "completed", progress: 1, pipeline: pipelineAt(TOTAL_MS), updatedAt: iso(now()) };
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
      pipeline: pipelineAt(FAIL_AT_MS, true),
      updatedAt: iso(now()),
    };
  }

  return {
    presentationId: id,
    stage: stageAt(elapsed),
    progress: Math.min(1, elapsed / TOTAL_MS),
    pipeline: id === "demo-legacy" ? undefined : pipelineAt(Math.min(elapsed, TOTAL_MS)),
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
      if (id === "demo-legacy") return AnalysisResultSchema.parse(SAMPLE_RESULT_LEGACY);

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
