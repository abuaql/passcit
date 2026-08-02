import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl " +
    "font-heading font-semibold transition-all duration-150 active:scale-[0.97] " +
    "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-b-4 border-primary-dark " +
          "hover:brightness-105 active:border-b-[2px] active:translate-y-[2px]",
        secondary:
          "bg-secondary text-secondary-foreground border-b-4 border-secondary-dark " +
          "hover:brightness-105 active:border-b-[2px] active:translate-y-[2px]",
        outline:
          "border-2 border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground border-b-4 border-destructive-dark " +
          "hover:brightness-105 active:border-b-[2px] active:translate-y-[2px]",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
