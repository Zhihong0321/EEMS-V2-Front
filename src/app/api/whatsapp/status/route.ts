import { NextResponse } from "next/server";

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || "https://whatsapp-api-server-production-c15f.up.railway.app";

export async function GET() {
  try {
    // Forward request to WhatsApp API server
    const response = await fetch(`${WHATSAPP_API_URL}/api/status`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { ready: false, hasQR: false },
        { status: 200 } // Return 200 with default values instead of error
      );
    }

    const data = await response.json();
    return NextResponse.json({
      ready: data.ready === true,
      hasQR: data.hasQR === true
    });

  } catch (error) {
    console.error("WhatsApp status API error:", error);
    return NextResponse.json(
      { ready: false, hasQR: false },
      { status: 200 } // Return 200 with default values instead of error
    );
  }
}