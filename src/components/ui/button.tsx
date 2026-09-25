import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** shadcn-style button, restyled to DESIGN (4).md → Buttons. */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-label-lg transition-[background-color,color,transform,box-shadow] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary-container text-on-primary shadow-[0_1px_2px_rgba(29,78,216,0.18)] hover:bg-primary hover:shadow-[0_3px_8px_rgba(29,78,216,0.18)]",
        secondary: "bg-surface-container text-on-surface hover:bg-surface-container-high",
        outline: "bg-transparent text-on-surface ring-1 ring-outline-variant/80 hover:bg-surface-container-low",
        ghost: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        danger: "bg-error text-on-error hover:bg-on-error-container",
      },
      size: {
        sm: "h-9 px-3 text-label-md",
        md: "h-11 px-4",
        lg: "h-12 px-6",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
