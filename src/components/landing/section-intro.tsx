import type { ReactNode } from "react";

/** One eyebrow, one message: every landing section leads with a single idea. */
export function SectionIntro({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-label-lg text-primary">{eyebrow}</p>
      <h2 id={id} className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-on-surface text-balance sm:text-[2.75rem]">
        {title}
      </h2>
      {children && <p className="max-w-2xl text-body-xl text-on-surface-variant">{children}</p>}
    </div>
  );
}
