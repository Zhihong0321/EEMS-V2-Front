import { SimulatorsPage } from "@/components/simulators/simulators-page";
import { getSimulators } from "@/lib/api";
import type { Simulator } from "@/lib/types";

export default async function WelcomePage() {
  let simulators: Simulator[] = [];
  try {
    simulators = await getSimulators();
  } catch (error) {
    console.error("Failed to fetch simulators", error);
  }

  // Force cache busting
  const buildTime = new Date().toISOString();

  // Cache busting indicator
  const cacheId = Math.random().toString(36).substr(2, 9);
  
  return <SimulatorsPage initialSimulators={simulators} />;
}
