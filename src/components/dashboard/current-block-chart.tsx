"use client";

import {
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
};

type ChartPoint = {
  index: number;
  minute: number;
  value: number;
};

function buildChartData(block: LatestBlock | null): ChartPoint[] {
  if (!block) {
    return [];
  }
  const binSeconds = block.chart_bins?.bin_seconds ?? 30;
  const binMinutes = binSeconds / 60;
  return block.chart_bins?.points.map((value, index) => ({
    index,
    minute: Number(((index + 1) * binMinutes).toFixed(2)),
    value
  })) ?? [];
}

function formatWindow(block: LatestBlock | null): string {
  if (!block) return "—";
  try {
    const start = new Date(block.block_start_local);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return `${windowFormatter.format(start)} – ${windowFormatter.format(end)}`;
  } catch {
    return block.block_start_local;
  }
}

export function CurrentBlockChart({ block, loading, targetKwh }: CurrentBlockChartProps) {
  const chartData = buildChartData(block);
  const resolvedTarget = targetKwh ?? block?.target_kwh ?? 0;
  const windowLabel = formatWindow(block);

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
            <LineChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" />
              <XAxis
                dataKey="minute"
                type="number"
                tickFormatter={(value) => `${value}`}
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
              <Tooltip content={<CustomTooltip target={resolvedTarget} />} />
              <ReferenceLine y={resolvedTarget} stroke="#f97316" strokeDasharray="6 6" />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
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
};

function CustomTooltip({ active, payload, label, target }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const value = payload[0]?.value ?? 0;
  const minutes = label ?? 0;
  const pct = target > 0 ? ((value / target) * 100).toFixed(1) : "0";

  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold">{tooltipFormatter.format(value)} kWh</p>
      <p className="text-slate-400">{minutes.toFixed(1)} min · {pct}% of target</p>
    </div>
  );
}
