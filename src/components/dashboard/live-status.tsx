"use client";

import type { LatestBlock } from "@/lib/types";

type LiveStatusProps = {
  connected: boolean;
  reconnecting: boolean;
  lastReadingTs?: string;
  block?: LatestBlock | null;
  targetKwh?: number;
};

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: TIMEZONE
});

/**
 * Calculate projected total usage for the 30-minute block based on current average
 */
function calculateProjection(block: LatestBlock | null | undefined, targetKwh: number): {
  projectedTotal: number;
  status: "SAFE" | "VERY CLOSE" | "OVER";
  color: string;
  elapsedMinutes: number;
} {
  if (!block || !block.block_start_local || targetKwh <= 0) {
    return {
      projectedTotal: 0,
      status: "SAFE",
      color: "bg-emerald-500",
      elapsedMinutes: 0
    };
  }

  const blockStart = new Date(block.block_start_local);
  const now = new Date();
  const elapsedMs = now.getTime() - blockStart.getTime();
  const elapsedMinutes = Math.max(0, elapsedMs / (1000 * 60));

  // If less than 1 minute has elapsed, use current accumulated as projection
  if (elapsedMinutes < 1) {
    const currentPercent = (block.accumulated_kwh / targetKwh) * 100;
    return {
      projectedTotal: block.accumulated_kwh,
      status: currentPercent < 80 ? "SAFE" : currentPercent < 100 ? "VERY CLOSE" : "OVER",
      color: currentPercent < 80 ? "bg-emerald-500" : currentPercent < 100 ? "bg-amber-500" : "bg-red-500",
      elapsedMinutes: elapsedMinutes
    };
  }

  // Calculate average usage per minute
  const averagePerMinute = block.accumulated_kwh / elapsedMinutes;
  
  // Project to full 30 minutes
  const projectedTotal = averagePerMinute * 30;
  
  // Calculate percentage of target
  const percentOfTarget = (projectedTotal / targetKwh) * 100;

  // Determine status and color
  let status: "SAFE" | "VERY CLOSE" | "OVER";
  let color: string;

  if (percentOfTarget < 80) {
    status = "SAFE";
    color = "bg-emerald-500";
  } else if (percentOfTarget < 100) {
    status = "VERY CLOSE";
    color = "bg-amber-500";
  } else {
    status = "OVER";
    color = "bg-red-500";
  }

  return {
    projectedTotal,
    status,
    color,
    elapsedMinutes: Math.min(30, elapsedMinutes)
  };
}

export function LiveStatus({ connected, reconnecting, lastReadingTs, block, targetKwh }: LiveStatusProps) {
  let indicatorClass = "bg-slate-500";
  let statusText = "Disconnected";

  if (connected) {
    indicatorClass = "bg-emerald-400 animate-pulse";
    statusText = "Connected";
  } else if (reconnecting) {
    indicatorClass = "bg-amber-400 animate-pulse";
    statusText = "Reconnecting";
  }

  const formatted = lastReadingTs ? timeFormatter.format(new Date(lastReadingTs)) : "—";

  // Calculate projection
  const effectiveTarget = targetKwh ?? block?.target_kwh ?? 0;
  const projection = calculateProjection(block, effectiveTarget);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Live status</h2>
      <div className="mt-4 flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${indicatorClass}`} aria-hidden="true" />
        <span className="text-sm text-slate-200">{statusText}</span>
      </div>
      <dl className="mt-4 space-y-2 text-xs text-slate-400">
        <div>
          <dt className="uppercase tracking-[0.2em] text-slate-500">Last reading</dt>
          <dd className="mt-1 text-sm text-slate-200">{formatted}</dd>
        </div>
      </dl>

      {/* Projection Status LED Box */}
      {block && effectiveTarget > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">30-Min Projection</div>
          <div className={`${projection.color} rounded-lg p-4 text-center shadow-lg`}>
            <div className="text-2xl font-bold text-white">{projection.status}</div>
            <div className="mt-2 text-xs text-white/90">
              Projected: {projection.projectedTotal.toFixed(2)} kWh
            </div>
            <div className="mt-1 text-xs text-white/80">
              ({((projection.projectedTotal / effectiveTarget) * 100).toFixed(1)}% of target)
            </div>
            {projection.elapsedMinutes > 0 && (
              <div className="mt-1 text-xs text-white/70">
                Based on {projection.elapsedMinutes.toFixed(1)} min avg
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
