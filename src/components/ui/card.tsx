import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Elevated panel: surface-container-lowest + soft shadow, rounded-xl. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl bg-surface-container-lowest shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-outline-variant/40", className)}
      {...props}
    />
  );
}
