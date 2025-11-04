import { CombinedDashboard } from "@/components/dashboard/combined-dashboard";
import { fetchBlockHistory, fetchLatestBlock, getSimulators } from "@/lib/api";
import type { HistoryBlock, LatestBlock, Simulator } from "@/lib/types";

export default async function DashboardPage({
  params
}: {
  params: { id: string };
}) {
  const simulatorId = params.id;
  let simulator: Simulator | undefined;
  let simulatorName = `Simulator ${simulatorId}`;
  let targetKwh: number | undefined;
  let initialBlock: LatestBlock | null = null;
  let initialHistory: HistoryBlock[] = [];

  try {
    const simulators = await getSimulators();
    simulator = simulators.find((item) => item.id === simulatorId);
    if (simulator) {
      simulatorName = simulator.name;
      targetKwh = simulator.target_kwh;
    }
  } catch (error) {
    console.error("Failed to load simulators list", error);
  }

  try {
    initialBlock = await fetchLatestBlock(simulatorId);
    targetKwh = targetKwh ?? initialBlock.target_kwh;
  } catch (error) {
    console.error("Failed to load latest block", error);
  }

  try {
    initialHistory = await fetchBlockHistory(simulatorId, 10);
  } catch (error) {
    console.error("Failed to load block history", error);
  }

  return (
    <CombinedDashboard
      simulatorId={simulatorId}
      simulatorName={simulatorName}
      simulator={simulator}
      targetKwh={targetKwh}
      initialBlock={initialBlock}
      initialHistory={initialHistory}
    />
  );
}
