// CONTRACT STUB — owned by Worker B (motion). Keep the export name and no-prop API.
import { formatDuration } from "@/lib/utils";
import { DEMO_MOMENTS } from "./landing-data";

/** Section 07: the talk's timeline; selecting a point shows each listener's reaction there. */
export function AnalysisTimeline() {
  return (
    <section aria-labelledby="timeline-title" className="border-t border-outline-variant/60 py-16">
      <h2 id="timeline-title" className="text-headline-xl text-on-surface">반응은 발표의 특정 순간에 연결됩니다</h2>
      <ol className="mt-6 space-y-2">
        {DEMO_MOMENTS.map((m) => (
          <li key={m.id} className="text-body-md text-on-surface">
            {formatDuration(m.startSec)} {m.title} · 관중 {m.wavered}명이 흔들림
          </li>
        ))}
      </ol>
    </section>
  );
}
