"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MobileNav } from "./mobile-nav";
import clsx from "clsx";

const navigation = [
  { name: 'Simulators', href: '/' },
  { name: 'Health', href: '/health' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Test', href: '/test-features' },
];

export function AppHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur relative z-50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/eternalgy-logo-02.png"
              alt="Eternalgy Logo"
              width={40}
              height={40}
              className="h-8 sm:h-10 w-auto"
              priority
              quality={100}
              style={{ objectFit: 'contain' }}
            />
            <div className="hidden sm:block">
              <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-slate-400">Eternalgy EMS</p>
              <p className="text-sm sm:text-base font-semibold text-slate-100">Simulator Prototype</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-1 items-center justify-end gap-2 lg:gap-4 text-sm" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={clsx(
                  "rounded-md px-3 py-2 transition min-h-[44px] flex items-center font-medium",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                )}
                prefetch={true}
                aria-current={active ? 'page' : undefined}
              >
                {item.name}
              </Link>
            );
          })}
          <span className="hidden xl:flex rounded-md border border-slate-800 px-3 py-2 text-slate-400 text-xs">
            {process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur"}
          </span>
        </nav>

        {/* Mobile Menu Button */}
        <MobileNav />
      </div>
    </header>
  );
}

