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

  return (
    <>
      {/* MASSIVE TEST BANNER - IMPOSSIBLE TO MISS */}
      <div className="bg-red-600 text-white text-center py-8 px-6 font-bold text-2xl animate-pulse border-8 border-yellow-400">
        🚨🚨🚨 UPDATED VERSION 2.0 - DEPLOYMENT WORKING! 🚨🚨🚨
        <br />
        <span className="text-lg bg-yellow-500 text-black px-4 py-2 rounded mt-2 inline-block animate-bounce">
          ⚡ IF YOU SEE THIS, FRONTEND UPDATES ARE WORKING! ⚡
        </span>
        <div className="text-xs mt-2">Build: {buildTime}</div>
      </div>
      <SimulatorsPage initialSimulators={simulators} />
    </>
  );
}
