"use client";

export type LogEntry = {
  id: string;
  title: string;
  status: "success" | "error";
  detail: string;
  timestamp: string;
};

type Props = {
  entries: LogEntry[];
};

export default function ResultLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 px-4 py-6 text-center text-xs text-slate-500">
        Run any check to start logging responses.
      </p>
    );
  }

  return (
    <ul className="space-y-3 text-xs">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-lg border border-slate-800 bg-slate-900/30 p-3 text-left text-slate-300 shadow-inner shadow-slate-950/30"
        >
          <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-slate-500">
            <span>{entry.title}</span>
            <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-white">{entry.status === "success" ? "Success" : "Error"}</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
            {entry.detail}
          </pre>
        </li>
      ))}
    </ul>
  );
}
