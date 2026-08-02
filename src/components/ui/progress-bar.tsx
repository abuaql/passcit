import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ value, className, showLabel, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-4 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">
          {label ?? `${Math.round(clamped)}% complete`}
        </p>
      )}
    </div>
  );
}
