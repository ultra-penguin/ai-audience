# Landing Exhibit — Baseline QA

Run date: 2026-09-26 (Asia/Seoul)  
Commit: `0196b125c33d846a4e50953e3526e6aebf861129` (`PM1` baseline)  
Worktree: `landing-qa`

## Baseline gates

| Gate | Result | Notes |
| --- | --- | --- |
| `pnpm typecheck` | PASS | `tsc --noEmit` completed successfully. |
| `pnpm lint` | PASS | ESLint completed successfully. |
| `pnpm test` | PASS | 11 files, 49 tests passed. Two expected `analysis_failed` stderr lines are emitted by tests that verify malformed provider output handling. |
| `pnpm build` | PASS | Next.js 16.3.5 production build completed; routes generated successfully. |

## Browser run

The reusable runner is `docs/qa/landing-qa.mjs` and has no repository dependency. It loads `playwright-core` with `createRequire` from the provided npx cache and launches the provided Chromium headless-shell executable.

```sh
node docs/qa/landing-qa.mjs http://127.0.0.1:3107 /tmp/landing-qa-baseline
```

The requested `pnpm dev -- -p 3107 --hostname 127.0.0.1` form was rejected by the installed pnpm/Next argument forwarding (`-p` was interpreted as a project directory). The equivalent server command used for this run was:

```sh
pnpm exec next dev -p 3107 --hostname 127.0.0.1
```

Screenshots were saved to `/tmp/landing-qa-baseline/` for all four viewports: `1920x1080`, `1440x900`, `1280x800`, and `375x812`.

## PASS/FAIL table

The runner executed 60 checks: 48 passed and 12 failed. The same three baseline failures occurred at each viewport and are expected because the current PersonaSimulation, AnalysisTimeline, and ResultDemo files are contract stubs owned by the parallel UI/motion workers.

| Check | 1920×1080 | 1440×900 | 1280×800 | 375×812 |
| --- | --- | --- | --- | --- |
| Landing HTTP status | PASS | PASS | PASS | PASS |
| Zero console errors/page errors (including hydration warnings) | PASS | PASS | PASS | PASS |
| No horizontal overflow | PASS | PASS | PASS | PASS |
| Ten section heading IDs present and in page order | PASS | PASS | PASS | PASS |
| Hero H1 and CTA visible in first viewport | PASS | PASS | PASS | PASS |
| CTA links point to `/record` | PASS | PASS | PASS | PASS |
| Visible text `DEMO` | **FAIL — expected** | **FAIL — expected** | **FAIL — expected** | **FAIL — expected** |
| Research source links present (3) | PASS | PASS | PASS | PASS |
| PersonaSimulation tab contract | **FAIL — expected: `role="tablist"` missing** | **FAIL — expected** | **FAIL — expected** | **FAIL — expected** |
| AnalysisTimeline point contract | **FAIL — expected: 0 points / 0 detail** | **FAIL — expected** | **FAIL — expected** | **FAIL — expected** |
| Reduced-motion console/page errors | PASS | PASS | PASS | PASS |
| Reduced-motion metrics `85.4%` and `95.5%` immediately visible | PASS | PASS | PASS | PASS |
| Reduced-motion perspective final statement visible | PASS | PASS | PASS | PASS |
| `/result/sample` loads without console/page errors | PASS | PASS | PASS | PASS |
| `/record` loads without console/page errors | PASS | PASS | PASS | PASS |

## Expected baseline failures

- `DEMO` is absent because `src/components/landing/result-demo.tsx` is still the Worker A contract stub.
- PersonaSimulation has no `role="tablist"`, `role="tab"`, `aria-selected`, or `role="tabpanel"` interaction contract yet; it is still the Worker B contract stub.
- AnalysisTimeline has no `data-testid="timeline-points"`, `aria-pressed` buttons, or `data-testid="timeline-detail"` contract yet; it is still the Worker B contract stub.

These failures are intentionally reported by the runner and cause a non-zero exit until the parallel UI/motion implementations land. All non-interactive baseline checks and both secondary routes are clean.
