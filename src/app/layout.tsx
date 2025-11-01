import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";

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
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur relative z-50">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Link href="/" className="flex items-center gap-3">
                    <Image
                      src="/eternalgy-logo-02.png"
                      alt="Eternalgy Logo"
                      width={40}
                      height={40}
                      className="h-10 w-auto"
                      priority
                      quality={100}
                      style={{ objectFit: 'contain' }}
                    />
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Eternalgy EMS</p>
                      <p className="font-semibold text-slate-100">Simulator Prototype</p>
                    </div>
                  </Link>
                </div>
                <nav className="flex flex-1 items-center justify-end gap-4 text-sm text-slate-400">
                  <Link
                    href="/"
                    className="rounded-md px-3 py-2 transition hover:bg-slate-800/80 hover:text-white relative z-10"
                    prefetch={true}
                  >
                    Simulators
                  </Link>
                  <Link
                    href="/health"
                    className="rounded-md px-3 py-2 transition hover:bg-slate-800/80 hover:text-white relative z-10"
                    prefetch={true}
                  >
                    Health check
                  </Link>
                  <Link
                    href="/test-features"
                    className="rounded-md px-3 py-2 transition hover:bg-slate-800/80 hover:text-white relative z-10"
                    prefetch={true}
                  >
                    Test Features
                  </Link>
                  <span className="rounded-md border border-slate-800 px-3 py-2 text-slate-400">
                    Timezone: {process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur"}
                  </span>
                </nav>
              </div>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
            <footer className="border-t border-slate-800 bg-slate-900/80">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-xs text-slate-500">
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
