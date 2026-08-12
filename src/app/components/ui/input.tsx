import * as React from "react";

import { cn } from "./utils";

/**
 * Premium input component for Godgifted.
 *
 * Visual rules:
 *  - default    : warm-stone filled (high-end form look)
 *  - line       : hairline bottom border (minimal / editorial)
 *  - outline    : thin border with transparent background
 *
 * Focus states use a brand-colored ring + subtle background shift,
 * never a harsh outline. All controls have hover pre-state.
 */

type InputVariant = "default" | "line" | "outline";

const VARIANT_STYLES: Record<InputVariant, string> = {
  default:
    "bg-input-background border border-transparent " +
    "hover:bg-input-background-hover " +
    "focus:bg-background focus:border-ring",

  line:
    "bg-transparent border-b border-border rounded-none px-0 " +
    "hover:border-border-strong " +
    "focus:border-ring focus:border-b-[2px]",

  outline:
    "bg-background border border-border " +
    "hover:border-border-strong " +
    "focus:border-ring",
};

interface InputProps extends React.ComponentProps<"input"> {
  variant?: InputVariant;
}

function Input({ className, variant = "default", type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        "file:text-foreground placeholder:text-foreground-subtle " +
          "selection:bg-primary-soft selection:text-primary " +
          "dark:bg-input/30 " +
          "flex w-full min-w-0 h-11 px-4 py-2.5 text-[0.9375rem] " +
          "rounded-[var(--radius-md)] " +
          "transition-[color,box-shadow,background-color,border-color] " +
          "duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] " +
          "outline-none file:inline-flex file:h-7 file:border-0 " +
          "file:bg-transparent file:text-sm file:font-medium " +
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 " +
          "md:text-sm",
        "focus-visible:ring-ring/25 focus-visible:ring-[3px] focus-visible:shadow-[0_0_0_1px_var(--ring)]/20",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Textarea — matches input visual language with multi-line behavior.
 */
interface TextareaProps extends React.ComponentProps<"textarea"> {
  variant?: InputVariant;
}

function Textarea({ className, variant = "default", ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(
        "file:text-foreground placeholder:text-foreground-subtle " +
          "selection:bg-primary-soft selection:text-primary " +
          "dark:bg-input/30 " +
          "flex w-full min-w-0 min-h-[88px] px-4 py-3 text-[0.9375rem] leading-relaxed " +
          "rounded-[var(--radius-md)] " +
          "transition-[color,box-shadow,background-color,border-color] " +
          "duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] " +
          "outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 " +
          "resize-y",
        "focus-visible:ring-ring/25 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Premium floating-label group. Wrap an <Input /> + <label /> with this
 * for an iOS/Apple-style label that floats above the text on focus.
 *
 * Example:
 *   <InputGroup>
 *     <label htmlFor="email">Email address</label>
 *     <Input id="email" type="email" />
 *   </InputGroup>
 */
function InputGroup({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      data-slot="input-group"
      className={cn("relative group", className)}
    >
      <div className="contents [&>label]:pointer-events-none [&>label]:absolute [&>label]:left-4 [&>label]:top-1/2 [&>label]:-translate-y-1/2 [&>label]:text-sm [&>label]:text-muted-foreground [&>label]:transition-all [&>label]:duration-[var(--duration-base)] [&>label]:ease-[var(--ease-out-expo)] [&>label]:origin-left [&>label]:z-10 [&>label]:bg-transparent [&_input:focus~label]:-translate-y-[170%] [&_input:focus~label]:text-[11px] [&_input:focus~label]:text-primary [&_input:not(:placeholder-shown)~label]:-translate-y-[170%] [&_input:not(:placeholder-shown)~label]:text-[11px] [&_input:not(:placeholder-shown)~label]:text-primary [&_textarea:focus~label]:top-4 [&_textarea:focus~label]:-translate-y-0 [&_textarea:focus~label]:text-[11px] [&_textarea:focus~label]:text-primary [&_textarea:not(:placeholder-shown)~label]:top-4 [&_textarea:not(:placeholder-shown)~label]:-translate-y-0 [&_textarea:not(:placeholder-shown)~label]:text-[11px] [&_textarea:not(:placeholder-shown)~label]:text-primary">
        {children}
      </div>
    </div>
  );
}

export { Input, Textarea, InputGroup };
export type { InputProps, TextareaProps };
