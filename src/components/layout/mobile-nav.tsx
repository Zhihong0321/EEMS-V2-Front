"use client";

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const navigation: Array<{ name: string; href: string }> = [
  { name: 'Simulators', href: '/' },
  { name: 'Health Check', href: '/health' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Test Features', href: '/test-features' },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger Button */}
      <button
        type="button"
        className="md:hidden p-2 text-slate-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] rounded-md hover:bg-slate-800/50"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile Menu Drawer */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={setIsOpen}>
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="-translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-200"
                  leaveFrom="translate-x-0"
                  leaveTo="-translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-xs">
                    <div className="flex h-full flex-col overflow-y-scroll bg-slate-900 shadow-2xl">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src="/eternalgy-logo-02.png"
                            alt="Eternalgy Logo"
                            width={32}
                            height={32}
                            className="h-8 w-auto"
                          />
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              Eternalgy EMS
                            </p>
                            <p className="text-sm font-semibold text-slate-100">Menu</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="p-2 text-slate-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] rounded-md hover:bg-slate-800/50"
                          onClick={() => setIsOpen(false)}
                          aria-label="Close menu"
                        >
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Navigation */}
                      <nav className="flex-1 px-4 py-6" aria-label="Mobile navigation">
                        <ul className="space-y-2">
                          {navigation.map((item) => {
                            const isActive = pathname === item.href || 
                              (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                              <li key={item.name}>
                                <Link
                                  href={item.href as any}
                                  className={clsx(
                                    "flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors min-h-[44px]",
                                    isActive
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                  )}
                                  onClick={() => setIsOpen(false)}
                                  aria-current={isActive ? 'page' : undefined}
                                >
                                  {item.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </nav>

                      {/* Footer */}
                      <div className="border-t border-slate-800 px-4 py-4 space-y-2">
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-400">Timezone:</span>{' '}
                          {process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur"}
                        </p>
                        <p className="text-xs text-slate-600">
                          © {new Date().getFullYear()} Eternalgy EMS
                        </p>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

