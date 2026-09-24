import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAICompatibleLanguageModelProvider } from "./openai-compatible";

describe("OpenAI-compatible language model provider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("caps completion tokens and retries a short-lived rate limit", async () => {
    const responses = [
      new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429, headers: { "retry-after": "0" } }),
      Response.json({ choices: [{ message: { content: '{"ok":true}' } }] }),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string") {
        const body = JSON.parse(init.body) as { max_completion_tokens?: number };
        expect(body.max_completion_tokens).toBe(321);
      }
      return responses.shift()!;
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAICompatibleLanguageModelProvider("secret", { timeoutMs: 1_000 });
    await expect(provider.completeJson({ system: "system", user: "user", maxCompletionTokens: 321 })).resolves.toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
