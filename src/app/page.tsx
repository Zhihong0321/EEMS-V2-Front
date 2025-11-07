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

  return (
    <>
      {/* KIRO TEST BANNER - PROOF OF GITHUB SYNC */}
      <div className="bg-red-600 text-white text-center py-4 px-6 font-bold text-lg animate-pulse">
        🚨 KIRO TEST: This red banner proves GitHub sync is working! 🚨
        <br />
        <span className="text-sm">If you see this, the code changes are reaching GitHub repo</span>
      </div>
      <SimulatorsPage initialSimulators={simulators} />
    </>
  );
}
