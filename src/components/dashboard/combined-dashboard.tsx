"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CurrentBlockChart } from "./current-block-chart";
import { BlockHistoryTiles } from "./block-history-tiles";
import { LiveStatus } from "./live-status";
import { AutoRunPanel } from "../common/auto-run-panel";
import { ManualRunPanel } from "../common/manual-run-panel";
import { useBlockHistory, useLatestBlock } from "@/lib/hooks";
import { useAutoEmitter, useManualEmitter } from "@/lib/emitter";
import type { HistoryBlock, LatestBlock, TickIn } from "@/lib/types";
import { getCurrentBlockFromReading } from "@/lib/block-utils";

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1
});

const timezoneLabel = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

type CombinedDashboardProps = {
  simulatorId: string;
  simulatorName: string;
  targetKwh?: number;
  initialBlock: LatestBlock | null;
  initialHistory: HistoryBlock[];
};

export function CombinedDashboard({
  simulatorId,
  simulatorName,
  targetKwh,
  initialBlock,
  initialHistory
}: CombinedDashboardProps) {
  const [chartMode, setChartMode] = useState<"accumulate" | "non-accumulate">("accumulate");
  const [fastForwardEnabled, setFastForwardEnabled] = useState(true); // Fast-forward enabled by default
  const [lastReadingTs, setLastReadingTs] = useState<string | null>(null);
  
  // Simulator settings
  const [baseKw, setBaseKw] = useState(320);
  const [volatility, setVolatility] = useState(12);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [maxKw, setMaxKw] = useState(800);

  const manualPowerKw = useMemo(() => sliderValue * maxKw, [sliderValue, maxKw]);

  // Dashboard hooks
  const {
    history,
    loading: historyLoading,
    refresh: refreshHistory
  } = useBlockHistory(simulatorId, 10, initialHistory);

  const handleWindowChange = useCallback(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const { block, loading: blockLoading, connected, reconnecting, lastReadingTs: sseLastReadingTs, refresh: refreshBlock } = useLatestBlock(
    simulatorId,
    {
      onWindowChange: handleWindowChange,
      externalLastReadingTs: lastReadingTs // Pass external lastReadingTs to hook
    },
    initialBlock
  );

  // Track current block to detect changes
  const currentBlockRef = useRef<string | null>(null);

  // Initialize current block ref when block is loaded
  useEffect(() => {
    if (block?.block_start_local && !currentBlockRef.current) {
      currentBlockRef.current = block.block_start_local;
    }
  }, [block]);

  // Track last reading timestamp from emitter and detect block changes
  const handleTickSent = useCallback((tick: TickIn) => {
    setLastReadingTs(tick.device_ts);
    
    // Detect block change and trigger refresh
    if (tick.device_ts) {
      const currentBlock = getCurrentBlockFromReading(tick.device_ts);
      if (currentBlock && currentBlockRef.current !== currentBlock.start) {
        currentBlockRef.current = currentBlock.start;
        // Trigger refresh when block changes
        void refreshBlock();
        void refreshHistory();
      }
    }
  }, [refreshBlock, refreshHistory]);

  // Emitters
  const autoEmitter = useAutoEmitter(simulatorId, baseKw, volatility, fastForwardEnabled, handleTickSent);
  const manualEmitter = useManualEmitter(simulatorId, () => manualPowerKw, fastForwardEnabled, handleTickSent);

  // Use SSE lastReadingTs if available, otherwise use emitter's lastReadingTs
  const effectiveLastReadingTs = sseLastReadingTs ?? lastReadingTs;

  const toggleAuto = () => {
    if (autoEmitter.isRunning) {
      autoEmitter.stop();
    } else {
      manualEmitter.stop();
      autoEmitter.start();
    }
  };

  const toggleManual = () => {
    if (manualEmitter.isRunning) {
      manualEmitter.stop();
    } else {
      autoEmitter.stop();
      manualEmitter.start();
    }
  };

  const percentOfTarget = block?.percent_of_target ?? 0;
  const percentVariant = percentOfTarget > 100 ? "text-danger" : percentOfTarget >= 80 ? "text-warning" : "text-success";

  return (
    <section className="space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Simulator Dashboard</p>
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
        </div>
      </header>

      {/* Chart Mode Toggle */}
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

      {/* Dashboard Section (Top) */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <CurrentBlockChart 
          block={block ?? { 
            simulator_id: simulatorId,
            block_start_local: new Date().toISOString(), 
            block_start_utc: new Date().toISOString(),
            block_end_utc: new Date().toISOString(),
            target_kwh: targetKwh ?? 0,
            accumulated_kwh: 0, 
            percent_of_target: 0, 
            alerted_80pct: false,
            chart_bins: { bin_seconds: 30, points: [] } 
          }} 
          loading={blockLoading}
          targetKwh={targetKwh}
          mode={chartMode}
          lastReadingTs={effectiveLastReadingTs}
        />
        <div className="flex flex-col gap-6">
          <LiveStatus
            connected={connected}
            reconnecting={reconnecting}
            lastReadingTs={effectiveLastReadingTs ?? undefined}
            simulatorId={simulatorId}
          />
          <BlockHistoryTiles history={history} loading={historyLoading} />
        </div>
      </div>

      {/* Simulator Controls Section (Bottom) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Simulator Controls</h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure auto and manual emitters. Only one mode can run at a time.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={fastForwardEnabled}
              onChange={(e) => setFastForwardEnabled(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-2 focus:ring-primary"
            />
            <span>Fast-forward (30x speed)</span>
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AutoRunPanel
            baseKw={baseKw}
            onBaseKwChange={setBaseKw}
            volatility={volatility}
            onVolatilityChange={setVolatility}
            isRunning={autoEmitter.isRunning}
            onStart={toggleAuto}
            onStop={toggleAuto}
            sentCount={autoEmitter.sentCount}
            lastSentAt={autoEmitter.lastSentAt}
            disabled={manualEmitter.isRunning}
            disabledReason={manualEmitter.isRunning ? "Manual emitter is active. Stop it before running auto mode." : undefined}
          />
          <ManualRunPanel
            sliderValue={sliderValue}
            onSliderChange={setSliderValue}
            maxKw={maxKw}
            onMaxKwChange={setMaxKw}
            isRunning={manualEmitter.isRunning}
            onStart={toggleManual}
            onStop={toggleManual}
            sentCount={manualEmitter.sentCount}
            lastSentAt={manualEmitter.lastSentAt}
            disabled={autoEmitter.isRunning}
            disabledReason={autoEmitter.isRunning ? "Auto emitter is active. Stop it before running manual mode." : undefined}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Timezone reference: {timezoneLabel}. Chart displays the current 30-minute block based on the last received reading timestamp (prototype mode). Fast-forward mode advances simulated time by 30 seconds per real second.
      </p>
    </section>
  );
}

