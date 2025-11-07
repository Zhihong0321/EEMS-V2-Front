"use server";

import EMSDashboardClient from "@/components/dashboard/ems-dashboard-client";
import { fetchBlockHistory, fetchLatestBlock, getSimulators } from "@/lib/api";
import type { HistoryBlock, LatestBlock, Simulator } from "@/lib/types";

async function fetchInitialData(simulators: Simulator[]) {
  const initialDataMap: Record<string, { initialBlock: LatestBlock | null; initialHistory: HistoryBlock[]; targetKwh: number | undefined }> = {};

  await Promise.all(
    simulators.map(async (sim) => {
      try {
        const initialBlock = await fetchLatestBlock(sim.id);
        const initialHistory = await fetchBlockHistory(sim.id, 10);
        initialDataMap[sim.id] = { initialBlock, initialHistory, targetKwh: sim.target_kwh };
      } catch (error) {
        console.error(`Failed to fetch initial data for simulator ${sim.id}`, error);
        initialDataMap[sim.id] = { initialBlock: null, initialHistory: [], targetKwh: sim.target_kwh };
      }
    })
  );

  return initialDataMap;
}

export default async function EMSDashboardPage() {
  let simulators: Simulator[] = [];
  try {
    simulators = await getSimulators();
  } catch (error) {
    console.error("Failed to load simulators", error);
  }

  const initialDataMap = await fetchInitialData(simulators);

  return <EMSDashboardClient simulators={simulators} initialDataMap={initialDataMap} />;
}