"use client";

// RESPONSIVE-AWARE: Uses responsive classes for mobile-friendly layout
// See docs/RESPONSIVE.md for guidelines

import { useState } from "react";
import { sendWhatsAppMessage, getWhatsAppStatus, getWhatsAppQR } from "@/lib/whatsapp-api";
import { calculateTnbBill } from "@/lib/api";
import { useToast } from "@/components/ui/toast-provider";
import { PaperAirplaneIcon, SignalIcon, QrCodeIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import type { TnbBillCalculationResult } from "@/lib/types";

export default function TestFeaturesPage() {
  const { push } = useToast();
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ready: boolean; hasQR: boolean } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  
  // TNB Bill Search state
  const [billAmount, setBillAmount] = useState("");
  const [searchingBill, setSearchingBill] = useState(false);
  const [billResult, setBillResult] = useState<TnbBillCalculationResult | null>(null);
  const [useDemoMode, setUseDemoMode] = useState(false);

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

  const handleSearchBill = async () => {
    const amount = parseFloat(billAmount);
    if (!billAmount.trim() || isNaN(amount) || amount <= 0) {
      push({
        title: "Validation Error",
        description: "Please enter a valid bill amount (RM)",
        variant: "error"
      });
      return;
    }

    setSearchingBill(true);
    try {
      let result;
      if (useDemoMode) {
        // Use mock data for demo
        const { calculateTnbBillMock } = await import("@/lib/api");
        result = calculateTnbBillMock(amount);
        // Add small delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Try real API
        result = await calculateTnbBill(amount);
      }
      
      setBillResult(result);
      push({
        title: "TNB Bill Found",
        description: result.message,
        variant: "success"
      });
    } catch (error) {
      // If real API fails, suggest demo mode
      const errorMessage = error instanceof Error ? error.message : "Failed to search TNB bill data";
      push({
        title: "Search Failed",
        description: useDemoMode ? errorMessage : `${errorMessage}. Try enabling Demo Mode to test with sample data.`,
        variant: "error"
      });
      setBillResult(null);
    } finally {
      setSearchingBill(false);
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

      {/* Navigation to Notifications */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          🔔 WhatsApp Notification System
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Set up automated WhatsApp notifications when energy usage exceeds thresholds
        </p>
        <div className="flex gap-3">
          <a 
            href="/notifications" 
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Manage Notifications
          </a>
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-4 py-2 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            View Dashboard
          </a>
        </div>
      </div>

      {/* TNB Bill Search Section */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <header className="mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <CurrencyDollarIcon className="h-6 w-6" />
            TNB Bill Database Search
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Search TNB tariff data by monthly bill amount (RM). Finds closest match where bill total ≤ your input.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Monthly Bill Amount (RM)
              </label>
              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="150"
                min="1"
                step="0.01"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                disabled={searchingBill}
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter your monthly TNB bill amount in Ringgit Malaysia
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={useDemoMode}
                  onChange={(e) => setUseDemoMode(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary focus:ring-offset-slate-900"
                />
                Demo Mode
              </label>
              <span className="text-xs text-slate-500">
                {useDemoMode ? "Using sample data" : "Using live API"}
              </span>
            </div>

            <button
              onClick={handleSearchBill}
              disabled={searchingBill || !billAmount.trim()}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary min-h-[44px]"
            >
              {searchingBill ? "Searching..." : `Search TNB Bill Data${useDemoMode ? " (Demo)" : ""}`}
            </button>
          </div>

          {billResult && (
            <div className="rounded-md border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Search Result</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Input Amount:</span>
                  <span className="text-white font-medium">RM {billResult.inputAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Matched Bill Total:</span>
                  <span className="text-white font-medium">RM {billResult.tariff.bill_total_normal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Usage (kWh):</span>
                  <span className="text-white font-medium">{billResult.tariff.usage_kwh}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">EEI:</span>
                  <span className="text-white font-medium">{billResult.tariff.eei}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Network:</span>
                  <span className="text-white font-medium">RM {billResult.tariff.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Capacity:</span>
                  <span className="text-white font-medium">{billResult.tariff.capacity} kW</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-600">
                  <p className="text-slate-300 text-xs">{billResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
          <p><strong>WhatsApp API:</strong> {process.env.NEXT_PUBLIC_WHATSAPP_API_URL || "https://whatsapp-api-server-production-c15f.up.railway.app"}</p>
          <p><strong>TNB API:</strong> https://eternalgy-erp-retry3-production.up.railway.app</p>
          <p><strong>Proxy Endpoints (CORS-free):</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>POST /api/whatsapp/send - Send WhatsApp message</li>
            <li>GET /api/whatsapp/status - Get connection status (ready, hasQR)</li>
            <li>GET /api/whatsapp/qr - Get QR code for authentication</li>
          </ul>
          <p className="mt-2"><strong>Phone Format:</strong> Country code + digits only (e.g., 60123456789)</p>
          <p><strong>Rate Limit:</strong> Max 1 message per second</p>
          <p><strong>TNB Search:</strong> Finds closest tariff where bill_total_normal ≤ input amount</p>
        </div>
      </div>
    </section>
  );
}

