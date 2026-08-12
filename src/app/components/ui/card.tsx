import * as React from "react";

import { cn } from "./utils";

/**
 * Premium card surface system for Godgifted.
 *
 * Variant patterns:
 *  - default     : clean white card with subtle border and shadow-xs
 *  - elevated    : strong shadow-lg card with hover lift (featured cards)
 *  - soft        : background-subtle fill with transparent border
 *  - outline     : hairline border, no fill (minimal aesthetic)
 *  - interactive : default + hover lift + pointer cursor (clickable cards)
 *
 * Radius is tied to the design token system via --radius-xl.
 * Inner padding / sections are spaced consistently.
 */

type CardVariant = "default" | "elevated" | "soft" | "outline" | "interactive";

const CARD_VARIANTS: Record<CardVariant, string> = {
  default:
    "bg-card text-card-foreground border border-border rounded-[var(--radius-xl)] " +
    "shadow-[var(--shadow-xs)]",

  elevated:
    "bg-card text-card-foreground border border-border rounded-[var(--radius-2xl)] " +
    "shadow-[var(--shadow-md)] " +
    "hover:shadow-[var(--shadow-xl)] hover:-translate-y-1 hover:border-border-strong " +
    "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)]",

  soft:
    "bg-background-subtle text-foreground border border-transparent rounded-[var(--radius-xl)]",

  outline:
    "bg-transparent text-foreground border border-border rounded-[var(--radius-xl)]",

  interactive:
    "bg-card text-card-foreground border border-border rounded-[var(--radius-xl)] " +
    "shadow-[var(--shadow-xs)] cursor-pointer group " +
    "hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 hover:border-primary/30 " +
    "active:translate-y-0 active:shadow-[var(--shadow-sm)] " +
    "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)]",
};

interface CardProps extends React.ComponentProps<"div"> {
  variant?: CardVariant;
}

function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(CARD_VARIANTS[variant], "flex flex-col gap-6 overflow-hidden", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("leading-none tracking-[-0.01em]", className)}
      style={{ fontFamily: "'Playfair Display', serif" }}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-[0.9375rem] leading-relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 pt-2 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

/**
 * Decorative divider strip — a thin gold/green accent line to tuck above or inside cards
 * for a high-end jewelry-like touch.
 */
function CardAccent({
  color = "accent",
  className,
  ...props
}: React.ComponentProps<"div"> & { color?: "accent" | "primary" | "gradient" }) {
  const styles = {
    accent: "bg-accent",
    primary: "bg-primary",
    gradient: "bg-gradient-to-r from-primary via-accent to-primary",
  }[color];

  return (
    <div
      data-slot="card-accent"
      aria-hidden
      className={cn("h-[3px] w-full", styles, className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardAccent,
};
export type { CardProps, CardVariant };
