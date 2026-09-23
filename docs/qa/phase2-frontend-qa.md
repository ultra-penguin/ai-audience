# Phase 2 frontend — real-result compatibility & browser QA

Date: 2026-09-23 · Branch `phase2-frontend` (based on `PM1` e6e3a92)

## Compatibility bugs found (HTTP mode was broken end-to-end before this change)

| Problem | Effect | Fix |
|---|---|---|
| `/status` sends `"error": null`; schema had `.optional()` | Every status poll failed zod parse → "분석 상태를 불러오지 못했어요" | `error`/`failedStage` are `.nullish()`; `error.code` accepts any string |
| Backend errors are `{ error: { code, message } }`; client parsed a flat body | Every API error became `unknown`/`not_found`; `result_not_ready`, `presentation_not_found`, `analysis_failed` never reached the UI | `http-client` unwraps the envelope (flat body still accepted); unknown codes → `unknown` |
| Raw server messages shown in UI (English, could include provider details) | Upload + failed-analysis notices leaked developer text | `safeErrorMessage(code)` gives Korean copy; raw messages never displayed |
| Not-found only checked `not_found` | Backend's `presentation_not_found` showed the generic network error | `isNotFoundError()` covers both |
| 409/422 were retried 3× | Slow error screens | `shouldRetryQuery` skips not-found / not-ready / failed |
| `/result` for failed analysis (422) showed "network" copy | No path to retry | New notice linking back to `/analyzing/[id]` for retry |
| Transcript dropped by the normaliser | No transcript in UI | Optional `transcript { text, segments[] }` in the shared contract, mapped in `frontend-result.ts`, shown in a collapsed "전체 스크립트 보기" section |

## Browser QA (headless Chromium, `NEXT_PUBLIC_API_MODE=http`, `next dev -p 3107`)

Script: `docs/qa/phase2-browser-qa.mjs`. Microphone is Chromium's **fake device (synthetic tone)**, so this
checks the UI/API flow only, **not** real speech recognition. The backend provider is still the mock provider,
so results are correctly labelled as samples.

1. `/record` → start → pause → resume → finish (≈13 s) → "관중 분석 시작": `POST /presentations` 201, `/analyze` 202 → `/analyzing/[id]` → auto-redirect to `/result/[id]`; "샘플 결과예요" label shown, 3 personas, transcript expands. ✅
2. `/analyzing/does-not-exist` → "이 발표를 찾을 수 없어요" (no pointless reload button); `/result/does-not-exist` → "결과를 찾을 수 없어요". ✅
3. Uploaded but not analysed → `/result/[id]` → "아직 분석이 끝나지 않았어요" + link to progress. ✅
4. Status forced to `failed` with a provider code + secret-looking message (route interception) → failure notice with safe copy, raw message hidden → "다시 분석하기" → polling resumes → result. ✅
5. Result request aborted (network) → "결과를 불러오지 못했어요" → "다시 불러오기" → result. ✅
6. 375 px width: no horizontal scroll on result. ✅ No console errors.

## Observations for backend (not changed here)

- Mock provider segments are a fixed 12 s each, so the timeline (0:24+) exceeds the recorded duration (13 s).
- Mock content and the default title "Untitled presentation" are English in a Korean UI.
- Mapper sets `intendedKeyMessage` = `summary.overview` and `strengths: []`; real provider output has no key-message field yet.
- Status `failedStage` is always `"failed"` (the stage is overwritten on failure), so the UI cannot mark which step broke.
