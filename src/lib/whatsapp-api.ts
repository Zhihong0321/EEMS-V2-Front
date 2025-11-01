// WhatsApp API helper functions
import { getEffectiveApiKey } from "./api-key";

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || "https://whatsapp-api-server-production-c15f.up.railway.app";

export type WhatsAppSendRequest = {
  to: string;
  message: string;
};

export type WhatsAppSendResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export type WhatsAppStatusResponse = {
  status: string;
  connected: boolean;
};

/**
 * Send a WhatsApp message
 */
export async function sendWhatsAppMessage(request: WhatsAppSendRequest): Promise<WhatsAppSendResponse> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        to: request.to,
        message: request.message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to send message: ${response.status} ${response.statusText}. ${errorText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Message sent successfully"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Get WhatsApp connection status
 */
export async function getWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/api/status`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return {
        status: "error",
        connected: false
      };
    }

    const data = await response.json();
    return {
      status: data.status || "unknown",
      connected: data.connected === true
    };
  } catch (error) {
    return {
      status: "error",
      connected: false
    };
  }
}

/**
 * Get QR code for device linking
 */
export async function getWhatsAppQR(): Promise<string | null> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/api/qr`, {
      method: "GET"
    });

    if (!response.ok) {
      return null;
    }

    // QR code is returned as an image, convert to data URL
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
}

