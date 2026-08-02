import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-2xl border-2 bg-background px-4 text-sm text-foreground " +
            "transition-colors placeholder:text-muted-foreground focus-visible:outline-none " +
            "focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-border focus-visible:border-primary",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
