"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { toggleVariants, type ToggleVariantProps } from "./toggle-variants";

interface ToggleProps
  extends React.ComponentProps<typeof TogglePrimitive.Root>,
    VariantProps<ToggleVariantProps> {}

function Toggle({
  className,
  variant,
  size,
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle };
export type { ToggleProps };
