// src/app/components/ui/loading-button.tsx
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./utils";

interface LoadingButtonProps extends React.ComponentProps<"button"> {
  isLoading?: boolean;
  spinnerClassName?: string;
}

function LoadingButton({ className, isLoading = false, disabled, children, spinnerClassName, ...props }: LoadingButtonProps) {
  return (
    <button
      data-slot="loading-button"
      className={cn("relative", className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className={cn("h-5 w-5 animate-spin", spinnerClassName)} />
        </span>
      )}
      <span className={cn("contents", isLoading && "invisible")}>{children}</span>
    </button>
  );
}

export { LoadingButton };
export type { LoadingButtonProps };