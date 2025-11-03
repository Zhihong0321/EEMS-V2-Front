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
      {/* MASSIVE CACHE BUSTING INDICATOR - IMPOSSIBLE TO MISS */}
      <div className="bg-red-500 text-white text-center py-12 px-8 text-4xl font-bold mb-8 border-8 border-yellow-400 animate-pulse">
        🚨 NEW BRANCH DEPLOYED! 🚨
        <br />
        <div className="text-2xl mt-4 bg-yellow-500 text-black px-6 py-3 rounded-lg inline-block animate-bounce">
          CACHE-FIX-V2: {cacheId}
        </div>
        <div className="text-lg mt-2">Build: {buildTime}</div>
      </div>
      <SimulatorsPage initialSimulators={simulators} />
    </>
  );
}
