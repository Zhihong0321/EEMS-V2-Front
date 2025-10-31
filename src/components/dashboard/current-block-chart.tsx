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
};

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
      
      // Color coding: <50% blue, <75% yellow, <90% orange, >=90% red
      let color = "#3b82f6"; // blue (default)
      if (percentOfTarget >= 90) {
        color = "#ef4444"; // red
      } else if (percentOfTarget >= 75) {
        color = "#f97316"; // orange
      } else if (percentOfTarget >= 50) {
        color = "#eab308"; // yellow
      }
      
      return {
        ts: startTs + (index + 1) * binSeconds * 1000,
        value: peakUsage,
        color
      };
    });
  }

  // Pad data to fill all bins
  const paddedData = Array(numPoints).fill(null).map((_, index) => {
    const ts = startTs + (index + 1) * binSeconds * 1000;
    const existingPoint = data.find(p => p.ts === ts);
    return existingPoint ?? { ts, value: 0, color: "#3b82f6" };
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

  // For non-accumulate mode, use BarChart with color-coded bars
  const ChartComponent = isAccumulate ? LineChart : BarChart;
  const DataElement = isAccumulate ? (
    <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
  ) : (
    <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
      {chartData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
      ))}
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
  const color = payload[0]?.payload?.color || "#3b82f6";
  
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold">{timeLabel} · {tooltipFormatter.format(value)} kWh</p>
      <p className="text-slate-400">Peak usage per {binSeconds}s · {pct}% of peak target</p>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
        <span className="text-slate-400">
          {parseFloat(pct) >= 90 ? "Red (≥90%)" : parseFloat(pct) >= 75 ? "Orange (≥75%)" : parseFloat(pct) >= 50 ? "Yellow (≥50%)" : "Blue (<50%)"}
        </span>
      </div>
    </div>
  );
}
