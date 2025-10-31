"use client";

import type { ChangeEvent } from "react";
import { BoltIcon, PlayIcon, StopIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

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
    <article className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Auto mode</h2>
          <p className="text-sm text-slate-400">Emit one tick every second with gaussian noise. Fast-forward mode advances simulated time by 30 seconds per real second.</p>
        </div>
        <BoltIcon className="h-8 w-8 text-cyan-500" aria-hidden="true" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Base kW</span>
          <input
            type="number"
            min={0}
            step={1}
            value={baseKw}
            onChange={handleBaseChange}
            className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Volatility %</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={volatility}
            onChange={handleVolatilityChange}
            className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
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
      <button
        type="button"
        onClick={isRunning ? onStop : onStart}
        disabled={disabled}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          disabled
            ? "cursor-not-allowed bg-slate-800/60 text-slate-500"
            : isRunning
              ? "bg-danger/80 text-white hover:bg-danger"
              : "bg-primary text-primary-foreground hover:bg-cyan-600"
        )}
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
      </button>
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
