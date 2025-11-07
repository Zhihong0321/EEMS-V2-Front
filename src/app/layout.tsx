import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { AppHeader } from "@/components/layout/app-header";

export const metadata: Metadata = {
  title: "Eternalgy EMS",
  description: "Prototype UI for Eternalgy's energy management simulator"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <div className="flex grow flex-col">
            <AppHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-10">{children}</main>
            <footer className="border-t border-slate-800 bg-slate-900/80">
              <div className="mx-auto flex w-full max-w-6xl flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-4 text-xs text-slate-500 text-center sm:text-left">
                <span>© {new Date().getFullYear()} Eternalgy Energy Management Simulator</span>
                <span>Prototype build — App Router</span>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
