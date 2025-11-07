"use client";

import { ReactNode } from "react";
import StatusBadge, { type Status } from "./status-badge";
import { Button } from "@/components/ui/button";

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
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="max-w-xl text-sm text-slate-400">{description}</p>
        </div>
        <StatusBadge status={status} />
      </header>
      {meta && <div className="text-xs text-slate-400">{meta}</div>}
      <div className="flex flex-col gap-4 text-sm text-slate-300">{body}</div>
      {onRun && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={onRun}
            disabled={disabled}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
