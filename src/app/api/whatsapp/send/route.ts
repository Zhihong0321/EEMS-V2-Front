import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || "https://whatsapp-api-server-production-c15f.up.railway.app";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.to || !body.message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, message" },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(body.to)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format. Must be 10-15 digits only." },
        { status: 400 }
      );
    }

    // Forward request to WhatsApp API server
    const response = await fetch(`${WHATSAPP_API_URL}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        to: body.to,
        message: body.message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          success: false, 
          error: `WhatsApp API error: ${response.status} ${response.statusText}. ${errorText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("WhatsApp send API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}