"use client";

// RESPONSIVE-AWARE: Uses responsive classes for mobile-friendly layout
// See docs/RESPONSIVE.md for guidelines

import type { ChangeEvent } from "react";
import { RocketLaunchIcon, StopIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ManualRunPanelProps = {
  sliderValue: number;
  onSliderChange: (value: number) => void;
  maxKw: number;
  onMaxKwChange: (value: number) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  sentCount: number;
  lastSentAt?: string;
  disabled?: boolean;
  disabledReason?: string;
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

export function ManualRunPanel({
  sliderValue,
  onSliderChange,
  maxKw,
  onMaxKwChange,
  isRunning,
  onStart,
  onStop,
  sentCount,
  lastSentAt,
  disabled,
  disabledReason
}: ManualRunPanelProps) {
  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSliderChange(Number(event.target.value));
  };

  const handleMaxKwChange = (event: ChangeEvent<HTMLInputElement>) => {
    onMaxKwChange(Math.max(0, Number(event.target.value)));
  };

  const powerKw = Math.max(0, sliderValue * maxKw);
  const formattedLastSent = lastSentAt ? timeFormatter.format(new Date(lastSentAt)) : "—";

  return (
    <article className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Manual fast-forward</h3>
          <p className="text-sm text-slate-400">Emit one tick per second using the selected power multiplier.</p>
        </div>
        <RocketLaunchIcon className="h-8 w-8 text-purple-400" aria-hidden="true" />
      </header>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_1fr]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Adjust load multiplier</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full"
            />
            <span className="text-xs text-slate-400">FAST-FORWARD x30 — Multiplier {(sliderValue * 100).toFixed(0)}%</span>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Max power (kW)</span>
            <Input
              type="number"
              min={0}
              step={5}
              value={maxKw}
              onChange={handleMaxKwChange}
            />
          </label>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
          <p>
            Current output: <span className="font-semibold text-slate-200">{powerKw.toFixed(1)}</span> kW
          </p>
          <p className="mt-1">Ticks are emitted every <span className="font-semibold text-slate-200">1 second</span> with <span className="font-semibold text-slate-200">sample_seconds=30</span>. Fast-forward mode advances simulated time by 30 seconds per real second.</p>
        </div>
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
            <StopIcon className="h-4 w-4" aria-hidden="true" /> Stop manual run
          </>
        ) : (
          <>
            <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" /> Start manual run
          </>
        )}
      </Button>
      {disabled && disabledReason ? <p className="text-xs text-warning">{disabledReason}</p> : null}

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
