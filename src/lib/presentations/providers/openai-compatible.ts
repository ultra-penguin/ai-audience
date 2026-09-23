import type { AudioMetadata } from "../schemas";
import {
  ProviderError,
  type JsonLanguageModelProvider,
  type JsonLanguageModelRequest,
  type SpeechToTextProvider,
  type SpeechSegment,
  type SpeechToTextResult,
} from "./types";

const DEFAULT_STT_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_LLM_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_STT_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_LLM_MODEL = "gpt-4o-mini";

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeProviderMessage(kind: "speech-to-text" | "language-model", status?: number): string {
  if (status === 429) return "The analysis provider is rate limited. Please try again later.";
  if (status === 401 || status === 403) return `The ${kind} provider rejected the configured credentials.`;
  return `The ${kind} provider could not complete the request.`;
}

async function readJson(response: Response, kind: "speech-to-text" | "language-model"): Promise<unknown> {
  if (response.ok) {
    try {
      return await response.json();
    } catch (cause) {
      throw new ProviderError("analysis_provider_error", `The ${kind} provider returned an invalid response.`, { cause });
    }
  }

  const code = response.status === 429 ? "analysis_rate_limited" : "analysis_provider_error";
  throw new ProviderError(code, safeProviderMessage(kind, response.status), { status: response.status });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  kind: "speech-to-text" | "language-model",
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new ProviderError("analysis_timeout", `The ${kind} provider timed out.`);
    }
    throw new ProviderError("analysis_provider_error", `The ${kind} provider could not be reached.`, { cause });
  } finally {
    clearTimeout(timeout);
  }
}

function bytesToBlob(audio: Uint8Array, metadata: AudioMetadata): Blob {
  // Copy the bytes into an ArrayBuffer-backed view so Node's Blob constructor does not
  // retain a mutable buffer owned by the in-memory repository.
  const copy = new Uint8Array(audio.byteLength);
  copy.set(audio);
  return new Blob([copy.buffer], { type: metadata.mimeType });
}

export class OpenAICompatibleSpeechToTextProvider implements SpeechToTextProvider {
  constructor(
    private readonly apiKey: string,
    private readonly options: { endpoint?: string; model?: string; timeoutMs: number },
  ) {}

  async transcribe(input: { audio: Uint8Array; metadata: AudioMetadata }): Promise<SpeechToTextResult> {
    if (input.audio.byteLength === 0) {
      throw new ProviderError("analysis_empty_transcript", "The uploaded audio is empty.");
    }

    const form = new FormData();
    form.append("file", bytesToBlob(input.audio, input.metadata), input.metadata.filename || "presentation-audio");
    form.append("model", this.options.model ?? DEFAULT_STT_MODEL);
    form.append("response_format", "verbose_json");
    const response = await fetchWithTimeout(
      this.options.endpoint ?? DEFAULT_STT_URL,
      { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}` }, body: form },
      this.options.timeoutMs,
      "speech-to-text",
    );
    const body = await readJson(response, "speech-to-text");
    if (!body || typeof body !== "object") {
      throw new ProviderError("analysis_provider_error", "The speech-to-text provider returned an invalid response.");
    }
    const record = body as { text?: unknown; segments?: unknown };
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) throw new ProviderError("analysis_empty_transcript", "The recording did not contain recognizable speech.");

    const segments = Array.isArray(record.segments)
      ? record.segments.flatMap((segment): SpeechSegment[] => {
          if (!segment || typeof segment !== "object") return [];
          const item = segment as { start?: unknown; end?: unknown; text?: unknown };
          if (typeof item.text !== "string" || !item.text.trim()) return [];
          const start = Math.max(0, asFiniteNumber(item.start, 0));
          const end = Math.max(start + 0.1, asFiniteNumber(item.end, start + 0.1));
          return [{ startSeconds: start, endSeconds: end, text: item.text.trim() }];
        })
      : undefined;
    return { text, segments: segments?.length ? segments : undefined };
  }
}

export class OpenAICompatibleLanguageModelProvider implements JsonLanguageModelProvider {
  constructor(
    private readonly apiKey: string,
    private readonly options: { endpoint?: string; model?: string; timeoutMs: number },
  ) {}

  async completeJson(input: JsonLanguageModelRequest): Promise<string> {
    const response = await fetchWithTimeout(
      this.options.endpoint ?? DEFAULT_LLM_URL,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.options.model ?? DEFAULT_LLM_MODEL,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
        }),
      },
      this.options.timeoutMs,
      "language-model",
    );
    const body = await readJson(response, "language-model");
    if (!body || typeof body !== "object") {
      throw new ProviderError("analysis_provider_error", "The language-model provider returned an invalid response.");
    }
    const choices = (body as { choices?: unknown }).choices;
    const content = Array.isArray(choices) && choices[0] && typeof choices[0] === "object"
      ? (choices[0] as { message?: { content?: unknown } }).message?.content
      : undefined;
    if (typeof content !== "string" || !content.trim()) {
      throw new ProviderError("analysis_provider_error", "The language-model provider returned no content.");
    }
    return content.trim();
  }
}
