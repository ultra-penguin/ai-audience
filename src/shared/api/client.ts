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

export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && (error.code === "not_found" || error.code === "presentation_not_found");
}

/** Errors that will not change by simply asking again. */
const NON_RETRYABLE: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  "not_found",
  "presentation_not_found",
  "result_not_ready",
  "analysis_failed",
  "invalid_request",
]);

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return !(isApiError(error) && NON_RETRYABLE.has(error.code)) && failureCount < 2;
}

/**
 * User-facing copy per error code. Server messages are developer-oriented
 * (English, may include internal details), so the UI never shows them raw.
 */
const SAFE_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  not_found: "해당 발표를 찾을 수 없어요.",
  presentation_not_found: "해당 발표를 찾을 수 없어요.",
  invalid_audio: "녹음된 오디오를 읽을 수 없어요.",
  empty_audio: "녹음된 오디오가 비어 있어요.",
  audio_required: "녹음된 오디오가 비어 있어요.",
  audio_too_large: "녹음 파일이 너무 커요. 25MB 이하로 줄여 주세요.",
  audio_too_short: "분석하기에는 녹음이 너무 짧아요.",
  unsupported_audio_type: "이 브라우저의 녹음 형식은 아직 지원하지 않아요.",
  unsupported_media_type: "이 브라우저의 녹음 형식은 아직 지원하지 않아요.",
  invalid_multipart: "녹음을 올리지 못했어요.",
  invalid_title: "발표 제목은 120자 이하로 적어 주세요.",
  invalid_duration: "녹음 길이를 확인할 수 없어요.",
  upload_failed: "녹음을 올리지 못했어요.",
  analysis_failed: "관중 분석 중 문제가 생겼어요.",
  analysis_timeout: "관중 분석 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.",
  analysis_rate_limited: "분석 요청이 많아요. 잠시 후 다시 시도해 주세요.",
  analysis_empty_transcript: "발표 음성에서 말소리를 확인하지 못했어요.",
  analysis_provider_error: "관중 분석 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
  analysis_invalid_output: "관중 분석 결과를 정리하지 못했어요. 다시 시도해 주세요.",
  analysis_in_progress: "이미 분석하고 있어요.",
  analysis_already_complete: "이미 분석이 끝났어요.",
  result_not_ready: "아직 분석이 끝나지 않았어요.",
  network_error: "서버에 연결할 수 없어요. 네트워크 상태를 확인해 주세요.",
};

export function safeErrorMessage(code: string | undefined): string {
  return SAFE_MESSAGES[code as ApiErrorCode] ?? "요청을 처리하지 못했어요.";
}
