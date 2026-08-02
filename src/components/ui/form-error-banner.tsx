export function FormErrorBanner({
  children,
  variant = "error",
}: {
  children: React.ReactNode;
  /** Covers both cases found duplicated across the auth and profile forms - a plain error-only name would have left the profile forms' success/error dual-purpose banner as an unaddressed near-duplicate instead of genuinely consolidated. */
  variant?: "error" | "success";
}) {
  return (
    <p
      role={variant === "error" ? "alert" : undefined}
      className={
        variant === "error"
          ? "rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          : "rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success"
      }
    >
      {children}
    </p>
  );
}
