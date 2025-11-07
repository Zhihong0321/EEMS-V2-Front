"use client";

import { useState } from "react";
import { DashboardContent } from "./dashboard-content";
import type { HistoryBlock, LatestBlock, Simulator } from "@/lib/types";

type InitialDataMap = Record<
  string,
  { initialBlock: LatestBlock | null; initialHistory: HistoryBlock[]; targetKwh: number | undefined }
>;

type EMSDashboardClientProps = {
  simulators: Simulator[];
  initialDataMap: InitialDataMap;
};

export default function EMSDashboardClient({ simulators, initialDataMap }: EMSDashboardClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(simulators[0]?.id ?? null);

  if (simulators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-400">
        <p>No simulators available. Please create one first.</p>
      </div>
    );
  }

  const selectedSim = simulators.find((sim) => sim.id === selectedId);
  const data = initialDataMap[selectedId ?? ""] ?? { initialBlock: null, initialHistory: [], targetKwh: undefined };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">EMS Dashboard</h1>
        <p className="text-sm text-slate-400">Select a meter to view its live chart and block history.</p>
      </header>

      <div className="flex items-center gap-4">
        <label htmlFor="meter-select" className="text-sm font-medium text-slate-300">
          Select Meter:
        </label>
        <select
          id="meter-select"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
        >
          {simulators.map((sim) => (
            <option key={sim.id} value={sim.id}>
              {sim.name} (Target: {sim.target_kwh} kWh)
            </option>
          ))}
        </select>
      </div>

      {selectedSim && (
        <DashboardContent
          simulatorId={selectedId!}
          simulatorName={selectedSim.name}
          targetKwh={data.targetKwh}
          initialBlock={data.initialBlock}
          initialHistory={data.initialHistory}
        />
      )}
    </div>
  );
}