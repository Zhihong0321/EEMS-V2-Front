// WhatsApp API helper functions
// Using local proxy endpoints to avoid CORS issues

export type WhatsAppSendRequest = {
  to: string;
  message: string;
};

export type WhatsAppSendResponse = {
  success: boolean;
  id?: string;
  to?: string;
  message?: string;
  error?: string;
};

export type WhatsAppStatusResponse = {
  ready: boolean;
  hasQR: boolean;
};

export type WhatsAppQRResponse = {
  qr: string | null;
};

/**
 * Send a WhatsApp message via local proxy
 */
export async function sendWhatsAppMessage(request: WhatsAppSendRequest): Promise<WhatsAppSendResponse> {
  try {
    const response = await fetch("/api/whatsapp/send", {
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
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to send message: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      success: data.success || true,
      id: data.id,
      to: data.to,
      message: data.message || "Message sent successfully"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred"
    };
  }
}

/**
 * Get WhatsApp connection status via local proxy
 */
export async function getWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  try {
    const response = await fetch("/api/whatsapp/status", {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    return {
      ready: data.ready === true,
      hasQR: data.hasQR === true
    };
  } catch (error) {
    return {
      ready: false,
      hasQR: false
    };
  }
}

/**
 * Get WhatsApp QR code for authentication via local proxy
 */
export async function getWhatsAppQR(): Promise<WhatsAppQRResponse> {
  try {
    const response = await fetch("/api/whatsapp/qr", {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    return {
      qr: data.qr || null
    };
  } catch (error) {
    return {
      qr: null
    };
  }
}


