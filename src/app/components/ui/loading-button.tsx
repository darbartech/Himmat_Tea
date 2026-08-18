"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, ButtonProps, buttonVariants } from "./button";
import { cn } from "./utils";
import { type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

export interface LoadingButtonProps
  extends Omit<React.ComponentProps<"button">, "children">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingLabel?: React.ReactNode;
  spinnerClassName?: string;
  spinnerPlacement?: "left" | "right";
  children?: React.ReactNode;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      asChild = false,
      isLoading = false,
      loadingLabel,
      spinnerClassName,
      spinnerPlacement = "left",
      className,
      variant,
      size,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const spinner = (
      <Loader2
        className={cn(
          "h-4 w-4 animate-spin shrink-0",
          spinnerClassName,
        )}
        aria-hidden="true"
      />
    );

    const content = (
      <React.Fragment>
        {isLoading && spinnerPlacement === "left" && spinner}
        {isLoading && loadingLabel !== undefined ? loadingLabel : children}
        {isLoading && spinnerPlacement === "right" && spinner}
      </React.Fragment>
    );

    if (asChild) {
      return (
        <Slot ref={ref} className={className} {...props}>
          {content}
        </Slot>
      );
    }

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {content}
      </Button>
    );
  },
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
export type { ButtonProps as LoadingButtonBaseProps };
