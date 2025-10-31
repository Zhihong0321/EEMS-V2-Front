"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { CurrentBlockChart } from "./current-block-chart";
import { BlockHistoryTiles } from "./block-history-tiles";
import { LiveStatus } from "./live-status";
import { useBlockHistory, useLatestBlock } from "@/lib/hooks";
import type { HistoryBlock, LatestBlock } from "@/lib/types";
import { useState } from "react";

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1
});

const timezoneLabel = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

type DashboardContentProps = {
  simulatorId: string;
  simulatorName: string;
  targetKwh?: number;
  initialBlock: LatestBlock | null;
  initialHistory: HistoryBlock[];
};

export function DashboardContent({
  simulatorId,
  simulatorName,
  targetKwh,
  initialBlock,
  initialHistory
}: DashboardContentProps) {
  const [chartMode, setChartMode] = useState<"accumulate" | "non-accumulate">("accumulate");

  const {
    history,
    loading: historyLoading,
    refresh: refreshHistory
  } = useBlockHistory(simulatorId, 10, initialHistory);

  const handleWindowChange = useCallback(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const { block, loading: blockLoading, connected, reconnecting, lastReadingTs, rawReadings, refresh: refreshBlock } = useLatestBlock(
    simulatorId,
    {
      onWindowChange: handleWindowChange
    },
    initialBlock
  );

  useEffect(() => {
    if (lastReadingTs && chartMode === "non-accumulate") {
      refreshBlock();
    }
  }, [lastReadingTs, refreshBlock, chartMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshBlock();
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [refreshBlock]);

  const percentOfTarget = block?.percent_of_target ?? 0;
  const percentVariant = percentOfTarget > 100 ? "text-danger" : percentOfTarget >= 80 ? "text-warning" : "text-success";

  return (
    <section className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Simulator</p>
          <h1 className="text-3xl font-semibold text-white">{simulatorName}</h1>
          <p className="text-sm text-slate-400">
            Live chart and block history update in real time via server-sent events from the backend.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Target</p>
            <p className="text-base font-semibold text-slate-100">{targetKwh ? `${targetKwh.toFixed(1)} kWh` : "—"}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current block</p>
            <p className={`text-base font-semibold ${percentVariant}`}>
              {percentFormatter.format(percentOfTarget)}%
            </p>
          </div>
          <Link
            href={{ pathname: "/sim/[id]/run", query: { id: simulatorId } }}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-cyan-600"
          >
            Open controls
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-300">Chart Mode:</label>
          <select
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value as "accumulate" | "non-accumulate")}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="accumulate">Accumulate</option>
            <option value="non-accumulate">Non-Accumulate (Raw Readings)</option>
          </select>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <CurrentBlockChart 
          block={block ?? { start_ts: new Date().toISOString(), accumulated_kwh: 0, percent_of_target: 0, chart_bins: { bin_seconds: 30, points: [] } }} 
          accumulate={chartMode === "accumulate"}
          rawReadings={chartMode === "non-accumulate" ? rawReadings : undefined}
        />
        <div className="flex flex-col gap-6">
          <LiveStatus
            connected={connected}
            reconnecting={reconnecting}
            lastReadingTs={lastReadingTs}
            simulatorId={simulatorId}
          />
          <BlockHistoryTiles history={history} loading={historyLoading} />
        </div>
      </div>

      <p className="text-xs text-slate-500">Timezone reference: {timezoneLabel}. SSE events automatically trigger a history refresh when the backend rolls to a new block.</p>
    </section>
  );
}
