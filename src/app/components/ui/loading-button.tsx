"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { cn } from "./utils";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingLabel?: string;
  spinnerClassName?: string;
}

const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(
  (
    {
      isLoading = false,
      loadingLabel,
      spinnerClassName,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        disabled={isLoading || disabled}
        className={cn("relative", className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              className={cn(
                "size-4 shrink-0 animate-spin",
                spinnerClassName,
              )}
              aria-hidden="true"
            />
            {loadingLabel && (
              <span className="truncate">{loadingLabel}</span>
            )}
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
export type { LoadingButtonProps };
