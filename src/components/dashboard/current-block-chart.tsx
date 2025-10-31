"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { getCurrentBlockFromReading, formatBlockWindow } from "@/lib/block-utils";

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
  mode: "accumulate" | "non-accumulate";
  lastReadingTs?: string | null; // Last reading timestamp to determine current block
};

type ChartPoint = {
  ts: number;
  value: number;
};

function buildChartData(
  block: LatestBlock | null,
  mode: "accumulate" | "non-accumulate",
  currentWindow: { startTs: number; endTs: number }
): { data: ChartPoint[]; startTs: number; endTs: number; binSeconds: number } {
  const { startTs, endTs } = currentWindow;

  // Block is considered valid if it exists and its start time matches the current window's start time
  // Compare by formatting both in the same timezone to avoid timezone parsing issues
  let blockIsCurrent = false;
  if (block && block.block_start_local) {
    // Parse the backend's block_start_local (it's in local timezone format like "2024-10-31T16:30:00+08:00")
    const blockStartDate = new Date(block.block_start_local);
    
    // Format both in the target timezone for comparison
    const blockStartFormatted = windowFormatter.format(blockStartDate);
    const windowStartFormatted = windowFormatter.format(startTs);
    
    // Compare the formatted strings (just hour:minute) or timestamps
    // Use timestamp comparison with tolerance for timezone rounding
    const timeDiff = Math.abs(blockStartDate.getTime() - startTs);
    // Allow up to 5 minutes difference (timezone/rounding issues, and to account for backend processing delays)
    blockIsCurrent = timeDiff < 5 * 60 * 1000;
    
    // Also check if the formatted times match (as a secondary check)
    if (!blockIsCurrent) {
      // Extract hour:minute from both
      const blockHrMin = blockStartFormatted.split(':').slice(0, 2).join(':');
      const windowHrMin = windowStartFormatted.split(':').slice(0, 2).join(':');
      blockIsCurrent = blockHrMin === windowHrMin;
    }
  }

  if (!blockIsCurrent || !block) {
    // If block is not current or doesn't exist, return an empty chart for the current window
    const data = Array(60).fill(null).map((_, index) => ({
      ts: startTs + (index + 1) * 30 * 1000,
      value: 0,
    }));
    return { data, startTs, endTs, binSeconds: 30 };
  }

  // Original binned logic - block is guaranteed to be non-null here
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
    data = points.map((value, index) => ({
      ts: startTs + (index + 1) * binSeconds * 1000,
      value: value - (index === 0 ? 0 : points[index - 1])
    }));
  }

  // Pad data to 60 points
  const paddedData = Array(numPoints).fill(null).map((_, index) => {
    const ts = startTs + (index + 1) * binSeconds * 1000;
    const existingPoint = data.find(p => p.ts === ts);
    return existingPoint ?? { ts, value: 0 };
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

export function CurrentBlockChart({ block, loading, targetKwh, mode, lastReadingTs }: CurrentBlockChartProps) {
  const resolvedTarget = targetKwh ?? block?.target_kwh ?? 0;

  const currentWindow = (() => {
    // Priority 1: Use lastReadingTs to determine current block (prototype mode)
    if (lastReadingTs) {
      const blockFromReading = getCurrentBlockFromReading(lastReadingTs);
      if (blockFromReading) {
        const start = new Date(blockFromReading.start);
        const end = new Date(blockFromReading.end);
        return { startTs: start.getTime(), endTs: end.getTime() };
      }
    }
    
    // Priority 2: If a block is provided, use its start time to define the window.
    if (block) {
      const start = new Date(block.block_start_local);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return { startTs: start.getTime(), endTs: end.getTime() };
    }
    
    // Priority 3: Fallback for when there is no block data yet, based on real time.
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.floor(minutes / 30) * 30;
    const start = new Date(now);
    start.setMinutes(roundedMinutes, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return { startTs: start.getTime(), endTs: end.getTime() };
  })();

  const windowLabel = formatWindow(currentWindow.startTs, currentWindow.endTs);
  const { data: chartData, startTs, endTs, binSeconds } = buildChartData(block, mode, currentWindow);

  const isAccumulate = mode === "accumulate";

  const ChartComponent = isAccumulate ? LineChart : AreaChart;
  const DataElement = isAccumulate ? (
    <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
  ) : (
    <Area
      type="monotone"
      dataKey="value"
      stroke="#22d3ee"
      fill="#22d3ee"
      fillOpacity={0.3}
      isAnimationActive={false}
    />
  );

  const referenceLine = isAccumulate ? <ReferenceLine y={resolvedTarget} stroke="#f97316" strokeDasharray="6 6" /> : null;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Current 30-minute block</h2>
          <p className="text-sm text-slate-400">Window {windowLabel}</p>
        </div>
        <div className="rounded-md border border-slate-800 px-4 py-2 text-xs text-slate-400">
          Target {resolvedTarget.toFixed(1)} kWh · Accumulated {block?.accumulated_kwh.toFixed(2) ?? "—"} kWh
        </div>
      </header>
      <div className="h-72 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
            <span className="text-sm text-slate-500">Loading chart…</span>
          </div>
        ) : chartData.length === 0 ? (
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
              <Tooltip content={<CustomTooltip target={resolvedTarget} mode={mode} binSeconds={binSeconds} />} />
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
  payload?: { value: number }[];
  label?: number;
  target: number;
  mode: "accumulate" | "non-accumulate";
  binSeconds: number;
};

function CustomTooltip({ active, payload, label, target, mode, binSeconds }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) {
    return null;
  }
  const value = payload[0]?.value ?? 0;
  const pct = target > 0 ? ((value / target) * 100).toFixed(1) : "0";
  const isAccumulate = mode === "accumulate";
  const labelText = isAccumulate ? "Accumulated" : `Usage per ${binSeconds}s`;
  const timeLabel = windowFormatter.format(label);

  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold">{timeLabel} · {tooltipFormatter.format(value)} kWh</p>
      <p className="text-slate-400">{labelText} · {pct}% of target</p>
    </div>
  );
}
