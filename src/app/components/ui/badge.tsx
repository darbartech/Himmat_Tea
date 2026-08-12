import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/**
 * Premium badge system for Godgifted.
 *
 * Variants:
 *  - primary   : solid green (status / category default)
 *  - accent    : solid gold (featured / bestseller)
 *  - soft      : tinted green (low-emphasis status)
 *  - softAccent: tinted gold (promo / limited)
 *  - secondary : stone surface (neutral meta)
 *  - outline   : hairline border (editorial tag)
 *  - outlineAccent: gold hairline (premium tag)
 *  - success   : green tint + text (positive state)
 *  - warning   : amber tint + text (caution state)
 *  - destructive: red (negative state)
 *
 * Sizes: sm (compact), md (default), lg (hero badges)
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap shrink-0 w-fit " +
    "font-medium tracking-tight " +
    "[&>svg]:size-3 gap-1 [&>svg]:pointer-events-none " +
    "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] " +
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 " +
    "transition-[color,background-color,border-color,box-shadow] " +
    "duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] " +
    "overflow-hidden",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-primary text-primary-foreground " +
          "[a&]:hover:bg-primary-hover shadow-[0_1px_2px_rgba(45,90,61,0.25)]",

        accent:
          "border-transparent bg-accent text-accent-foreground font-semibold " +
          "[a&]:hover:bg-accent-hover shadow-[0_1px_2px_rgba(200,169,110,0.35)]",

        soft:
          "border border-primary/12 bg-primary-soft text-primary " +
          "[a&]:hover:bg-primary-soft-hover [a&]:hover:border-primary/25",

        softAccent:
          "border border-accent/20 bg-accent-soft text-[#9c7b35] font-medium " +
          "[a&]:hover:bg-accent-soft-hover [a&]:hover:border-accent/35",

        secondary:
          "border-transparent bg-secondary text-secondary-foreground " +
          "[a&]:hover:bg-secondary-hover",

        outline:
          "border border-border bg-background text-foreground " +
          "[a&]:hover:bg-secondary [a&]:hover:border-border-strong",

        outlineAccent:
          "border border-accent/50 bg-background text-accent font-semibold " +
          "[a&]:hover:bg-accent-soft [a&]:hover:border-accent [a&]:hover:text-primary",

        success:
          "border border-success/20 bg-success-soft text-success font-medium " +
          "[a&]:hover:bg-success/15",

        warning:
          "border border-warning/20 bg-warning-soft text-warning font-medium " +
          "[a&]:hover:bg-warning/15",

        destructive:
          "border-transparent bg-destructive text-white font-medium " +
          "[a&]:hover:bg-destructive-hover " +
          "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 " +
          "shadow-[0_1px_2px_rgba(212,24,61,0.25)]",
      },
      size: {
        sm: "h-5 rounded-[var(--radius-xs)] px-2 text-[10.5px] uppercase tracking-wider [&>svg]:size-[12px]",
        md: "h-6 rounded-[var(--radius-sm)] px-2.5 text-[11.5px] [&>svg]:size-3",
        lg: "h-7 rounded-[var(--radius-md)] px-3.5 text-xs font-semibold [&>svg]:size-3.5",
        pill: "h-6 rounded-full px-3 text-[11.5px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  /**
   * Optional dot indicator on the left side of the badge.
   * Applies a small colored circle matching the variant.
   */
  withDot?: boolean;
}

function Badge({
  className,
  variant,
  size,
  asChild = false,
  withDot = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  const dotColors: Record<string, string> = {
    primary: "bg-primary-foreground",
    accent: "bg-accent-foreground",
    soft: "bg-primary",
    softAccent: "bg-accent",
    secondary: "bg-foreground",
    outline: "bg-foreground",
    outlineAccent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-white",
  };

  const content = (
    <>
      {withDot && (
        <span
          aria-hidden
          className={cn("inline-block size-1.5 rounded-full", dotColors[variant ?? "primary"])}
        />
      )}
      {children}
    </>
  );

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
