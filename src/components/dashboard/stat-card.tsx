import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="font-heading text-xl font-bold leading-tight text-foreground">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
