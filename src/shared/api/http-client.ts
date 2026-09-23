import { z } from "zod";
import { ApiError, safeErrorMessage, type ApiClient } from "./client";
import {
  AnalysisResultSchema,
  AnalysisStatusSchema,
  ApiErrorCodeSchema,
  CreatePresentationResponseSchema,
  type ApiErrorCode,
} from "./types";

const ErrorEnvelopeSchema = z.union([
  z.object({ error: z.object({ code: z.string() }) }).transform((b) => b.error.code),
  z.object({ code: z.string() }).transform((b) => b.code),
]);

/** Map any non-2xx response to an ApiError with a known code and a safe, user-facing message. */
function toApiError(status: number, body: unknown): ApiError {
  const rawCode = ErrorEnvelopeSchema.safeParse(body);
  const known = rawCode.success ? ApiErrorCodeSchema.safeParse(rawCode.data) : undefined;
  const code: ApiErrorCode = known?.success ? known.data : status === 404 ? "not_found" : "unknown";
  const message = code === "unknown" ? `요청이 실패했어요 (${status}).` : safeErrorMessage(code);
  return new ApiError(code, message, status);
}

async function request<T>(baseUrl: string, path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, init);
  } catch {
    throw new ApiError("network_error", "서버에 연결할 수 없어요. 네트워크 상태를 확인해 주세요.");
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) throw toApiError(res.status, body);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("unknown", "서버 응답 형식이 예상과 달라요.", res.status);
  }
  return parsed.data;
}

export function createHttpClient(baseUrl: string): ApiClient {
  const base = baseUrl.replace(/\/$/, "");
  const id = encodeURIComponent;

  return {
    createPresentation({ audio, mimeType, durationSec, title }) {
      const form = new FormData();
      const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("audio", audio, `presentation.${ext}`);
      form.append("durationSeconds", String(Math.round(durationSec)));
      if (title) form.append("title", title);
      return request(base, "/presentations", CreatePresentationResponseSchema, { method: "POST", body: form });
    },
    startAnalysis(presentationId) {
      return request(base, `/presentations/${id(presentationId)}/analyze`, AnalysisStatusSchema, { method: "POST" });
    },
    getAnalysisStatus(presentationId) {
      return request(base, `/presentations/${id(presentationId)}/status`, AnalysisStatusSchema, {
        cache: "no-store",
      });
    },
    getResult(presentationId) {
      return request(base, `/presentations/${id(presentationId)}/result`, AnalysisResultSchema);
    },
  };
}
