import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
      {icon && (
        <div className="rounded-full bg-slate-800/50 p-3 text-slate-500">
          {icon}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400 max-w-md">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

