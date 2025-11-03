import { NextResponse } from 'next/server';

export async function GET() {
  const buildInfo = {
    version: "CACHE-FIX-V2-BRANCH",
    branch: "cache-fix-v2",
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    buildId: process.env.BUILD_ID || "unknown",
    cacheBust: process.env.CACHE_BUST || "unknown",
    forceRebuild: process.env.FORCE_REBUILD || "unknown",
    deploymentVersion: process.env.DEPLOYMENT_VERSION || "unknown",
    timestamp: new Date().toISOString(),
    random: Math.random(),
    message: "If you see this, Railway is serving the new branch!"
  };

  return NextResponse.json(buildInfo, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}