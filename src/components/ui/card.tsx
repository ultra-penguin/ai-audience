import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Quiet surface: use sparingly for a focused task, never as page scaffolding. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/55", className)}
      {...props}
    />
  );
}
