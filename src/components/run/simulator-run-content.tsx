"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AutoRunPanel } from "@/components/common/auto-run-panel";
import { ManualRunPanel } from "@/components/common/manual-run-panel";
import { useAutoEmitter, useManualEmitter } from "@/lib/emitter";

type SimulatorRunContentProps = {
  simulatorId: string;
  simulatorName: string;
  targetKwh?: number;
};

export function SimulatorRunContent({ simulatorId, simulatorName, targetKwh }: SimulatorRunContentProps) {
  const [baseKw, setBaseKw] = useState(320);
  const [volatility, setVolatility] = useState(12);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [maxKw, setMaxKw] = useState(800);

  const manualPowerKw = useMemo(() => sliderValue * maxKw, [sliderValue, maxKw]);

  const autoEmitter = useAutoEmitter(simulatorId, baseKw, volatility);
  const manualEmitter = useManualEmitter(simulatorId, () => manualPowerKw);

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

  const timezoneLabel = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";
  const dashboardHref = { pathname: "/sim/[id]" as const, query: { id: simulatorId } };

  return (
    <section className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Simulator controls</p>
          <h1 className="text-3xl font-semibold text-white">{simulatorName}</h1>
          <p className="text-sm text-slate-400">
            Configure auto and manual emitters. Only one mode can run at a time to avoid duplicate ticks.
          </p>
          <p className="text-xs text-slate-500">Target block: {targetKwh ? `${targetKwh} kWh` : "—"} · Timezone {timezoneLabel}</p>
        </div>
        <Link
          href={dashboardHref}
          className="inline-flex items-center rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          Back to dashboard
        </Link>
      </header>

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

      <p className="text-xs text-slate-500">
        Auto mode sends gaussianised readings every 15 seconds; manual fast-forward emits every second with <code className="rounded bg-slate-800 px-1 py-0.5">sample_seconds=15</code> so the backend advances by 15 seconds per tick.
      </p>
    </section>
  );
}
