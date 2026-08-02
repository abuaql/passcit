import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 font-heading text-2xl font-bold text-primary"
      >
        <GraduationCap className="h-8 w-8" aria-hidden="true" />
        Passcit
      </Link>
      <div className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
