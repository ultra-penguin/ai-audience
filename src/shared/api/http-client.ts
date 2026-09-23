import type { z } from "zod";
import { ApiError, type ApiClient } from "./client";
import {
  AnalysisResultSchema,
  AnalysisStatusSchema,
  ApiErrorBodySchema,
  CreatePresentationResponseSchema,
} from "./types";

async function request<T>(baseUrl: string, path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, init);
  } catch {
    throw new ApiError("network_error", "서버에 연결할 수 없어요. 네트워크 상태를 확인해 주세요.");
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = ApiErrorBodySchema.safeParse(body);
    if (parsed.success) throw new ApiError(parsed.data.code, parsed.data.message, res.status);
    throw new ApiError(res.status === 404 ? "not_found" : "unknown", `요청이 실패했어요 (${res.status}).`, res.status);
  }

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
