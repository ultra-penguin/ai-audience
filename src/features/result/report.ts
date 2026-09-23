import type { AnalysisResult, DifficultSection } from "@/shared/api/types";

const SEVERITY_RANK: Record<DifficultSection["severity"], number> = { high: 0, medium: 1, low: 2 };

/** Reading order: as the talk was given. */
export function sectionsByTime(sections: DifficultSection[]): DifficultSection[] {
  return [...sections].sort((a, b) => a.startSec - b.startSec);
}

/** Fix order: the priority section first, then by severity, then by time. */
export function sectionsByFixOrder(sections: DifficultSection[], priorityId?: string): DifficultSection[] {
  return [...sections].sort(
    (a, b) =>
      Number(b.id === priorityId) - Number(a.id === priorityId) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.startSec - b.startSec,
  );
}

export function sectionsHeardBy(sections: DifficultSection[], personaId: string): DifficultSection[] {
  return sections.filter((s) => s.reactions.some((r) => r.personaId === personaId));
}

/** The words the audience stumbled on, for the "before" side of a rewrite. */
export function stumbleText(section: DifficultSection): string {
  const highlight = section.highlight?.trim();
  return highlight && section.transcript.includes(highlight) ? highlight : section.transcript;
}

/**
 * Some producers fill the key message with the overview sentence; repeating
 * the headline as a quote adds nothing, so only show a distinct message.
 */
export function distinctKeyMessage(summary: AnalysisResult["summary"]): string | null {
  const message = summary.intendedKeyMessage.trim();
  return message && message !== summary.headline.trim() ? message : null;
}

/** Selected section, falling back to the priority section, then the first one. */
export function resolveSelected(
  visible: DifficultSection[],
  selectedId: string | null,
  priorityId?: string,
): DifficultSection | undefined {
  return visible.find((s) => s.id === selectedId) ?? visible.find((s) => s.id === priorityId) ?? visible[0];
}
