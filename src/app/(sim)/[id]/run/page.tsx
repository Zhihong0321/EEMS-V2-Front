import { SimulatorRunContent } from "@/components/run/simulator-run-content";
import { getSimulators } from "@/lib/api";

export default async function SimulatorRunPage({
  params
}: {
  params: { id: string };
}) {
  const simulatorId = params.id;
  let simulatorName = `Simulator ${simulatorId}`;
  let targetKwh: number | undefined;

  try {
    const simulators = await getSimulators();
    const simulator = simulators.find((item) => item.id === simulatorId);
    if (simulator) {
      simulatorName = simulator.name;
      targetKwh = simulator.target_kwh;
    }
  } catch (error) {
    console.error("Failed to load simulator metadata", error);
  }

  return <SimulatorRunContent simulatorId={simulatorId} simulatorName={simulatorName} targetKwh={targetKwh} />;
}
