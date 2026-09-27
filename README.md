# AI 가상 관중 발표 리뷰어

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand · Zod.
Product brief: `PRODUCT.md`; visual tokens: `DESIGN (4).md`.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing + sample feedback preview |
| `/record` | MediaRecorder recording: start / pause / resume / finish, playback, upload |
| `/analyzing/[id]` | Polls pipeline stages. With optional `status.pipeline` detail it shows structure → section → persona → cross-check, a persona × section grid, the current section/persona and insight cards — only what the backend reports. Without it the Phase 3 stage list is used. Demo ids: `demo-failed`, `demo-legacy` |
| `/result/[id]` | Report: opening insight → biggest discovery + presentation map/heatmap/audience splits (only when `discovery`/`presentationMap`/`audienceHeatmap` exist) → persona voices → difficult-section reader (select/highlight) → fixes with before/after rewrites → missing explanations/examples |

## Deployment metadata

Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://example.com`) so Open Graph/Twitter image URLs are absolute. Without it Next.js falls back to the Vercel deployment URL, or `http://localhost:3000` elsewhere.

## Frontend API layer

- Contract: `src/shared/api/types.ts` (Zod schemas + endpoint payloads).
- `src/shared/api/index.ts` picks mock by default; `NEXT_PUBLIC_API_MODE=http` plus `NEXT_PUBLIC_API_BASE_URL` switches to HTTP.
- Components use `src/features/presentation/queries.ts` rather than calling endpoints directly.
- Mock results are explicitly labelled as sample data and include demo empty/failure states.

## Backend API

`POST /api/presentations` accepts multipart audio (WebM, Ogg, WAV, MP3, M4A, or MP4; up to 25 MB) and returns an uploaded presentation.

`POST /api/presentations/:id/analyze` starts asynchronous analysis. Poll `GET /api/presentations/:id/status` until complete, then call `GET /api/presentations/:id/result`.

Errors use `{ "error": { "code": "...", "message": "...", "details": ... } }` where details are present.

### Analysis providers

The backend keeps `MockPresentationAnalysisProvider` as the development fallback. By default Phase 2 is configured for Groq's OpenAI-compatible API: `openai/gpt-oss-120b` for persona analysis and multilingual `whisper-large-v3-turbo` for speech-to-text. Set one server-only `GROQ_API_KEY` to enable both; if it is missing, local development safely stays in mock mode. `STT_PROVIDER` and `LLM_PROVIDER` accept `groq`, `openai`, or `openai-compatible`. `STT_BASE_URL`, `LLM_BASE_URL`, `STT_MODEL`, `LLM_MODEL`, `LLM_REASONING_EFFORT`, and `ANALYSIS_TIMEOUT_MS` are optional server-only overrides.

Required server-only variables for real analysis:

- `STT_PROVIDER=groq`, `LLM_PROVIDER=groq`
- `GROQ_API_KEY` (or separate `STT_API_KEY` and `LLM_API_KEY`)

The upload repository retains audio bytes in memory for STT while exposing only safe audio metadata through API responses. A restart discards bytes and all presentation data, consistent with the MVP storage limitation. Real analysis always uses exactly three fixed perspectives: 비전공 관중, 일반 관중, 전문가 관중; each raw LLM response is Zod-validated and malformed JSON is retried once. Groq documents `whisper-large-v3-turbo` as multilingual and exposes a free-tier upload limit, but its published price is $0.04/hour; it is not an unlimited zero-cost model.

## Storage note

The MVP uses an in-memory presentation repository so the frontend can be integrated without a database or object store. Data and upload metadata are lost on restart and are not suitable for multi-instance production deployment; durable storage is a follow-up.

## State

- Zustand: recording UI state and result persona filter.
- TanStack Query: upload/start mutation, status polling, and result retrieval.
