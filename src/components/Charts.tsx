import React, { useState } from 'react';
import type { Severity } from '../types/security';

export interface ChartDatum {
  label: string;
  value: number;
  color: string;
}

export const SeverityDonutChart: React.FC<{
  data: Array<{ severity: Severity; count: number; color: string }>;
  onSelectSeverity?: (severity: Severity) => void;
}> = ({ data, onSelectSeverity }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  if (total === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No threat records available to plot severity distribution.
      </div>
    );
  }

  const size = 176;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={strokeWidth}
          />
          {data.map((item) => {
            if (item.count === 0) return null;
            const ratio = item.count / total;
            const dash = ratio * circumference;
            const offset = -accumulated * circumference;
            accumulated += ratio;
            const isActive = hovered === item.severity;
            return (
              <circle
                key={item.severity}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHovered(item.severity)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectSeverity?.(item.severity)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {hovered
              ? data.find((d) => d.severity === hovered)?.count ?? total
              : total}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hovered ?? 'Total'}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <button
              key={item.severity}
              type="button"
              onMouseEnter={() => setHovered(item.severity)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectSeverity?.(item.severity)}
              className="w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.severity}</span>
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                {item.count} <span className="text-slate-400">({pct}%)</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const HorizontalBarChart: React.FC<{
  data: ChartDatum[];
  emptyMessage?: string;
  onSelectLabel?: (label: string) => void;
}> = ({ data, emptyMessage = 'No records available.', onSelectLabel }) => {
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const nonZero = data.filter((d) => d.value > 0);

  if (nonZero.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {nonZero.map((item) => {
        const widthPct = Math.max(4, Math.round((item.value / maxVal) * 100));
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onSelectLabel?.(item.label)}
                className={`font-medium text-slate-700 dark:text-slate-200 truncate ${
                  onSelectLabel ? 'hover:text-blue-600 dark:hover:text-cyan-400 cursor-pointer' : ''
                }`}
              >
                {item.label}
              </button>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 ml-2">
                {item.value}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-sm bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-200"
                style={{ width: `${widthPct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export interface TimelinePoint {
  label: string;
  count: number;
  criticalOrHigh: number;
}

export const ActivityTimelineChart: React.FC<{
  points: TimelinePoint[];
}> = ({ points }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = points.reduce((acc, p) => acc + p.count, 0);

  if (points.length === 0 || total === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No timestamped threat activity to display yet.
      </div>
    );
  }

  const width = 560;
  const height = 190;
  const padLeft = 30;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const maxY = Math.max(2, ...points.map((p) => p.count));

  const coords = points.map((p, idx) => {
    const x =
      points.length === 1
        ? padLeft + innerW / 2
        : padLeft + (idx / (points.length - 1)) * innerW;
    const y = padTop + innerH - (p.count / maxY) * innerH;
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : '';

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
        <defs>
          <linearGradient id="cgTimelineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((tick) => {
          const yPos = padTop + innerH - tick * innerH;
          const labelVal = Math.round(tick * maxY);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={yPos}
                x2={width - padRight}
                y2={yPos}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={yPos + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {labelVal}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#cgTimelineGrad)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#22D3EE"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map((c, idx) => (
          <g
            key={c.label}
            className="cursor-pointer"
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIdx === idx ? 6 : 4}
              className="fill-blue-600 stroke-white dark:fill-cyan-400 dark:stroke-slate-950 transition-all"
              strokeWidth="2"
            />
            <text
              x={c.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>

      {hoverIdx !== null && coords[hoverIdx] && (
        <div className="mt-1 flex items-center justify-between px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-xs text-slate-700 dark:text-slate-200 font-mono tabular-nums">
          <span>Date: {coords[hoverIdx].label}</span>
          <span>
            {coords[hoverIdx].count} incident(s) · {coords[hoverIdx].criticalOrHigh} Critical/High
          </span>
        </div>
      )}
    </div>
  );
};
