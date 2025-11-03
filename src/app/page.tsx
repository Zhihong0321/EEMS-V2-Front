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
  
  return (
    <>
      {/* CACHE BUSTING INDICATOR - REMOVE AFTER CONFIRMING */}
      <div className="bg-green-600 text-white text-center py-2 px-4 text-sm font-bold mb-4">
        🔄 CACHE FIXED: {cacheId} | {buildTime.slice(11, 19)}
      </div>
      <SimulatorsPage initialSimulators={simulators} />
    </>
  );
}
