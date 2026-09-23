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
| `/analyzing/[id]` | Polls pipeline stages, failure + retry |
| `/result/[id]` | Summary → first fix → persona reactions → difficult sections → missing explanations/examples |

## Frontend API layer

- Contract: `src/shared/api/types.ts` (Zod schemas + endpoint payloads).
- `src/shared/api/index.ts` picks mock by default; `NEXT_PUBLIC_API_MODE=http` plus `NEXT_PUBLIC_API_BASE_URL` switches to HTTP.
- Components use `src/features/presentation/queries.ts` rather than calling endpoints directly.
- Mock results are explicitly labelled as sample data and include demo empty/failure states.

## Backend API

`POST /api/presentations` accepts multipart audio (WebM, Ogg, WAV, MP3, M4A, or MP4; up to 25 MB) and returns an uploaded presentation.

`POST /api/presentations/:id/analyze` starts asynchronous analysis. Poll `GET /api/presentations/:id/status` until complete, then call `GET /api/presentations/:id/result`.

Errors use `{ "error": { "code": "...", "message": "...", "details": ... } }` where details are present.

The default `PresentationAnalysisProvider` is an explicitly labelled mock provider. Replace it with STT/persona adapters that return the Zod-validated `AnalysisResult` shape for production AI analysis.

## Storage note

The MVP uses an in-memory presentation repository so the frontend can be integrated without a database or object store. Data and upload metadata are lost on restart and are not suitable for multi-instance production deployment; durable storage is a follow-up.

## State

- Zustand: recording UI state and result persona filter.
- TanStack Query: upload/start mutation, status polling, and result retrieval.
