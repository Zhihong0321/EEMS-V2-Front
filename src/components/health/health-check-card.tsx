"use client";

import { ReactNode } from "react";
import StatusBadge, { type Status } from "./status-badge";

type Props = {
  title: string;
  description: string;
  status: Status;
  meta?: ReactNode;
  body?: ReactNode;
  onRun?: () => void;
  actionLabel?: string;
  disabled?: boolean;
};

export default function HealthCheckCard({
  title,
  description,
  status,
  meta,
  body,
  onRun,
  actionLabel = "Run check",
  disabled
}: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="max-w-xl text-sm text-slate-400">{description}</p>
        </div>
        <StatusBadge status={status} />
      </header>
      {meta && <div className="text-xs text-slate-400">{meta}</div>}
      <div className="flex flex-col gap-4 text-sm text-slate-300">{body}</div>
      {onRun && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRun}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </section>
  );
}
