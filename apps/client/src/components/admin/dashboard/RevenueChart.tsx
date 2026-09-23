import { formatRupees } from "@/lib/orderStatus";
import type { RevenuePoint } from "@/types";
import { useEffect, useRef, useState } from "react";

const HEIGHT = 260;
const PAD = { top: 12, right: 12, bottom: 28, left: 52 };
const Y_TICKS = 4;
const TARGET_X_TICKS = 6;

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Rounds the axis top up to a clean number (1, 2, 2.5, 5 × 10ⁿ) so the ticks read ₹0 / ₹5K / ₹10K.
const niceCeiling = (value: number) => {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const fraction = value / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
};

type RevenueChartProps = {
  series: RevenuePoint[];
};

/**
 * Single-series area chart: a 2px line over a 10% wash of the same hue, one y-axis, recessive
 * hairline grid, no legend (the card title names the series). Hover or arrow-key through it for a
 * crosshair + tooltip; the same numbers are in the data table below it.
 */
const RevenueChart = ({ series }: RevenueChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // SVG text and strokes would stretch under a viewBox, so the chart is drawn at its real pixel
  // width instead, re-measured whenever the card resizes.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 0);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxRevenue = Math.max(...series.map((point) => point.revenue), 0);
  const yMax = niceCeiling(maxRevenue);
  const total = series.reduce((sum, point) => sum + point.revenue, 0);
  const isEmpty = total === 0;

  const x = (index: number) =>
    PAD.left + (series.length > 1 ? (index / (series.length - 1)) * plotWidth : plotWidth / 2);
  const y = (value: number) => PAD.top + plotHeight - (value / yMax) * plotHeight;
  const baseline = PAD.top + plotHeight;

  const linePath = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.revenue).toFixed(1)}`)
    .join(" ");
  const areaPath = series.length
    ? `${linePath} L${x(series.length - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`
    : "";

  const xTickStep = Math.max(1, Math.ceil(series.length / TARGET_X_TICKS));
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, step) => (yMax / Y_TICKS) * step);

  // The crosshair finds the nearest day, so the reader aims at a date, never at a 2px line.
  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!series.length || plotWidth <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left - PAD.left) / plotWidth;
    const index = Math.round(ratio * (series.length - 1));
    setActiveIndex(Math.min(Math.max(index, 0), series.length - 1));
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActiveIndex((current) => {
      const start = current ?? series.length - 1;
      const next = event.key === "ArrowLeft" ? start - 1 : start + 1;
      return Math.min(Math.max(next, 0), series.length - 1);
    });
  };

  const activePoint = activeIndex !== null ? series[activeIndex] : null;
  // Keep the tooltip inside the card near either edge.
  const tooltipLeft =
    activeIndex !== null ? Math.min(Math.max(x(activeIndex), 70), Math.max(width - 70, 70)) : 0;

  return (
    <div className="dash-chart" ref={containerRef}>
      {width > 0 ? (
        <svg
          width={width}
          height={HEIGHT}
          className="dash-chart-svg"
          role="img"
          aria-label={`Revenue over the last ${series.length} days, ${formatRupees(total)} in total. Use the left and right arrow keys to read each day.`}
          tabIndex={0}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
          onFocus={() => setActiveIndex(series.length - 1)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                className="dash-chart-grid"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="dash-chart-tick">
                {formatRupees(tick, true)}
              </text>
            </g>
          ))}

          {series.map((point, index) =>
            index % xTickStep === 0 ? (
              <text
                key={point.date}
                x={x(index)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="dash-chart-tick"
              >
                {shortDate(point.date)}
              </text>
            ) : null
          )}

          <path d={areaPath} className="dash-chart-area" />
          <path
            d={linePath}
            className="dash-chart-line"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {activePoint && activeIndex !== null ? (
            <g>
              <line
                x1={x(activeIndex)}
                x2={x(activeIndex)}
                y1={PAD.top}
                y2={baseline}
                className="dash-chart-crosshair"
                strokeWidth={1}
              />
              <circle
                cx={x(activeIndex)}
                cy={y(activePoint.revenue)}
                r={4.5}
                className="dash-chart-dot"
                strokeWidth={2}
              />
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}

      {activePoint ? (
        <div className="dash-tooltip" style={{ left: tooltipLeft }}>
          <p className="dash-tooltip-value">{formatRupees(activePoint.revenue)}</p>
          <p className="dash-tooltip-meta">
            {shortDate(activePoint.date)} · {activePoint.orders}{" "}
            {activePoint.orders === 1 ? "order" : "orders"}
          </p>
        </div>
      ) : null}

      {isEmpty ? <p className="dash-chart-empty">No paid orders in this period yet</p> : null}

      <details className="dash-table-toggle">
        <summary className="dash-table-toggle-summary">Show data table</summary>
        <div className="max-h-56 overflow-y-auto">
          <table className="dash-data-table">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 text-right font-medium">Orders</th>
                <th className="py-1 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.date} className="border-t border-border/60 text-foreground">
                  <td className="py-1">{shortDate(point.date)}</td>
                  <td className="py-1 text-right">{point.orders}</td>
                  <td className="py-1 text-right">{formatRupees(point.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default RevenueChart;
