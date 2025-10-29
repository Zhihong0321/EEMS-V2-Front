"use client";

type LiveStatusProps = {
  connected: boolean;
  reconnecting: boolean;
  lastReadingTs?: string;
  simulatorId?: string;
};

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: TIMEZONE
});

export function LiveStatus({ connected, reconnecting, lastReadingTs, simulatorId }: LiveStatusProps) {
  let indicatorClass = "bg-slate-500";
  let statusText = "Disconnected";

  if (connected) {
    indicatorClass = "bg-emerald-400 animate-pulse";
    statusText = "Connected";
  } else if (reconnecting) {
    indicatorClass = "bg-amber-400 animate-pulse";
    statusText = "Reconnecting";
  }

  const formatted = lastReadingTs ? timeFormatter.format(new Date(lastReadingTs)) : "—";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Live status</h2>
      <div className="mt-4 flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${indicatorClass}`} aria-hidden="true" />
        <span className="text-sm text-slate-200">{statusText}</span>
      </div>
      <dl className="mt-4 space-y-2 text-xs text-slate-400">
        <div>
          <dt className="uppercase tracking-[0.2em] text-slate-500">Last reading</dt>
          <dd className="mt-1 text-sm text-slate-200">{formatted}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.2em] text-slate-500">SSE endpoint</dt>
          <dd className="mt-1 text-sm text-slate-200">/api/v1/stream/{simulatorId ?? "<id>"}</dd>
        </div>
      </dl>
    </div>
  );
}
