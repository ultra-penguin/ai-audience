import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One eyebrow, one message: every landing section leads with a single idea. */
export function SectionIntro({
  id,
  eyebrow,
  title,
  children,
  align = "start",
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <div className={cn("max-w-3xl space-y-3", align === "center" && "mx-auto text-center")}>
      <p className="text-label-lg text-primary">{eyebrow}</p>
      <h2
        id={id}
        className="text-[1.875rem] font-semibold leading-[1.18] tracking-[-0.03em] text-on-surface text-balance break-keep sm:text-[2.5rem] 2xl:text-[2.875rem]"
      >
        {title}
      </h2>
      {children && (
        <p className={cn("max-w-2xl text-body-lg text-on-surface-variant break-keep sm:text-body-xl", align === "center" && "mx-auto")}>{children}</p>
      )}
    </div>
  );
}
