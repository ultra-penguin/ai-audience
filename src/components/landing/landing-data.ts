import { CircleAlert, CircleCheck, CircleDashed, GraduationCap, Laptop, UserRound } from "lucide-react";
import type { PersonaKind, Reception } from "@/shared/api/types";
import { SAMPLE_RESULT } from "@/mocks/sample-result";

/**
 * Everything the landing page demonstrates comes from the labeled sample report
 * (`/result/sample`), so the exhibit and the product never tell different stories.
 */
export const DEMO = SAMPLE_RESULT;

export const PERSONA_ICON: Record<PersonaKind, typeof UserRound> = {
  beginner: UserRound,
  peer: GraduationCap,
  expert: Laptop,
  decision_maker: UserRound,
};

/** Reception is always icon + text; color only reinforces it. */
export const RECEPTION_META: Record<Reception, { label: string; icon: typeof CircleCheck; tone: string; chip: string }> = {
  clear: { label: "이해했어요", icon: CircleCheck, tone: "text-secondary", chip: "bg-secondary-fixed/45 text-on-secondary-fixed" },
  partial: { label: "일부 놓쳤어요", icon: CircleDashed, tone: "text-tertiary", chip: "bg-tertiary-fixed/70 text-on-tertiary-fixed" },
  lost: { label: "막혔어요", icon: CircleAlert, tone: "text-error", chip: "bg-error-container text-on-error-container" },
};

export type DemoListener = {
  personaId: string;
  kind: PersonaKind;
  name: string;
  description: string;
  reception: Reception;
  evidence?: string;
};

export type DemoMoment = {
  id: string;
  title: string;
  summary: string;
  startSec: number;
  endSec: number;
  listeners: DemoListener[];
  /** Listeners whose understanding wavered here (lost or partial). */
  wavered: number;
};

const cells = DEMO.audienceHeatmap?.cells ?? [];

export const DEMO_MOMENTS: DemoMoment[] = (DEMO.presentationMap?.sections ?? []).map((section) => {
  const listeners = DEMO.personas.map((persona) => {
    const cell = cells.find((c) => c.sectionId === section.id && c.personaId === persona.id);
    return {
      personaId: persona.id,
      kind: persona.kind,
      name: persona.name,
      description: persona.description,
      reception: cell?.reception ?? "clear",
      evidence: cell?.evidence,
    };
  });
  return {
    id: section.id,
    title: section.title,
    summary: section.summary ?? "",
    startSec: section.startSec ?? 0,
    endSec: section.endSec ?? section.startSec ?? 0,
    listeners,
    wavered: listeners.filter((l) => l.reception !== "clear").length,
  };
});

/** The sample's first section where listeners split — the story the hero and result demo tell. */
export const DEMO_FOCUS = DEMO_MOMENTS.find((m) => m.listeners.some((l) => l.reception === "lost")) ?? DEMO_MOMENTS[0]!;

export const DEMO_ISSUE = DEMO.difficultSections.find((s) => s.id === DEMO.summary.priorityFixSectionId) ?? DEMO.difficultSections[0]!;
