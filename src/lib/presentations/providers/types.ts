import type { AudioMetadata } from "../schemas";

export type SpeechSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type SpeechToTextResult = {
  text: string;
  segments?: SpeechSegment[];
};

export interface SpeechToTextProvider {
  transcribe(input: { audio: Uint8Array; metadata: AudioMetadata }): Promise<SpeechToTextResult>;
}

export type JsonLanguageModelRequest = {
  system: string;
  user: string;
};

export interface JsonLanguageModelProvider {
  completeJson(input: JsonLanguageModelRequest): Promise<string>;
}

export type ProviderErrorCode =
  | "analysis_timeout"
  | "analysis_rate_limited"
  | "analysis_provider_error"
  | "analysis_empty_transcript"
  | "analysis_invalid_output";

/** Safe, user-facing provider failure. It intentionally never stores response bodies or credentials. */
export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ProviderError";
    this.status = options?.status;
  }

  readonly status: number | undefined;
}
