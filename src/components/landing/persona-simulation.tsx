// CONTRACT STUB — owned by Worker B (motion). Keep the export name and no-prop API.
import { DEMO } from "./landing-data";

/** Section 06: one presentation reaching several listeners; selecting a listener shows their reaction. */
export function PersonaSimulation() {
  return (
    <section aria-labelledby="simulation-title" className="border-t border-outline-variant/60 py-16">
      <h2 id="simulation-title" className="text-headline-xl text-on-surface">하나의 발표, 서로 다른 관중</h2>
      <ul className="mt-6 space-y-3">
        {DEMO.personaFeedback.map((f) => (
          <li key={f.personaId} className="text-body-md text-on-surface">“{f.reaction}”</li>
        ))}
      </ul>
    </section>
  );
}
