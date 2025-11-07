"use client";

// RESPONSIVE-AWARE: Uses responsive classes for mobile-friendly layout
// See docs/RESPONSIVE.md for guidelines

import type { ChangeEvent } from "react";
import { BoltIcon, PlayIcon, StopIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AutoRunPanelProps = {
  baseKw: number;
  onBaseKwChange: (value: number) => void;
  volatility: number;
  onVolatilityChange: (value: number) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  sentCount: number;
  lastSentAt?: string;
  disabled?: boolean;
  disabledReason?: string;
};

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

export function AutoRunPanel({
  baseKw,
  onBaseKwChange,
  volatility,
  onVolatilityChange,
  isRunning,
  onStart,
  onStop,
  sentCount,
  lastSentAt,
  disabled,
  disabledReason
}: AutoRunPanelProps) {
  const handleBaseChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBaseKwChange(Number(event.target.value));
  };

  const handleVolatilityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(0, Math.min(100, Number(event.target.value)));
    onVolatilityChange(next);
  };

  const formattedLastSent = lastSentAt ? timeFormatter.format(new Date(lastSentAt)) : "—";

  return (
    <article className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Auto mode</h3>
          <p className="text-sm text-slate-400">Emit one tick every second with gaussian noise. Fast-forward mode advances simulated time by 30 seconds per real second.</p>
        </div>
        <BoltIcon className="h-8 w-8 text-cyan-500" aria-hidden="true" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Base kW</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={baseKw}
            onChange={handleBaseChange}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Volatility %</span>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={volatility}
            onChange={handleVolatilityChange}
          />
        </label>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
        <p>Next tick interval: <span className="font-semibold text-slate-200">1 second</span></p>
        <p className="mt-1">
          Expected power window: <span className="font-semibold text-slate-200">{numberFormatter.format(Math.max(0, Math.round(baseKw * (1 - volatility / 100))))}</span> – {" "}
          <span className="font-semibold text-slate-200">{numberFormatter.format(Math.round(baseKw * (1 + volatility / 100)))}</span> kW
        </p>
      </div>
      <Button
        variant={isRunning ? "danger" : "primary"}
        size="md"
        onClick={isRunning ? onStop : onStart}
        disabled={disabled}
        className="w-full"
      >
        {isRunning ? (
          <>
            <StopIcon className="h-4 w-4" aria-hidden="true" /> Stop auto run
          </>
        ) : (
          <>
            <PlayIcon className="h-4 w-4" aria-hidden="true" /> Start auto run
          </>
        )}
      </Button>
      {disabled && disabledReason ? (
        <p className="text-xs text-warning">{disabledReason}</p>
      ) : null}
      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
        <div>
          <dt className="uppercase tracking-[0.2em] text-slate-600">Ticks sent</dt>
          <dd className="mt-1 text-sm text-slate-200">{sentCount}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.2em] text-slate-600">Last tick</dt>
          <dd className="mt-1 text-sm text-slate-200">{formattedLastSent}</dd>
        </div>
      </dl>
    </article>
  );
}
