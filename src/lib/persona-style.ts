import type { PersonaKind } from "@/shared/api/types";

/** Single source for persona colours (DESIGN (4).md → Persona Badges & Chips). */
export const PERSONA_STYLE: Record<PersonaKind, { label: string; dot: string; chip: string; text: string; rail: string }> = {
  beginner: {
    label: "입문 청중",
    dot: "bg-secondary",
    chip: "bg-secondary-fixed/60 text-on-secondary-fixed",
    text: "text-secondary",
    rail: "border-secondary",
  },
  peer: {
    label: "동료 청중",
    dot: "bg-primary-container",
    chip: "bg-primary-fixed text-on-primary-fixed",
    text: "text-primary",
    rail: "border-primary-container",
  },
  expert: {
    label: "전문 청중",
    dot: "bg-tertiary",
    chip: "bg-tertiary-fixed text-on-tertiary-fixed",
    text: "text-tertiary",
    rail: "border-tertiary",
  },
  decision_maker: {
    label: "의사결정자",
    dot: "bg-neutral-persona",
    chip: "bg-neutral-persona-fixed text-on-neutral-persona-fixed",
    text: "text-neutral-persona",
    rail: "border-neutral-persona",
  },
};
