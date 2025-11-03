"use client";

// RESPONSIVE-AWARE: Uses responsive classes for mobile-friendly layout
// See docs/RESPONSIVE.md for guidelines

import { useState } from "react";
import { sendWhatsAppMessage, getWhatsAppStatus, getWhatsAppQR } from "@/lib/whatsapp-api";
import { useToast } from "@/components/ui/toast-provider";
import { PaperAirplaneIcon, SignalIcon, QrCodeIcon } from "@heroicons/react/24/outline";

export default function TestFeaturesPage() {
  const { push } = useToast();
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ready: boolean; hasQR: boolean } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !message.trim()) {
      push({
        title: "Validation Error",
        description: "Please enter both recipient number and message",
        variant: "error"
      });
      return;
    }

    // Validate phone number format (digits only, 10-15 characters)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(to.trim())) {
      push({
        title: "Invalid Phone Number",
        description: "Phone number must be 10-15 digits only (include country code, no symbols)",
        variant: "error"
      });
      return;
    }

    setSending(true);
    try {
      const result = await sendWhatsAppMessage({
        to: to.trim(),
        message: message.trim()
      });

      if (result.success) {
        push({
          title: "Message Sent",
          description: result.id ? `Message sent with ID: ${result.id}` : "WhatsApp message sent successfully",
          variant: "success"
        });
        // Clear form after successful send
        setMessage("");
      } else {
        push({
          title: "Failed to Send",
          description: result.error || "Unknown error occurred",
          variant: "error"
        });
      }
    } catch (error) {
      push({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "error"
      });
    } finally {
      setSending(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoadingStatus(true);
    try {
      const result = await getWhatsAppStatus();
      setStatus(result);
      push({
        title: "Status Checked",
        description: `WhatsApp is ${result.ready ? "ready" : "not ready"}${result.hasQR ? " (QR code available)" : ""}`,
        variant: result.ready ? "success" : "warning"
      });
    } catch (error) {
      push({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check status",
        variant: "error"
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleGetQR = async () => {
    setLoadingQR(true);
    try {
      const result = await getWhatsAppQR();
      setQrCode(result.qr);
      if (result.qr) {
        push({
          title: "QR Code Retrieved",
          description: "Scan the QR code with WhatsApp to authenticate",
          variant: "success"
        });
      } else {
        push({
          title: "No QR Code",
          description: "QR code not available. WhatsApp might already be authenticated.",
          variant: "warning"
        });
      }
    } catch (error) {
      push({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get QR code",
        variant: "error"
      });
    } finally {
      setLoadingQR(false);
    }
  };


  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-white">Test Features</h1>
        <p className="text-sm text-slate-400 mt-2">
          Test WhatsApp notification features and API integration
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Send Message Card */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <PaperAirplaneIcon className="h-6 w-6" />
              Send WhatsApp Message
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Send a test message to a WhatsApp number
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Recipient Number
              </label>
              <input
                type="tel"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="60123456789"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                disabled={sending}
              />
              <p className="text-xs text-slate-500 mt-1">
                Country code + digits only (e.g., 60123456789 for Malaysia)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={5}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none resize-none"
                disabled={sending}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !to.trim() || !message.trim()}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary min-h-[44px]"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </article>

        {/* Status Card */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <SignalIcon className="h-6 w-6" />
              WhatsApp Connection Status
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Check WhatsApp connection status
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <button
                onClick={handleCheckStatus}
                disabled={loadingStatus}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
              >
                {loadingStatus ? "Checking..." : "Check Connection Status"}
              </button>
              {status && (
                <div className="mt-3 rounded-md border border-slate-700 bg-slate-800/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Ready:</span>
                    <span className={`text-sm font-medium ${status.ready ? "text-green-400" : "text-red-400"}`}>
                      {status.ready ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-slate-300">QR Available:</span>
                    <span className={`text-sm font-medium ${status.hasQR ? "text-yellow-400" : "text-slate-400"}`}>
                      {status.hasQR ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* QR Code Card */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <QrCodeIcon className="h-6 w-6" />
              WhatsApp QR Code
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Get QR code for WhatsApp authentication
            </p>
          </header>

          <div className="space-y-4">
            <button
              onClick={handleGetQR}
              disabled={loadingQR}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
            >
              {loadingQR ? "Loading..." : "Get QR Code"}
            </button>
            
            {qrCode && (
              <div className="mt-4 text-center">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="mx-auto max-w-full h-auto rounded-md border border-slate-700"
                  style={{ maxHeight: "200px" }}
                />
                <p className="text-xs text-slate-400 mt-2">
                  Scan with WhatsApp to authenticate
                </p>
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">API Information</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p><strong>Backend API:</strong> {process.env.NEXT_PUBLIC_WHATSAPP_API_URL || "https://whatsapp-api-server-production-c15f.up.railway.app"}</p>
          <p><strong>Proxy Endpoints (CORS-free):</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>POST /api/whatsapp/send - Send WhatsApp message</li>
            <li>GET /api/whatsapp/status - Get connection status (ready, hasQR)</li>
            <li>GET /api/whatsapp/qr - Get QR code for authentication</li>
          </ul>
          <p className="mt-2"><strong>Phone Format:</strong> Country code + digits only (e.g., 60123456789)</p>
          <p><strong>Rate Limit:</strong> Max 1 message per second</p>
        </div>
      </div>
    </section>
  );
}

