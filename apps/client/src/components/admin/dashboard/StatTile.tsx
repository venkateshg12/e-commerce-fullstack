import type { PeriodComparison } from "@/types";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type StatTileProps = {
  label: string;
  icon: LucideIcon;
  comparison: PeriodComparison;
  format: (value: number) => string;
  // "vs previous 30 days"
  comparisonLabel: string;
  // Optional trend line, oldest → newest.
  trend?: number[];
  // Extra context under the value, e.g. "41 customers in total".
  note?: string;
};

const Sparkline = ({ values }: { values: number[] }) => {
  const width = 96;
  const height = 32;
  const max = Math.max(...values, 0);
  if (values.length < 2 || max === 0) return null;

  const points = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - 2 - (value / max) * (height - 4),
  ]);
  const [lastX, lastY] = points[points.length - 1];

  // De-emphasis line with the current value in the accent, per the stat-tile contract.
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="dash-sparkline" aria-hidden="true">
      <polyline
        points={points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")}
        fill="none"
        className="stroke-muted-foreground/50"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} className="fill-dash-accent" />
    </svg>
  );
};

const StatTile = ({
  label,
  icon: Icon,
  comparison,
  format,
  comparisonLabel,
  trend,
  note,
}: StatTileProps) => {
  const { current, previous } = comparison;

  // A percentage against zero is meaningless (∞), so a first-ever value just says "New".
  const delta =
    previous === 0
      ? current > 0
        ? { kind: "flat" as const, text: "New" }
        : { kind: "flat" as const, text: "—" }
      : (() => {
          const change = ((current - previous) / previous) * 100;
          const text = `${Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0)}%`;
          if (change > 0) return { kind: "up" as const, text };
          if (change < 0) return { kind: "down" as const, text };
          return { kind: "flat" as const, text: "0%" };
        })();

  return (
    <div className="dash-card">
      <div className="dash-kpi-head">
        <p className="dash-kpi-label">{label}</p>
        <span className="dash-kpi-icon">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>

      <p className="dash-kpi-value">{format(current)}</p>
      {note ? <p className="dash-kpi-compare mt-1 text-xs">{note}</p> : null}

      <div className="dash-kpi-foot">
        <p>
          {/* Direction is carried by the arrow and the sign, not by colour alone. */}
          {delta.kind === "up" ? (
            <span className="dash-delta-up">
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />+{delta.text}
            </span>
          ) : delta.kind === "down" ? (
            <span className="dash-delta-down">
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />−{delta.text}
            </span>
          ) : (
            <span className="dash-delta-flat">{delta.text}</span>
          )}{" "}
          <span className="dash-kpi-compare">{comparisonLabel}</span>
        </p>
        {trend ? <Sparkline values={trend} /> : null}
      </div>
    </div>
  );
};

export default StatTile;
