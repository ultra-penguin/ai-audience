"use client";

import type { ComponentProps, ReactNode } from "react";
import { useResultUiStore } from "@/features/result/result-ui-store";
import { cn } from "@/lib/utils";

/** Numbered chapter heading that gives the result page its report rhythm. */
export function ReportHeading({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-outline-variant/60 pt-8">
      <p aria-hidden className="text-label-md tabular-nums text-primary">
        {String(number).padStart(2, "0")}
      </p>
      <h2 id={id} className="text-headline-xl text-on-surface">
        {title}
      </h2>
      {children && <p className="max-w-2xl text-body-md text-on-surface-variant">{children}</p>}
    </div>
  );
}

/**
 * In-page link to a difficult section. The hash still scrolls without JS; with
 * JS it also opens that section in the reader, even if a persona filter hid it.
 */
export function SectionLink({ sectionId, className, onClick, ...props }: ComponentProps<"a"> & { sectionId: string }) {
  const focusSection = useResultUiStore((s) => s.focusSection);
  return (
    <a
      href={`#${sectionId}`}
      onClick={(e) => {
        focusSection(sectionId);
        onClick?.(e);
      }}
      className={cn("rounded text-label-md text-primary underline-offset-4 hover:underline", className)}
      {...props}
    />
  );
}
