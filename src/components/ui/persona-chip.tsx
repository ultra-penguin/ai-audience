import type { Persona } from "@/shared/api/types";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn } from "@/lib/utils";

export function PersonaChip({ persona, className }: { persona: Persona; className?: string }) {
  const style = PERSONA_STYLE[persona.kind];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-md", style.chip, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
      {persona.name}
    </span>
  );
}
