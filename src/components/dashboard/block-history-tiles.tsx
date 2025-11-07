"use client";

import type { HistoryBlock } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

const windowFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIMEZONE
});

type BlockHistoryTilesProps = {
  history: HistoryBlock[];
  loading: boolean;
};

export function BlockHistoryTiles({ history, loading }: BlockHistoryTilesProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 shadow-md hover:shadow-lg transition-shadow duration-300" role="region" aria-label="Block history">
      <h3 className="text-lg font-semibold text-white">History (last 10 blocks)</h3>
      {loading ? (
        <ul className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : history.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No block history yet. Run the simulator to populate readings.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {history.map((block, index) => {
            const percent = block.percent_of_target;
            const variant = percent > 100 ? "text-danger" : percent >= 80 ? "text-warning" : "text-success";
            let windowLabel = "";
            try {
              const start = new Date(block.block_start_local);
              const end = new Date(start.getTime() + 30 * 60 * 1000);
              windowLabel = `${windowFormatter.format(start)} – ${windowFormatter.format(end)}`;
            } catch {
              windowLabel = block.block_start_local;
            }
            return (
              <li key={`${block.block_start_local}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-100">{windowLabel}</p>
                  <p className="text-xs text-slate-500">
                    {block.accumulated_kwh.toFixed(2)} / {block.target_kwh.toFixed(1)} kWh
                  </p>
                </div>
                <span className={`text-sm font-semibold ${variant}`}>{percent.toFixed(1)}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
