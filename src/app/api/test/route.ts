import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: "🚨 RAILWAY TEST ENDPOINT WORKING! 🚨",
    timestamp: new Date().toISOString(),
    random: Math.random(),
    status: "SUCCESS"
  });
}