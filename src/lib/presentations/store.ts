import { randomUUID } from "node:crypto";
import type { AnalysisResult, AnalysisStage, PresentationInput, PresentationResponse, PresentationStatus } from "./schemas";

export type StoredPresentation = PresentationInput & {
  id: string;
  status: PresentationStatus;
  stage: AnalysisStage;
  progress: number;
  createdAt: string;
  updatedAt: string;
  result: AnalysisResult | null;
  error: { code: string; message: string } | null;
};

export interface PresentationRepository {
  create(input: PresentationInput): StoredPresentation;
  get(id: string): StoredPresentation | undefined;
  update(id: string, patch: Partial<Pick<StoredPresentation, "status" | "stage" | "progress" | "result" | "error" | "updatedAt">>): StoredPresentation | undefined;
  clear(): void;
}

export class InMemoryPresentationRepository implements PresentationRepository {
  private readonly records = new Map<string, StoredPresentation>();

  create(input: PresentationInput): StoredPresentation {
    const now = new Date().toISOString();
    const record: StoredPresentation = {
      ...input,
      id: randomUUID(),
      status: "uploaded",
      stage: "queued",
      progress: 0,
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
    patch: Partial<Pick<StoredPresentation, "status" | "stage" | "progress" | "result" | "error" | "updatedAt">>,
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
