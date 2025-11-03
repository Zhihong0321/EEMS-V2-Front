import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { AppHeader } from "@/components/layout/app-header";

export const metadata: Metadata = {
  title: "Eternalgy EMS",
  description: "Prototype UI for Eternalgy's energy management simulator",
  other: {
    'cache-control': 'no-cache, no-store, must-revalidate',
    'pragma': 'no-cache',
    'expires': '0'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Deployment Validator - UPDATE THIS WITH EACH COMMIT
  const DEPLOYMENT_INFO = {
    commitTitle: "Fix Railway Metal Build Environment issue", // UPDATE THIS WITH EACH COMMIT
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    buildId: process.env.BUILD_ID || "dev",
    uniqueId: Math.random().toString(36).substr(2, 9) // Force cache bust
  };

  return (
    <html lang="en" className="bg-purple-950">
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <div className="flex grow flex-col">
            <AppHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-10">{children}</main>
            <footer className="border-t border-slate-800 bg-slate-900/80">
              <div className="mx-auto flex w-full max-w-6xl flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-4 text-xs text-slate-500 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <span>© {new Date().getFullYear()} Eternalgy Energy Management Simulator</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Prototype build — App Router</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                  <span className="text-primary font-medium">
                    Latest: {DEPLOYMENT_INFO.commitTitle}
                  </span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="text-slate-600">
                    Build: {DEPLOYMENT_INFO.buildTime.slice(0, 16)}
                  </span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="text-slate-600">
                    ID: {DEPLOYMENT_INFO.uniqueId}
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
