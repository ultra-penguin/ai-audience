import { randomUUID } from "node:crypto";
import type { AnalysisPhase, AnalysisResult, AnalysisStage, PresentationInput, PresentationResponse, PresentationStatus } from "./schemas";

export type AnalysisPipelineSnapshot = {
  steps: Array<{ step: "structure" | "section" | "persona" | "cross_check"; state: "pending" | "running" | "done" | "failed" | "skipped" }>;
  sections: Array<{ id: string; title: string; startSec?: number; endSec?: number; summary?: string; segmentIds?: string[] }>;
  personas: Array<{ id: string; kind: "beginner" | "peer" | "expert"; name: string }>;
  currentSectionId: string | null;
  currentPersonaId: string | null;
  cells: Array<{ sectionId: string; personaId: string; state: "pending" | "running" | "done" | "failed" | "skipped" }>;
  message: string | null;
  insights: Array<{ id: string; text: string; sectionId?: string; personaId?: string }>;
};

export type PresentationCreateInput = PresentationInput & {
  /** Retained only in the server-side repository for STT; never included in API responses. */
  audioBytes?: Uint8Array;
};

export type StoredPresentation = PresentationCreateInput & {
  id: string;
  status: PresentationStatus;
  stage: AnalysisStage;
  failedStage: AnalysisStage | null;
  progress: number;
  phase: AnalysisPhase | null;
  currentSectionId: string | null;
  currentPersonaId: "beginner" | "peer" | "specialist" | null;
  message: string | null;
  pipeline: AnalysisPipelineSnapshot | null;
  createdAt: string;
  updatedAt: string;
  result: AnalysisResult | null;
  error: { code: string; message: string } | null;
};

export interface PresentationRepository {
  create(input: PresentationCreateInput): StoredPresentation;
  get(id: string): StoredPresentation | undefined;
  update(
    id: string,
    patch: Partial<Pick<StoredPresentation, "status" | "stage" | "failedStage" | "progress" | "phase" | "currentSectionId" | "currentPersonaId" | "message" | "pipeline" | "result" | "error" | "updatedAt" | "transcript">>,
  ): StoredPresentation | undefined;
  clear(): void;
}

export class InMemoryPresentationRepository implements PresentationRepository {
  private readonly records = new Map<string, StoredPresentation>();

  create(input: PresentationCreateInput): StoredPresentation {
    const now = new Date().toISOString();
    const record: StoredPresentation = {
      ...input,
      id: randomUUID(),
      status: "uploaded",
      stage: "queued",
      failedStage: null,
      progress: 0,
      phase: null,
      currentSectionId: null,
      currentPersonaId: null,
      message: null,
      pipeline: null,
      createdAt: now,
      updatedAt: now,
      result: null,
      error: null,
    };
    this.records.set(record.id, record);
    return record;
  }

  get(id: string): StoredPresentation | undefined {
    return this.records.get(id);
  }

  update(
    id: string,
    patch: Partial<Pick<StoredPresentation, "status" | "stage" | "failedStage" | "progress" | "phase" | "currentSectionId" | "currentPersonaId" | "message" | "pipeline" | "result" | "error" | "updatedAt" | "transcript">>,
  ): StoredPresentation | undefined {
    const record = this.records.get(id);
    if (!record) return undefined;
    Object.assign(record, { ...patch, updatedAt: new Date().toISOString() });
    return record;
  }

  clear(): void {
    this.records.clear();
  }
}

const globalStore = globalThis as typeof globalThis & { __virtualAudienceRepository?: InMemoryPresentationRepository };
export const presentationRepository = globalStore.__virtualAudienceRepository ?? new InMemoryPresentationRepository();
globalStore.__virtualAudienceRepository = presentationRepository;

export function toPresentationResponse(record: StoredPresentation): PresentationResponse {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    stage: record.stage,
    progress: record.progress,
    durationSeconds: record.durationSeconds,
    transcriptAvailable: Boolean(record.transcript),
    audio: record.audio,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
