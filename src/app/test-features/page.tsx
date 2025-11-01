"use client";

// RESPONSIVE-AWARE: Uses responsive classes for mobile-friendly layout
// See docs/RESPONSIVE.md for guidelines

import { useState } from "react";
import { sendWhatsAppMessage, getWhatsAppStatus } from "@/lib/whatsapp-api";
import { useToast } from "@/components/ui/toast-provider";
import { PaperAirplaneIcon, SignalIcon } from "@heroicons/react/24/outline";

export default function TestFeaturesPage() {
  const { push } = useToast();
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ status: string; connected: boolean } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !message.trim()) {
      push({
        title: "Validation Error",
        description: "Please enter both recipient number and message",
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
          description: result.message || "WhatsApp message sent successfully",
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
        description: `WhatsApp is ${result.connected ? "connected" : "not connected"}. Status: ${result.status}`,
        variant: result.connected ? "success" : "warning"
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


  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-white">Test Features</h1>
        <p className="text-sm text-slate-400 mt-2">
          Test WhatsApp notification features and API integration
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
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
                placeholder="+1234567890"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                disabled={sending}
              />
              <p className="text-xs text-slate-500 mt-1">
                Include country code (e.g., +60123456789)
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
                    <span className="text-sm text-slate-300">Status:</span>
                    <span className={`text-sm font-medium ${status.connected ? "text-green-400" : "text-red-400"}`}>
                      {status.connected ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-slate-300">State:</span>
                    <span className="text-sm text-slate-200">{status.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">API Information</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_WHATSAPP_API_URL || "https://whatsapp-api-server-production-c15f.up.railway.app"}</p>
          <p><strong>Endpoints:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>POST /api/send - Send WhatsApp message</li>
            <li>GET /api/status - Get connection status</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

