import { cva } from "class-variance-authority";

/**
 * Premium button design system for Godgifted brand.
 *
 * Variants follow a luxury e-commerce pattern:
 *  - primary     : solid forest green with colored brand-shadow (main CTA)
 *  - secondary   : warm stone/cream surface (neutral CTA)
 *  - accent      : warm gold fill with darker gold shadow (promo / featured CTA)
 *  - elevated    : primary + extra depth (hero CTAs)
 *  - soft        : translucent green background (inline / low emphasis)
 *  - outline     : hairline stroke + transparent fill (cancels / tertiary)
 *  - outlineGold : gold border (featured secondary, newsletter CTAs)
 *  - ghost       : transparent, only color on hover (toolbar)
 *  - link        : inline text link
 *  - destructive : standard destructive red
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium " +
  "select-none transition-all duration-[var(--duration-base)] ease-[var(--ease-out-expo)] " +
  "cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 " +
  "outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] " +
  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive " +
  "active:scale-[0.98] will-change-transform",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground " +
          "shadow-[var(--shadow-primary)] " +
          "hover:bg-primary-hover hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5 " +
          "active:bg-primary-active active:translate-y-0",

        elevated:
          "bg-primary text-primary-foreground " +
          "shadow-[var(--shadow-lg)] shadow-primary/30 " +
          "hover:bg-primary-hover hover:shadow-[var(--shadow-xl)] hover:shadow-primary/35 hover:-translate-y-1 " +
          "active:bg-primary-active active:translate-y-0 active:shadow-[var(--shadow-md)]",

        accent:
          "bg-accent text-accent-foreground font-semibold " +
          "shadow-[var(--shadow-accent)] " +
          "hover:bg-accent-hover hover:shadow-[var(--shadow-xl)] hover:shadow-accent/30 hover:-translate-y-0.5 " +
          "active:bg-accent-active active:translate-y-0",

        secondary:
          "bg-secondary text-secondary-foreground border border-transparent " +
          "shadow-[var(--shadow-xs)] " +
          "hover:bg-secondary-hover hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5 " +
          "active:translate-y-0",

        soft:
          "bg-primary-soft text-primary " +
          "hover:bg-primary-soft-hover hover:-translate-y-0.5 " +
          "active:translate-y-0",

        outline:
          "border border-border bg-background text-foreground " +
          "hover:bg-secondary hover:border-border-strong hover:-translate-y-0.5 " +
          "active:translate-y-0",

        outlineGold:
          "border-2 border-accent/70 text-accent bg-background " +
          "hover:bg-accent-soft hover:border-accent hover:text-primary " +
          "hover:-translate-y-0.5 active:translate-y-0",

        ghost:
          "hover:bg-secondary hover:text-foreground dark:hover:bg-accent/50 " +
          "hover:-translate-y-0.5 active:translate-y-0",

        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",

        destructive:
          "bg-destructive text-white " +
          "shadow-[0_2px_8px_-2px_rgba(212,24,61,0.35)] " +
          "hover:bg-destructive-hover hover:-translate-y-0.5 " +
          "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 " +
          "active:translate-y-0",
      },

      size: {
        xs:
          "h-7 rounded-[var(--radius-xs)] gap-1 px-2.5 text-[11px] has-[>svg]:px-2",
        sm:
          "h-9 rounded-[var(--radius-sm)] gap-1.5 px-3.5 text-sm has-[>svg]:px-3",
        default:
          "h-11 rounded-[var(--radius-md)] px-5 text-[0.9375rem] tracking-[-0.01em] has-[>svg]:px-4",
        lg:
          "h-12 rounded-[var(--radius-md)] px-7 text-base font-semibold tracking-[-0.01em] has-[>svg]:px-5",
        xl:
          "h-14 rounded-[var(--radius-lg)] px-8 text-[1.0625rem] font-semibold tracking-[-0.015em] has-[>svg]:px-6",
        icon: "size-9 rounded-[var(--radius-sm)]",
        "icon-sm": "size-8 rounded-[var(--radius-xs)]",
        "icon-lg": "size-11 rounded-[var(--radius-md)]",
        pill: "h-11 rounded-full px-6 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonVariantProps = typeof buttonVariants;

export { buttonVariants };
export type { ButtonVariantProps };
