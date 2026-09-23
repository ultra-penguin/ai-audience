import { AlertCircle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NoticeProps = {
  tone?: "info" | "error";
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Inline status block with explicit recovery guidance. Errors are announced. */
export function Notice({ tone = "info", title, children, actions, className }: NoticeProps) {
  const Icon = tone === "error" ? AlertCircle : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl p-4 sm:p-5",
        tone === "error" ? "bg-error-container/60 text-on-surface" : "bg-surface-container-low text-on-surface",
        className,
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", tone === "error" ? "text-error" : "text-primary")} />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-label-lg">{title}</p>
        {children && <div className="text-body-md text-on-surface-variant">{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>
    </div>
  );
}
