"use client";

import type { LatestBlock } from "@/lib/types";
import { useEffect, useState } from "react";

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
 * Fixed: Always uses accumulated_kwh (cumulative) and projects forward correctly
 */
function calculateProjection(block: LatestBlock | null | undefined, targetKwh: number): {
  projectedTotal: number;
  status: "SAFE" | "VERY CLOSE" | "OVER";
  color: string;
  elapsedMinutes: number;
  currentAccumulated: number;
  fillPercentage: number;
} {
  if (!block || !block.block_start_local || targetKwh <= 0) {
    return {
      projectedTotal: 0,
      status: "SAFE",
      color: "bg-emerald-500",
      elapsedMinutes: 0,
      currentAccumulated: 0,
      fillPercentage: 0
    };
  }

  const blockStart = new Date(block.block_start_local);
  const now = new Date();
  const elapsedMs = Math.max(0, now.getTime() - blockStart.getTime());
  const elapsedMinutes = elapsedMs / (1000 * 60);
  
  // Ensure elapsed time doesn't exceed 30 minutes (block duration)
  const cappedElapsedMinutes = Math.min(30, elapsedMinutes);
  const currentAccumulated = block.accumulated_kwh ?? 0;

  // Calculate fill percentage (current / target)
  const fillPercentage = Math.min(100, (currentAccumulated / targetKwh) * 100);

  // If less than 1 minute has elapsed or no data, use current accumulated as projection
  if (cappedElapsedMinutes < 1 || currentAccumulated === 0) {
    const currentPercent = fillPercentage;
    return {
      projectedTotal: currentAccumulated,
      status: currentPercent < 80 ? "SAFE" : currentPercent < 100 ? "VERY CLOSE" : "OVER",
      color: currentPercent < 80 ? "bg-emerald-500" : currentPercent < 100 ? "bg-amber-500" : "bg-red-500",
      elapsedMinutes: cappedElapsedMinutes,
      currentAccumulated,
      fillPercentage
    };
  }

  // Calculate average usage per minute
  // FIXED: Use accumulated_kwh (cumulative total) divided by elapsed minutes
  // Example: If 400 kWh accumulated in 10 minutes, avg = 40 kWh/min, projection = 40 * 30 = 1200 kWh
  const averagePerMinute = currentAccumulated / cappedElapsedMinutes;
  
  // Project to full 30 minutes: average per minute * 30 minutes
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
    elapsedMinutes: cappedElapsedMinutes,
    currentAccumulated,
    fillPercentage
  };
}

export function LiveStatus({ connected, reconnecting, lastReadingTs, block, targetKwh }: LiveStatusProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for smooth bucket animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Calculate projection (time updates every second via useEffect, triggering fresh calculation)
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

      {/* Bucket Visualization */}
      {block && effectiveTarget > 0 && (
        <div className="mt-6 space-y-4">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Usage Bucket</div>
          
          {/* Bucket Container */}
          <div className="relative">
            {/* Bucket outline */}
            <div className="relative h-48 w-full rounded-b-lg border-4 border-slate-600 bg-slate-800/50 overflow-hidden">
              {/* Water fill */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
                style={{
                  height: `${Math.min(100, projection.fillPercentage)}%`,
                  backgroundColor: projection.fillPercentage < 80 
                    ? "#22c55e" // green
                    : projection.fillPercentage < 100 
                    ? "#f59e0b" // amber
                    : "#ef4444" // red
                }}
              >
                {/* Water animation effect */}
                <div className="absolute inset-0 opacity-20 bg-gradient-to-t from-transparent via-white to-transparent animate-pulse" />
                
                {/* Fill level indicator line */}
                {projection.fillPercentage > 0 && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/50" />
                )}
              </div>

              {/* Target line (80%) */}
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 opacity-60"
                style={{ bottom: '20%' }}
              >
                <span className="absolute -left-12 -top-2 text-xs text-amber-400">80%</span>
              </div>

              {/* Target line (100%) */}
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 opacity-60"
                style={{ bottom: '0%' }}
              >
                <span className="absolute -left-12 -top-2 text-xs text-red-400">100%</span>
              </div>

              {/* Current level text overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white drop-shadow-lg">
                    {projection.currentAccumulated.toFixed(2)} kWh
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {projection.fillPercentage.toFixed(1)}% filled
                  </div>
                </div>
              </div>
            </div>

            {/* Bucket handle */}
            <div className="absolute -top-2 -left-3 w-8 h-4 border-2 border-slate-600 rounded-t-full" />
            <div className="absolute -top-2 -right-3 w-8 h-4 border-2 border-slate-600 rounded-t-full" />
          </div>

          {/* Bucket info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
              <div className="text-slate-400">Target</div>
              <div className="text-white font-semibold">{effectiveTarget.toFixed(2)} kWh</div>
            </div>
            <div className="rounded border border-slate-700 bg-slate-800/50 p-2">
              <div className="text-slate-400">Current</div>
              <div className="text-white font-semibold">{projection.currentAccumulated.toFixed(2)} kWh</div>
            </div>
          </div>

          {/* Projection Status LED Box */}
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
