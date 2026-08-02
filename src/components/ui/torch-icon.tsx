import { cn } from "@/lib/utils";

interface TorchIconProps {
  className?: string;
  /** Bright gold when actively streaking, muted gray when the streak is broken. */
  lit?: boolean;
}

/**
 * The app's signature icon: a torch, not a generic flame — a small,
 * deliberate nod to the Statue of Liberty that ties the streak/achievement
 * system back to the subject matter instead of borrowing Duolingo's flame.
 */
export function TorchIcon({ className, lit = true }: TorchIconProps) {
  return (
    <svg
      viewBox="0 0 24 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      aria-hidden="true"
    >
      <rect
        x="9.5"
        y="20"
        width="5"
        height="9"
        rx="2"
        className={lit ? "fill-[#8B6A3F]" : "fill-muted-foreground/25"}
      />
      <rect
        x="7"
        y="15"
        width="10"
        height="6"
        rx="2"
        className={lit ? "fill-[#B08D57]" : "fill-muted-foreground/25"}
      />
      <path
        d="M12,0 C12,0 5.5,8.5 5.5,13.5 C5.5,17.09 8.41,20 12,20 C15.59,20 18.5,17.09 18.5,13.5 C18.5,8.5 12,0 12,0 Z"
        className={lit ? "fill-accent" : "fill-muted-foreground/25"}
      />
      <path
        d="M12.5,6 C12.5,6 9,10.8 9,13.8 C9,15.79 10.57,17.4 12.5,17.4 C14.43,17.4 16,15.79 16,13.8 C16,10.8 12.5,6 12.5,6 Z"
        className={lit ? "fill-primary" : "fill-muted-foreground/40"}
      />
    </svg>
  );
}
