import { strings } from "@/lib/i18n";

export function BarChart({
  data,
  suffix = "",
}: {
  data: { label: string; value: number }[];
  /** Appended after the number, e.g. "%" or " sessions". */
  suffix?: string;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{strings.admin.analytics.noDataYet}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground">{d.label}</span>
            <span className="text-muted-foreground">
              {d.value}
              {suffix}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{strings.admin.analytics.noDataYet}</p>;
  }

  const width = 600;
  const height = 200;
  const padding = 32;
  const maxValue = Math.max(...data.map((d) => d.count), 1);

  const points = data.map((d, i) => {
    const x = data.length > 1 ? padding + (i / (data.length - 1)) * (width - 2 * padding) : width / 2;
    const y = height - padding - (d.count / maxValue) * (height - 2 * padding);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]!.x.toFixed(1)},${height - padding} L ${points[0]!.x.toFixed(1)},${height - padding} Z`;

  // Show at most ~7 date labels along the x-axis so they don't overlap on longer ranges.
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={strings.admin.analytics.lineChartLabel}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-border" strokeWidth={1} />
      <path d={areaPath} className="fill-primary/10" />
      <path d={linePath} className="fill-none stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle key={p.date} cx={p.x} cy={p.y} r={3} className="fill-primary" />
      ))}
      {points.map((p, i) =>
        i % labelStep === 0 ? (
          <text
            key={`label-${p.date}`}
            x={p.x}
            y={height - padding + 16}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {p.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}
