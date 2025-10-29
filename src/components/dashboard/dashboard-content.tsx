"use client";

import { useCallback } from "react";
import Link from "next/link";
import { CurrentBlockChart } from "./current-block-chart";
import { BlockHistoryTiles } from "./block-history-tiles";
import { LiveStatus } from "./live-status";
import { useBlockHistory, useLatestBlock } from "@/lib/hooks";
import type { HistoryBlock, LatestBlock } from "@/lib/types";

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
  const {
    history,
    loading: historyLoading,
    refresh: refreshHistory
  } = useBlockHistory(simulatorId, 10, initialHistory);

  const handleWindowChange = useCallback(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const { block, loading: blockLoading, connected, reconnecting, lastReadingTs } = useLatestBlock(
    simulatorId,
    {
      onWindowChange: handleWindowChange
    },
    initialBlock
  );

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
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <CurrentBlockChart block={block} loading={blockLoading} targetKwh={targetKwh} />
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
