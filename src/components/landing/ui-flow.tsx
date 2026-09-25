import { ArrowDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FlowStep = { key: string; content: ReactNode; emphasis?: boolean };

/** A vertical chain of steps joined by arrows — used to contrast two ways of reading a talk. */
export function UiFlow({ steps, label, tone = "default" }: { steps: FlowStep[]; label: string; tone?: "default" | "muted" }) {
  return (
    <ol aria-label={label} className="flex flex-col items-stretch">
      {steps.map((step, i) => (
        <li key={step.key} className="flex flex-col items-center">
          {i > 0 && (
            <ArrowDown aria-hidden className={cn("my-1 size-4 sm:my-1.5", tone === "muted" ? "text-outline" : "text-primary")} />
          )}
          <div
            className={cn(
              "w-full rounded-xl px-4 py-2.5 text-center sm:py-3 text-body-lg break-keep",
              tone === "muted" ? "bg-surface-container-low text-on-surface-variant" : "bg-surface-container-lowest text-on-surface ring-1 ring-outline-variant/70",
              step.emphasis && tone !== "muted" && "bg-primary text-on-primary ring-0",
            )}
          >
            {step.content}
          </div>
        </li>
      ))}
    </ol>
  );
}
