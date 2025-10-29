import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { fetchBlockHistory, fetchLatestBlock, getSimulators } from "@/lib/api";
import type { HistoryBlock, LatestBlock } from "@/lib/types";

export default async function DashboardPage({
  params
}: {
  params: { id: string };
}) {
  const simulatorId = params.id;
  let simulatorName = `Simulator ${simulatorId}`;
  let targetKwh: number | undefined;
  let initialBlock: LatestBlock | null = null;
  let initialHistory: HistoryBlock[] = [];

  try {
    const simulators = await getSimulators();
    const simulator = simulators.find((item) => item.id === simulatorId);
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
    <DashboardContent
      simulatorId={simulatorId}
      simulatorName={simulatorName}
      targetKwh={targetKwh}
      initialBlock={initialBlock}
      initialHistory={initialHistory}
    />
  );
}
