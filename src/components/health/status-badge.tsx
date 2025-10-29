import clsx from "clsx";

type Status = "idle" | "running" | "success" | "error";

const STATUS_STYLES: Record<Status, string> = {
  idle: "bg-slate-800 text-slate-300 ring-1 ring-inset ring-slate-700",
  running: "bg-amber-500/20 text-amber-200 ring-1 ring-inset ring-amber-400/60",
  success: "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/70",
  error: "bg-rose-500/20 text-rose-200 ring-1 ring-inset ring-rose-400/60"
};

export function statusLabel(status: Status) {
  switch (status) {
    case "running":
      return "Running";
    case "success":
      return "Healthy";
    case "error":
      return "Issue";
    default:
      return "Idle";
  }
}

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        STATUS_STYLES[status]
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {statusLabel(status)}
    </span>
  );
}

export type { Status };
