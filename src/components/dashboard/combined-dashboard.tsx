"use client";

// RESPONSIVE-AWARE: This component uses responsive Tailwind classes
// Mobile: Stacks vertically | Desktop: Side-by-side layouts
// See docs/RESPONSIVE.md for guidelines

import { useCallback, useEffect, useMemo, useState } from "react";
import { CurrentBlockChart } from "./current-block-chart";
import { BlockHistoryTiles } from "./block-history-tiles";
import { LiveStatus } from "./live-status";
import { AutoRunPanel } from "../common/auto-run-panel";
import { ManualRunPanel } from "../common/manual-run-panel";
import { useBlockHistory, useLatestBlock } from "@/lib/hooks";
import { useAutoEmitter, useManualEmitter } from "@/lib/emitter";
import type { HistoryBlock, LatestBlock, TickIn, Simulator } from "@/lib/types";
import { Select } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { NotificationManager } from "@/components/notifications";
import { MaximumDemandPanel } from "./maximum-demand-panel";
import { 
  ChartBarIcon, 
  BellIcon 
} from "@heroicons/react/24/outline";
import clsx from "clsx";

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1
});

const timezoneLabel = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

type CombinedDashboardProps = {
  simulatorId: string;
  simulatorName: string;
  simulator?: Simulator;
  targetKwh?: number;
  initialBlock: LatestBlock | null;
  initialHistory: HistoryBlock[];
};

export function CombinedDashboard({
  simulatorId,
  simulatorName,
  simulator,
  targetKwh,
  initialBlock,
  initialHistory
}: CombinedDashboardProps) {
  
  // DEPLOYMENT TEST - REMOVE THIS AFTER CONFIRMING UPDATE
  const deploymentTest = {
    timestamp: new Date().toISOString(),
    random: Math.random(),
    message: "🚨 DEPLOYMENT UPDATED! 🚨"
  };
  const [activeTab, setActiveTab] = useState<"dashboard" | "notifications">("dashboard");
  const [chartMode, setChartMode] = useState<"accumulate" | "non-accumulate">("accumulate");
  const [fastForwardEnabled, setFastForwardEnabled] = useState(true); // Fast-forward enabled by default
  const [lastReadingTs, setLastReadingTs] = useState<string | null>(null);
  
  // Simulator settings
  const [baseKw, setBaseKw] = useState(320);
  const [volatility, setVolatility] = useState(12);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [maxKw, setMaxKw] = useState(800);
  const [targetPeakKwh, setTargetPeakKwh] = useState(100); // Target accumulated_kwh for the 30-minute block

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
      onWindowChange: handleWindowChange
    },
    initialBlock
  );

  // Simple: trigger refresh when tick is sent (for immediate chart updates)
  const handleTickSent = useCallback((tick: TickIn) => {
    if (tick.device_ts) {
      setLastReadingTs(tick.device_ts);
      // Trigger refresh to get latest block data (debounced by hook)
      void refreshBlock();
    }
  }, [refreshBlock]);

  // Emitters
  const autoEmitter = useAutoEmitter(simulatorId, baseKw, volatility, fastForwardEnabled, handleTickSent, simulatorName);
  const manualEmitter = useManualEmitter(simulatorId, () => manualPowerKw, fastForwardEnabled, handleTickSent);

  // Periodic polling while simulator is running (for reliable updates)
  useEffect(() => {
    const isRunning = autoEmitter.isRunning || manualEmitter.isRunning;
    if (!isRunning) return;

    // Poll every 2 seconds while simulator is running
    const pollInterval = setInterval(() => {
      void refreshBlock();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [autoEmitter.isRunning, manualEmitter.isRunning, refreshBlock]);

  // Use SSE lastReadingTs (most reliable)
  const effectiveLastReadingTs = sseLastReadingTs ?? lastReadingTs;

  // Debug: Log history blocks when they change
  useEffect(() => {
    console.log('📊 Dashboard history blocks:', { 
      count: history.length, 
      blocks: history,
      loading: historyLoading 
    });
  }, [history, historyLoading]);

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
    <section className="space-y-6 animate-fadeIn">
      

      
      {/* Header - Responsive: stacks on mobile, side-by-side on desktop */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Simulator Dashboard</p>
          <h1>{simulatorName}</h1>
          <p className="text-sm sm:text-base text-slate-400">
            {activeTab === "dashboard" 
              ? "Live chart and block history update in real time via server-sent events from the backend."
              : "Manage WhatsApp notifications for energy usage thresholds."
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 sm:px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Target</p>
            <p className="text-sm sm:text-base font-semibold text-slate-100">{targetKwh ? `${targetKwh.toFixed(1)} kWh` : "—"}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 sm:px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current block</p>
            <p className={`text-sm sm:text-base font-semibold ${percentVariant}`}>
              {percentFormatter.format(percentOfTarget)}%
            </p>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={clsx(
              "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === "dashboard"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300"
            )}
          >
            <ChartBarIcon className="h-5 w-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={clsx(
              "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === "notifications"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300"
            )}
          >
            <BellIcon className="h-5 w-5" />
            Notifications
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Chart Mode Toggle and Peak Target - Responsive: wraps on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <label htmlFor="chart-mode-select" className="text-sm font-medium text-slate-300">Chart Mode:</label>
          <Select
            id="chart-mode-select"
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value as "accumulate" | "non-accumulate")}
            className="w-full sm:w-auto"
            aria-label="Select chart mode"
          >
            <option value="accumulate">Accumulate</option>
            <option value="non-accumulate">Non-Accumulate (Peak Usage)</option>
          </Select>
          
          {/* Target Accumulated input - ONLY visible in Non-Accumulate mode */}
          {chartMode === "non-accumulate" && (
            <>
              <label htmlFor="target-peak-kwh" className="text-sm font-medium text-slate-300 sm:ml-4">Target Accumulated (kWh):</label>
              <Input
                id="target-peak-kwh"
                type="number"
                value={targetPeakKwh}
                onChange={(e) => setTargetPeakKwh(parseFloat(e.target.value) || 100)}
                min="0"
                step="0.1"
                className="w-full sm:w-32"
                aria-label="Target accumulated kWh for peak usage mode"
              />
            </>
          )}
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
          targetPeakKwh={chartMode === "non-accumulate" ? targetPeakKwh : undefined}
          mode={chartMode}
          lastReadingTs={effectiveLastReadingTs}
        />
        <div className="flex flex-col gap-6">
          <LiveStatus
            connected={connected}
            reconnecting={reconnecting}
            lastReadingTs={effectiveLastReadingTs ?? undefined}
            block={block}
            targetKwh={targetKwh}
            targetPeakKwh={chartMode === "non-accumulate" ? targetPeakKwh : undefined}
          />
          <BlockHistoryTiles history={history} loading={historyLoading} />
        </div>
      </div>

      {/* Maximum Demand Charge Panel */}
      <MaximumDemandPanel
        historyBlocks={history}
        tariffType={simulator?.tariff_type || "Medium"}
        plantName={simulator?.plant_name || simulatorName}
      />



      {/* Simulator Controls Section (Bottom) - Responsive: stacks on mobile */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2>Simulator Controls</h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure auto and manual emitters. Only one mode can run at a time.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 min-h-[44px]">
            <input
              type="checkbox"
              checked={fastForwardEnabled}
              onChange={(e) => setFastForwardEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-2 focus:ring-primary"
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
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6">
          <NotificationManager 
            simulatorId={simulatorId} 
            simulatorName={simulatorName}
          />
        </div>
      )}
    </section>
  );
}

