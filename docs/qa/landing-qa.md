# Landing Exhibit — Baseline QA

Run date: 2026-09-26 (Asia/Seoul)  
Commit: `0196b125c33d846a4e50953e3526e6aebf861129` (`PM1` baseline)  
Worktree: `landing-qa`

## Integrated QA

Run date: 2026-09-26 (Asia/Seoul)
Commit under test: `16ea235` (`merge: landing motion fix round 1 (Worker B)`)
Server: `pnpm exec next dev -p 3110 --hostname 127.0.0.1`
Runner: `node docs/qa/landing-qa.mjs http://127.0.0.1:3110 /tmp/landing-qa-integrated`

The requested gates were run in order. Typecheck, lint, unit tests, and build all passed; Vitest reported 12 files and 51 tests passed (the two expected malformed-provider `analysis_failed` stderr lines remain). The browser runner covered `1920x1080`, `1440x900`, `1280x800`, and `375x812`, waited 3.1 seconds after scrolling to the bottom and back before each full-page screenshot, and produced 96 checks: 88 passed and 8 failed.

### Static gates

| Gate | Result | Evidence |
| --- | --- | --- |
| `pnpm typecheck` | PASS | `tsc --noEmit` exit 0 |
| `pnpm lint` | PASS | ESLint exit 0 |
| `pnpm test` | PASS | 12 files, 51 tests passed |
| `pnpm build` | PASS | Next.js 16.3.5 production build completed; routes generated |

### Browser PASS/FAIL table

| Check | 1920×1080 | 1440×900 | 1280×800 | 375×812 |
| --- | --- | --- | --- | --- |
| Landing HTTP status | PASS (200) | PASS (200) | PASS (200) | PASS (200) |
| Console/hydration/page errors | PASS | PASS | PASS | PASS |
| Load long tasks ≤ 200ms | PASS (none observed) | PASS (none observed) | PASS (none observed) | PASS (none observed) |
| Load CLS ≤ 0.1 | PASS (0.000) | PASS (0.000) | PASS (0.000) | PASS (0.000) |
| Animations transform/opacity only | **FAIL** (`draw:stroke-dashoffset`) | **FAIL** | **FAIL** | **FAIL** |
| No horizontal overflow | PASS | PASS | PASS | PASS |
| Ten section heading IDs in order | PASS | PASS | PASS | PASS |
| Hero H1 + CTA in first viewport | PASS | PASS | PASS | PASS |
| CTA links point to `/record` | PASS | PASS | PASS | PASS |
| Visible text `DEMO` | PASS | PASS | PASS | PASS |
| Research source links | PASS (3) | PASS (3) | PASS (3) | PASS (3) |
| Persona tabs + panel + arrow keys | PASS (3 tabs) | PASS (3 tabs) | PASS (3 tabs) | PASS (3 tabs) |
| AnalysisTimeline points | PASS (4) | PASS (4) | PASS (4) | PASS (4) |
| Exactly one H1 | PASS | PASS | PASS | PASS |
| Landmark `main` | PASS | PASS | PASS | PASS |
| Images/SVGs labeled or hidden | **FAIL** (one unlabeled SVG) | **FAIL** | **FAIL** | **FAIL** |
| Focus visible on tabs/buttons | PASS (7 targets) | PASS (7 targets) | PASS (7 targets) | PASS (7 targets) |
| Color not sole state signal | PASS (7 semantic states) | PASS | PASS | PASS |
| Document height | PASS (7,593px ≤ 8,600px) | PASS (7,304px) | PASS (7,204px) | PASS (10,706px) |
| Reduced-motion console/page errors | PASS | PASS | PASS | PASS |
| Reduced-motion research metrics | PASS | PASS | PASS | PASS |
| Reduced-motion perspective statement | PASS | PASS | PASS | PASS |
| `/record` regression load | PASS | PASS | PASS | PASS |
| `/result/sample` regression load | PASS | PASS | PASS | PASS |
| `/result/demo-legacy` regression load | PASS | PASS | PASS | PASS |
| `/analyzing/demo-script` regression load | PASS | PASS | PASS | PASS |

### Remaining issues

1. **Animation property violation (all viewports):** `src/components/landing/hero-visual.tsx` uses the `draw` keyframe, which animates SVG `stroke-dashoffset`; the performance sanity check requires animations to be limited to `transform`/`opacity`. This is motion/design-owned and was not rewritten. Proposed fix: Worker B replace the stroke-dashoffset reveal with a transform/opacity compositor-safe treatment, or explicitly document this SVG exception if the visual is intentional.
2. **Decorative SVG accessibility (all viewports):** the connector SVG in `src/components/landing/persona-simulation.tsx` has no `aria-hidden="true"`, `role="img"`, or accessible label. This is landing UI-owned and was not rewritten. Proposed fix: Worker A mark the connector `aria-hidden="true"` because the adjacent tab controls carry its meaning (or provide a meaningful label if it is intended to be exposed).

No other issues were found. The development server was stopped after the browser run.

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
