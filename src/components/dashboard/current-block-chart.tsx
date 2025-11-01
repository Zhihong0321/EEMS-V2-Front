"use client";

// RESPONSIVE-AWARE: Chart height adjusts for mobile (h-48) and desktop (md:h-72)
// See docs/RESPONSIVE.md for responsive development guidelines

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
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

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
  targetPeakKwh?: number; // Target accumulated_kwh for the 30-minute block (for non-accumulate mode)
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
    // targetPeakKwh is the TOTAL accumulated target for the 30-minute block
    // Divide by 60 bins (assuming 30-second bins) to get target per bin
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
  const [barColors, setBarColors] = useState<Map<number, string>>(new Map());
  const [animatedData, setAnimatedData] = useState<ChartPoint[]>([]);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [animationKey, setAnimationKey] = useState(0); // Key to force re-animation

  useEffect(() => {
    // Clear any pending animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    if (isAccumulate || chartData.length === 0) {
      prevDataRef.current = chartData;
      setAnimatedData([...chartData]); // Create new array reference
      return;
    }

    // Check if data actually changed (by comparing values)
    const dataChanged = JSON.stringify(prevDataRef.current) !== JSON.stringify(chartData);
    if (!dataChanged) {
      return; // Skip if data hasn't actually changed
    }

    // Create animated data where new bars start at 0 and animate to target value
    const updatedColors = new Map(barColors);
    const newBarIndices: number[] = [];
    
    // First pass: identify new bars
    chartData.forEach((point, index) => {
      const prevPoint = prevDataRef.current[index];
      if (point.value > 0 && (!prevPoint || prevPoint.value === 0)) {
        newBarIndices.push(index);
      }
    });

    if (newBarIndices.length > 0) {
      // Create initial data with new bars at 0 (create completely new array and objects)
      const initialData: ChartPoint[] = chartData.map((point, index) => {
        const targetColor = point.color || "#22c55e";
        
        if (newBarIndices.includes(index)) {
          // New bar: start with green color and value 0
          updatedColors.set(index, "#22c55e");
          
          // Return completely new object with 0 value
          return { 
            ts: point.ts, 
            value: 0, 
            color: "#22c55e",
            percentOfTarget: 0
          };
        } else {
          // Existing bar: keep current value
          updatedColors.set(index, targetColor);
          return { ...point }; // Create new object reference
        }
      });

      // Set initial data (with new bars at 0) - use spread to create new array
      setAnimatedData([...initialData]);
      setBarColors(new Map(updatedColors));
      
      // After React renders the initial state, update to target values
      // Use requestAnimationFrame to ensure React has rendered
      animationTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          // Increment animation key to force Recharts to recognize the change
          setAnimationKey(prev => prev + 1);
          
          // Create new array with target values
          const finalData: ChartPoint[] = chartData.map((point, index) => ({ ...point }));
          setAnimatedData([...finalData]);
          
          // Update colors after animation starts
          setTimeout(() => {
            chartData.forEach((point, index) => {
              if (newBarIndices.includes(index)) {
                const targetColor = point.color || "#22c55e";
                setBarColors(prev => {
                  const next = new Map(prev);
                  next.set(index, targetColor);
                  return next;
                });
              }
            });
          }, 400);
        });
      }, 150); // Wait 150ms for React to render initial state
      
      prevDataRef.current = [...chartData]; // Store copy
    } else {
      // No new bars, update directly with new references
      chartData.forEach((point, index) => {
        updatedColors.set(index, point.color || "#22c55e");
      });
      setBarColors(new Map(updatedColors));
      setAnimatedData(chartData.map(p => ({ ...p }))); // Create new array and objects
      prevDataRef.current = [...chartData]; // Store copy
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
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
      animationDuration={1500}
      animationBegin={0}
    >
      {animatedData.map((entry, index) => {
        const currentColor = barColors.get(index) || entry.color || "#22c55e";
        
        return (
          <Cell 
            key={`cell-${entry.ts}-${index}`} 
            fill={currentColor}
            style={{
              transition: "fill 1.2s cubic-bezier(0.4, 0, 0.2, 1)"
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
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow duration-300" role="region" aria-label="Current block chart">
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Current 30-minute block</h3>
              <p className="text-xs sm:text-sm text-slate-400">Window {windowLabel}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              aria-label="Export chart data"
              title="Export data (Coming soon)"
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 sm:px-4 py-2 text-xs text-slate-400">
          {isAccumulate ? (
            <>
              Target {resolvedTarget.toFixed(1)} kWh · Accumulated {block?.accumulated_kwh.toFixed(2) ?? "—"} kWh
            </>
          ) : (
            <>
              Target {targetPeakKwh?.toFixed(1) ?? "—"} kWh (total) · Per bin {(targetPeakKwh ? targetPeakKwh / 60 : 0).toFixed(3)} kWh
            </>
          )}
        </div>
      </header>
      <div className="h-48 md:h-72 w-full">
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
            <ChartComponent 
              key={isAccumulate ? undefined : `chart-${animationKey}`}
              data={isAccumulate ? chartData : animatedData} 
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
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
    const pctNum = parseFloat(pct);
    return (
      <div className="rounded-xl border border-slate-600/50 bg-slate-900/98 backdrop-blur-md p-4 shadow-2xl ring-1 ring-white/5">
        <div className="mb-2 pb-2 border-b border-slate-700/50">
          <p className="text-sm font-semibold text-white">{timeLabel}</p>
          <p className="text-xs text-slate-400">Accumulated reading</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Accumulated:</span>
            <span className="text-sm font-medium text-emerald-400">{tooltipFormatter.format(value)} kWh</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Target:</span>
            <span className="text-sm font-medium text-slate-300">{tooltipFormatter.format(target)} kWh</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">Progress:</span>
              <span className={`text-sm font-semibold ${pctNum > 100 ? 'text-danger' : pctNum > 90 ? 'text-warning' : 'text-success'}`}>
                {pct}%
              </span>
            </div>
          </div>
        </div>
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
    <div className="rounded-xl border border-slate-600/50 bg-slate-900/98 backdrop-blur-md p-4 shadow-2xl ring-1 ring-white/5">
      <div className="mb-2 pb-2 border-b border-slate-700/50">
        <p className="text-sm font-semibold text-white">{timeLabel}</p>
        <p className="text-xs text-slate-400">Peak usage reading ({binSeconds}s)</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-400">Usage:</span>
          <span className="text-sm font-medium text-cyan-400">{tooltipFormatter.format(value)} kWh</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-400">Target/bin:</span>
          <span className="text-sm font-medium text-slate-300">{tooltipFormatter.format(targetPerBin)} kWh</span>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Intensity:</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium text-slate-300">{colorLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
