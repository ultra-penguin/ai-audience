import type { AnalysisResult } from "@/shared/api/types";
import { PersonaChip } from "@/components/ui/persona-chip";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn } from "@/lib/utils";
import { UNDERSTANDING } from "./summary-section";

export function PersonaFeedbackGrid({ result }: { result: AnalysisResult }) {
  const byId = new Map(result.personas.map((p) => [p.id, p]));

  return (
    <section aria-labelledby="personas-title" className="space-y-5">
      <div className="space-y-1">
        <h2 id="personas-title" className="text-headline-lg text-on-surface">
          관중별 반응
        </h2>
        <p className="text-body-md text-on-surface-variant">같은 발표를 들은 관중이 각자 무엇을 가져가고, 어디서 놓쳤는지예요.</p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {result.personaFeedback.map((f) => {
          const persona = byId.get(f.personaId);
          if (!persona) return null;
          const u = UNDERSTANDING[f.understanding];
          return (
            <li
              key={f.personaId}
              className={cn(
                "flex flex-col gap-4 rounded-xl border-l-[3px] bg-surface-container-lowest p-5 ring-1 ring-outline-variant/40",
                PERSONA_STYLE[persona.kind].rail,
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PersonaChip persona={persona} />
                <span className={cn("inline-flex items-center gap-1.5 text-label-md", u.tone)}>
                  <u.icon aria-hidden className="size-3.5" />
                  <span className="text-on-surface-variant">{u.label}</span>
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">{persona.description}</p>
              <p className="text-body-lg text-on-surface">“{f.reaction}”</p>

              <div className="mt-auto grid gap-3 sm:grid-cols-2">
                <FactList title="놓친 곳" items={f.whereLost} empty="막힌 곳 없이 따라왔어요." />
                <FactList title="전달된 것" items={f.whatLanded} empty="—" />
              </div>
              <p className="text-body-sm text-on-surface-variant">
                핵심 메시지: {f.receivedKeyMessage ? "알아들었어요" : "놓쳤어요"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FactList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-3">
      <p className="text-label-md text-on-surface-variant">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-body-md text-on-surface">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-body-md text-on-surface-variant">{empty}</p>
      )}
    </div>
  );
}
