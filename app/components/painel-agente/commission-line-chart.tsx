"use client";

import { useId, useMemo, useState } from "react";

export type CommissionChartPoint = {
  dateMs: number;
  label: string;
  cents: number;
};

type CommissionLineChartProps = {
  points: CommissionChartPoint[];
  formatValue: (cents: number) => string;
};

const WIDTH = 560;
const HEIGHT = 200;
const PADDING_X = 36;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

export function CommissionLineChart({ points, formatValue }: CommissionLineChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (points.length === 0) {
      return null;
    }

    const maxValue = Math.max(...points.map((point) => point.cents), 1);
    const usableWidth = WIDTH - PADDING_X * 2;
    const usableHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const stepX = points.length > 1 ? usableWidth / (points.length - 1) : 0;

    const coords = points.map((point, index) => {
      const x = PADDING_X + stepX * index;
      const y = PADDING_TOP + usableHeight - (point.cents / maxValue) * usableHeight;
      return { x, y, point };
    });

    const linePath = coords.map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${coords[coords.length - 1]!.x.toFixed(1)},${(HEIGHT - PADDING_BOTTOM).toFixed(1)} L${coords[0]!.x.toFixed(1)},${(HEIGHT - PADDING_BOTTOM).toFixed(1)} Z`;

    return { coords, linePath, areaPath, maxValue };
  }, [points]);

  if (!chart) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs font-semibold text-[#7d97b6]">
        No commission data for this period yet.
      </div>
    );
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const hovered = hoverIndex !== null ? chart.coords[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
          let nearestIndex = 0;
          let nearestDistance = Infinity;
          chart.coords.forEach((coord, index) => {
            const distance = Math.abs(coord.x - relativeX);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = index;
            }
          });
          setHoverIndex(nearestIndex);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridLines.map((fraction) => {
          const y = PADDING_TOP + (HEIGHT - PADDING_TOP - PADDING_BOTTOM) * fraction;
          return <line key={fraction} x1={PADDING_X} x2={WIDTH - PADDING_X} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
        })}

        <path d={chart.areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={chart.linePath} fill="none" stroke="#22d3ee" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {chart.coords.map((coord, index) => (
          <circle
            key={coord.point.dateMs}
            cx={coord.x}
            cy={coord.y}
            r={hoverIndex === index ? 4 : 2.5}
            fill="#0a121c"
            stroke="#22d3ee"
            strokeWidth={2}
          />
        ))}

        {chart.coords
          .filter((_, index) => index === 0 || index === chart.coords.length - 1 || index % Math.ceil(chart.coords.length / 6) === 0)
          .map((coord) => (
            <text key={coord.point.dateMs} x={coord.x} y={HEIGHT - 8} textAnchor="middle" className="fill-[#7d97b6]" fontSize={9}>
              {coord.point.label}
            </text>
          ))}
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-cyan-400/30 bg-[#0a121c] px-2.5 py-1.5 text-[0.65rem] font-bold text-cyan-200 shadow-lg"
          style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100 - 4}%` }}
        >
          <div className="text-[#7d97b6]">{hovered.point.label}</div>
          {formatValue(hovered.point.cents)}
        </div>
      ) : null}
    </div>
  );
}
