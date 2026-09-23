import type {
  AnalysisResult,
  AnalysisStatus,
  ApiErrorCode,
  CreatePresentationRequest,
  CreatePresentationResponse,
} from "./types";

/** The four calls the MVP needs. Mock and HTTP implementations share it. */
export interface ApiClient {
  createPresentation(req: CreatePresentationRequest): Promise<CreatePresentationResponse>;
  startAnalysis(presentationId: string): Promise<AnalysisStatus>;
  getAnalysisStatus(presentationId: string): Promise<AnalysisStatus>;
  getResult(presentationId: string): Promise<AnalysisResult>;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | undefined;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
