import type {
  AnalysisPipeline,
  AnalysisStage,
  AnalysisStatus,
  AnalysisStep,
  MapSection,
  PersonaKind,
  StepState,
} from "@/shared/api/types";
import { seatStateFor, type SeatState } from "@/lib/audience";

/**
 * Everything on the analysis screen is derived from the reported status only.
 * No timers, no estimates: a step is "running" only when the backend says so.
 */

export type TimelineItem = { key: string; label: string; detail: string; state: StepState };

const LEGACY_PIPELINE: { stage: AnalysisStage; label: string; detail: string }[] = [
  { stage: "queued", label: "녹음 받기", detail: "업로드한 녹음을 확인하고 있어요." },
  { stage: "transcribing", label: "말한 내용 옮겨 적기", detail: "발표 음성을 문장 단위로 옮겨 적고 있어요." },
  { stage: "listening", label: "관중이 듣는 중", detail: "각 관중이 자기 관점에서 발표를 따라가고 있어요." },
  { stage: "synthesizing", label: "막힌 지점 정리", detail: "어디서, 왜 막혔는지와 고칠 방법을 정리하고 있어요." },
];

export const STEP_COPY: Record<AnalysisStep, { label: string; detail: string }> = {
  structure: { label: "발표 구조 파악", detail: "발표를 몇 개의 흐름으로 나눠 발표 지도를 그리고 있어요." },
  section: { label: "구간별로 읽기", detail: "구간마다 무엇을 말하려 했는지 정리하고 있어요." },
  persona: { label: "관중별로 듣기", detail: "관중이 구간마다 따라왔는지 하나씩 확인하고 있어요." },
  cross_check: { label: "관중 반응 교차 확인", detail: "관중끼리 엇갈린 곳을 비교해 가장 큰 발견을 고르고 있어요." },
};

const STEP_ORDER: AnalysisStep[] = ["structure", "section", "persona", "cross_check"];

/** True when the backend reports Phase 4 step metadata. */
export function hasStepDetail(pipeline: AnalysisPipeline | null | undefined): pipeline is AnalysisPipeline {
  return Boolean(pipeline?.steps && pipeline.steps.length > 0);
}

function legacyTimeline(status: AnalysisStatus | undefined): TimelineItem[] {
  const stage = status?.stage;
  const failed = stage === "failed";
  const current = !stage ? 0 : stage === "completed" ? LEGACY_PIPELINE.length : LEGACY_PIPELINE.findIndex((s) => s.stage === stage);
  const failedAt = failed ? LEGACY_PIPELINE.findIndex((s) => s.stage === status?.failedStage) : -1;
  return LEGACY_PIPELINE.map((s, i) => ({
    key: s.stage,
    label: s.label,
    detail: s.detail,
    state:
      stage === "completed" || (!failed && i < current) || (failed && i < failedAt)
        ? "done"
        : failed && i === failedAt
          ? "failed"
          : !failed && i === current
            ? "running"
            : "pending",
  }));
}

/** Upload and transcription come from `stage`; the analysis steps come from `pipeline.steps`. */
export function analysisTimeline(status: AnalysisStatus | undefined): TimelineItem[] {
  const pipeline = status?.pipeline;
  if (!status || !hasStepDetail(pipeline)) return legacyTimeline(status);

  const { stage } = status;
  const reported = new Map(pipeline.steps!.map((s) => [s.step, s.state]));
  const anyStepStarted = [...reported.values()].some((state) => state !== "pending");
  // Position of the upload/transcription pair: 0 queued, 1 transcribing, 2 past both, -1 unknown.
  const at = (() => {
    const s = stage === "failed" ? status.failedStage : stage;
    if (s === "queued") return 0;
    if (s === "transcribing") return 1;
    if (s || anyStepStarted) return 2;
    return -1;
  })();
  const pre: TimelineItem[] = LEGACY_PIPELINE.slice(0, 2).map((s, i) => ({
    key: s.stage,
    label: s.label,
    detail: s.detail,
    state: i < at ? "done" : i === at ? (stage === "failed" ? "failed" : "running") : "pending",
  }));

  const steps: TimelineItem[] = STEP_ORDER.map((step) => {
    let state = reported.get(step) ?? "pending";
    if (stage === "completed" && state !== "skipped") state = "done";
    // A step left "running" when the whole pipeline failed is where it stopped.
    if (stage === "failed" && state === "running") state = "failed";
    return { key: step, ...STEP_COPY[step], state };
  });
  return [...pre, ...steps];
}

export function runningItem(items: TimelineItem[]): TimelineItem | undefined {
  return items.find((i) => i.state === "running");
}

/** Sections in speaking order when times are known, otherwise as reported. */
export function orderedSections(sections: MapSection[] | undefined): MapSection[] {
  if (!sections) return [];
  const timed = sections.every((s) => s.startSec !== undefined);
  return timed ? [...sections].sort((a, b) => a.startSec! - b.startSec!) : sections;
}

export function cellStateFor(pipeline: AnalysisPipeline, sectionId: string, personaId: string): StepState | undefined {
  return pipeline.cells?.find((c) => c.sectionId === sectionId && c.personaId === personaId)?.state;
}

/**
 * The persona the backend says is listening right now, or undefined. A
 * `currentPersonaId` only counts while the persona step (or one of its cells) is running.
 */
export function activePersonaId(status: AnalysisStatus | undefined): string | undefined {
  const pipeline = status?.pipeline;
  if (!pipeline || status.stage === "failed" || status.stage === "completed") return undefined;
  const runningCell = pipeline.cells?.find((c) => c.state === "running");
  const personaStepRunning = pipeline.steps?.some((s) => s.step === "persona" && s.state === "running");
  if (pipeline.currentPersonaId && (personaStepRunning || runningCell?.personaId === pipeline.currentPersonaId)) {
    return pipeline.currentPersonaId;
  }
  return runningCell?.personaId;
}

/**
 * Per-seat state. With persona detail each seat follows its own reported
 * progress; otherwise every seat mirrors the stage, as in Phase 3.
 */
export function seatStatesFor(status: AnalysisStatus | undefined): Partial<Record<PersonaKind, SeatState>> | SeatState {
  const pipeline = status?.pipeline;
  if (!status || !pipeline?.personas?.length || !hasStepDetail(pipeline)) return seatStateFor(status?.stage);
  if (status.stage === "failed") return "stopped";
  if (status.stage === "completed" || status.stage === "synthesizing") return "listened";

  const active = activePersonaId(status);
  const personaStep = pipeline.steps!.find((s) => s.step === "persona")?.state;
  const states: Partial<Record<PersonaKind, SeatState>> = {};
  for (const p of pipeline.personas) {
    const cells = pipeline.cells?.filter((c) => c.personaId === p.id) ?? [];
    const allDone = cells.length > 0 && cells.every((c) => c.state === "done" || c.state === "skipped");
    states[p.kind] =
      p.id === active ? "listening" : allDone || personaStep === "done" ? "listened" : "waiting";
  }
  return states;
}
