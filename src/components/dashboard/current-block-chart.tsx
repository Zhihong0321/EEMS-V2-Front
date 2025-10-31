"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { LatestBlock } from "@/lib/types";
import { formatBlockWindow } from "@/lib/block-utils";
import { useEffect, useRef, useState } from "react";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

const windowFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIMEZONE
});

const tooltipFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2
});

type CurrentBlockChartProps = {
  block: LatestBlock | null;
  loading: boolean;
  targetKwh?: number;
  targetPeakKwh?: number; // Targeted peak usage per 30min block (for non-accumulate mode)
  mode: "accumulate" | "non-accumulate";
  lastReadingTs?: string | null; // Last reading timestamp to determine current block
};

type ChartPoint = {
  ts: number;
  value: number;
  color?: string; // For color-coded bars in non-accumulate mode
  percentOfTarget?: number; // Store percentage for gradient calculation
};

/**
 * Generate smooth gradient color from green to red based on percentage
 * 0% = green (#22c55e)
 * 50% = yellow-green (#84cc16)
 * 75% = yellow (#eab308)
 * 90% = orange (#f97316)
 * 100%+ = red (#ef4444)
 */
function getGradientColor(percentOfTarget: number): string {
  // Clamp to 0-120% range for smooth transition
  const clamped = Math.max(0, Math.min(120, percentOfTarget));
  
  if (clamped <= 50) {
    // Green to yellow-green: 0% -> 50%
    const ratio = clamped / 50;
    return interpolateColor("#22c55e", "#84cc16", ratio);
  } else if (clamped <= 75) {
    // Yellow-green to yellow: 50% -> 75%
    const ratio = (clamped - 50) / 25;
    return interpolateColor("#84cc16", "#eab308", ratio);
  } else if (clamped <= 90) {
    // Yellow to orange: 75% -> 90%
    const ratio = (clamped - 75) / 15;
    return interpolateColor("#eab308", "#f97316", ratio);
  } else if (clamped <= 100) {
    // Orange to red: 90% -> 100%
    const ratio = (clamped - 90) / 10;
    return interpolateColor("#f97316", "#ef4444", ratio);
  } else {
    // 100%+ = deep red
    const ratio = Math.min(1, (clamped - 100) / 20); // Darken up to 120%
    return interpolateColor("#ef4444", "#dc2626", ratio);
  }
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex1 = color1.replace("#", "");
  const hex2 = color2.replace("#", "");
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("")}`;
}

function buildChartData(
  block: LatestBlock | null,
  mode: "accumulate" | "non-accumulate",
  targetPeakKwh?: number
): { data: ChartPoint[]; startTs: number; endTs: number; binSeconds: number } {
  // Simple: trust backend block data completely
  // Chart will always show the latest 30min block from stored signals (even if future)
  if (!block || !block.block_start_local) {
    // Fallback: return empty chart with current time window
    const now = new Date();
    const startTs = now.getTime();
    const endTs = startTs + 30 * 60 * 1000;
    const data = Array(60).fill(null).map((_, index) => ({
      ts: startTs + (index + 1) * 30 * 1000,
      value: 0,
    }));
    return { data, startTs, endTs, binSeconds: 30 };
  }

  // Use backend block data - always show latest block (simple and reliable)
  const startTs = new Date(block.block_start_local).getTime();
  const endTs = startTs + 30 * 60 * 1000;
  const points = block.chart_bins?.points ?? [];
  const binSeconds = block.chart_bins?.bin_seconds ?? 30;
  const numPoints = Math.floor((30 * 60) / binSeconds);

  let data: ChartPoint[] = [];

  if (mode === "accumulate") {
    data = points.map((value, index) => ({
      ts: startTs + (index + 1) * binSeconds * 1000,
      value
    }));
  } else {
    // Non-accumulate mode: calculate peak usage per bin and add color coding
    const targetPerBin = targetPeakKwh ? targetPeakKwh / 60 : 0; // 30min block = 60 bins of 30sec
    
    data = points.map((value, index) => {
      const peakUsage = value - (index === 0 ? 0 : points[index - 1]);
      const percentOfTarget = targetPerBin > 0 ? (peakUsage / targetPerBin) * 100 : 0;
      
      // Use smooth gradient color function
      const color = getGradientColor(percentOfTarget);
      
      return {
        ts: startTs + (index + 1) * binSeconds * 1000,
        value: peakUsage,
        color,
        percentOfTarget
      };
    });
  }

  // Pad data to fill all bins
  const paddedData = Array(numPoints).fill(null).map((_, index) => {
    const ts = startTs + (index + 1) * binSeconds * 1000;
    const existingPoint = data.find(p => p.ts === ts);
    return existingPoint ?? { ts, value: 0, color: "#22c55e", percentOfTarget: 0 };
  });

  return { data: paddedData, startTs, endTs, binSeconds };
}

function formatWindow(startTs: number, endTs: number): string {
  try {
    const start = new Date(startTs);
    const end = new Date(endTs);
    return formatBlockWindow(start.toISOString(), end.toISOString(), TIMEZONE);
  } catch {
    return "Invalid time range";
  }
}

export function CurrentBlockChart({ block, loading, targetKwh, targetPeakKwh, mode, lastReadingTs }: CurrentBlockChartProps) {
  const resolvedTarget = targetKwh ?? block?.target_kwh ?? 0;

  // Simple: use backend block data directly, no complex matching
  const { data: chartData, startTs, endTs, binSeconds } = buildChartData(block, mode, targetPeakKwh);
  
  const windowLabel = formatWindow(startTs, endTs);

  const isAccumulate = mode === "accumulate";

  // Track previous data to detect new bars for animation
  const prevDataRef = useRef<ChartPoint[]>([]);
  const [newBarIndices, setNewBarIndices] = useState<Set<number>>(new Set());
  const [barColors, setBarColors] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (isAccumulate || chartData.length === 0) {
      prevDataRef.current = chartData;
      return;
    }

    // Detect new bars (bars that have value > 0 when previous was 0 or didn't exist)
    const newIndices = new Set<number>();
    const updatedColors = new Map(barColors);
    
    chartData.forEach((point, index) => {
      const prevPoint = prevDataRef.current[index];
      const targetColor = point.color || "#22c55e";
      
      if (point.value > 0 && (!prevPoint || prevPoint.value === 0)) {
        // New bar: start with green
        newIndices.add(index);
        updatedColors.set(index, "#22c55e");
        
        // Transition to target color after grow animation starts (200ms delay for visibility)
        setTimeout(() => {
          setBarColors(prev => {
            const next = new Map(prev);
            next.set(index, targetColor);
            return next;
          });
        }, 200);
      } else if (point.value > 0) {
        // Existing bar: update color smoothly
        updatedColors.set(index, targetColor);
      }
    });

    if (newIndices.size > 0) {
      setNewBarIndices(newIndices);
      setBarColors(updatedColors);
      // Clear animation flags after animation completes
      setTimeout(() => {
        setNewBarIndices(new Set());
      }, 1000);
    } else {
      setBarColors(updatedColors);
    }

    prevDataRef.current = chartData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, isAccumulate]);

  // For non-accumulate mode, use BarChart with color-coded bars and animations
  const ChartComponent = isAccumulate ? LineChart : BarChart;
  const DataElement = isAccumulate ? (
    <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={800} />
  ) : (
    <Bar 
      dataKey="value" 
      radius={[4, 4, 0, 0]} 
      isAnimationActive={true}
      animationDuration={600}
    >
      {chartData.map((entry, index) => {
        const currentColor = barColors.get(index) || entry.color || "#22c55e";
        
        return (
          <Cell 
            key={`cell-${index}`} 
            fill={currentColor}
            style={{
              transition: "fill 0.7s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          />
        );
      })}
    </Bar>
  );

  // Reference lines
  const referenceLine = isAccumulate ? (
    <ReferenceLine y={resolvedTarget} stroke="#f97316" strokeDasharray="6 6" />
  ) : targetPeakKwh ? (
    // Semi-transparent reference line for peak target (white @ 15-20% opacity)
    <ReferenceLine 
      y={targetPeakKwh / 60} 
      stroke="rgba(255, 255, 255, 0.18)" 
      strokeWidth={2}
      strokeDasharray="4 4"
      label={{ value: "Peak Target", position: "right", fill: "rgba(255, 255, 255, 0.6)", fontSize: 11 }}
    />
  ) : null;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Current 30-minute block</h2>
          <p className="text-sm text-slate-400">Window {windowLabel}</p>
        </div>
        <div className="rounded-md border border-slate-800 px-4 py-2 text-xs text-slate-400">
          {isAccumulate ? (
            <>
              Target {resolvedTarget.toFixed(1)} kWh · Accumulated {block?.accumulated_kwh.toFixed(2) ?? "—"} kWh
            </>
          ) : (
            <>
              Peak Target {targetPeakKwh?.toFixed(1) ?? "—"} kWh/30min · Target per bin {(targetPeakKwh ? targetPeakKwh / 60 : 0).toFixed(3)} kWh
            </>
          )}
        </div>
      </header>
      <div className="h-72 w-full">
        {loading && !block ? (
          // Only show loading on initial load (when block is null)
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
            <span className="text-sm text-slate-500">Loading chart…</span>
          </div>
        ) : chartData.length === 0 || chartData.every(p => p.value === 0) ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
            <span className="text-sm text-slate-500">No readings for this block yet.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={[startTs, endTs]}
                tickFormatter={(ts) => windowFormatter.format(ts)}
                stroke="#64748b"
                tickLine={false}
              />
              <YAxis
                dataKey="value"
                stroke="#64748b"
                tickLine={false}
                width={60}
                tickFormatter={(value) => tooltipFormatter.format(value as number)}
              />
              <Tooltip content={<CustomTooltip target={resolvedTarget} targetPeakKwh={targetPeakKwh} mode={mode} binSeconds={binSeconds} />} />
              {referenceLine}
              {DataElement}
            </ChartComponent>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Streaming series updates replace the entire 60-point window whenever the backend publishes a block update.
      </p>
    </article>
  );
}

type CustomTooltipProps = {
  active?: boolean;
  payload?: { value: number; payload?: ChartPoint }[];
  label?: number;
  target: number;
  targetPeakKwh?: number;
  mode: "accumulate" | "non-accumulate";
  binSeconds: number;
};

function CustomTooltip({ active, payload, label, target, targetPeakKwh, mode, binSeconds }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) {
    return null;
  }
  const value = payload[0]?.value ?? 0;
  const isAccumulate = mode === "accumulate";
  const timeLabel = windowFormatter.format(label);

  if (isAccumulate) {
    const pct = target > 0 ? ((value / target) * 100).toFixed(1) : "0";
    return (
      <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
        <p className="font-semibold">{timeLabel} · {tooltipFormatter.format(value)} kWh</p>
        <p className="text-slate-400">Accumulated · {pct}% of target</p>
      </div>
    );
  }

  // Non-accumulate mode: show peak usage and percentage of peak target
  const targetPerBin = targetPeakKwh ? targetPeakKwh / 60 : 0;
  const pct = targetPerBin > 0 ? ((value / targetPerBin) * 100).toFixed(1) : "0";
  const color = payload[0]?.payload?.color || "#22c55e";
  
  // Determine color label based on percentage
  const pctNum = parseFloat(pct);
  let colorLabel = "Green";
  if (pctNum >= 100) {
    colorLabel = "Red (≥100%)";
  } else if (pctNum >= 90) {
    colorLabel = "Orange-Red (90-100%)";
  } else if (pctNum >= 75) {
    colorLabel = "Yellow-Orange (75-90%)";
  } else if (pctNum >= 50) {
    colorLabel = "Yellow-Green (50-75%)";
  } else {
    colorLabel = "Green (<50%)";
  }
  
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold">{timeLabel} · {tooltipFormatter.format(value)} kWh</p>
      <p className="text-slate-400">Peak usage per {binSeconds}s · {pct}% of peak target</p>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
        <span className="text-slate-400">{colorLabel}</span>
      </div>
    </div>
  );
}
