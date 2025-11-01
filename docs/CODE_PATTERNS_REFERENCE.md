# Code Patterns Reference Guide
**Quick reference for implementing UI improvements**

---

## 🎨 Component Templates

### Button Component Template

```typescript
// src/components/ui/button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority'; // Optional: install if needed
import clsx from 'clsx';

const buttonVariants = cva(
  // Base styles (always applied)
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-sm hover:bg-primary-600 hover:shadow-md active:scale-95",
        secondary: "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:border-slate-600",
        ghost: "hover:bg-slate-800/50 text-slate-300 hover:text-white",
        danger: "bg-danger text-white shadow-sm hover:bg-danger-dark hover:shadow-md active:scale-95",
        success: "bg-success text-white shadow-sm hover:bg-success-dark hover:shadow-md active:scale-95",
      },
      size: {
        sm: "px-3 py-1.5 text-xs min-h-[36px]",
        md: "px-4 py-2 text-sm min-h-[44px]",
        lg: "px-6 py-3 text-base min-h-[48px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={clsx(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

**Usage:**
```typescript
<Button variant="primary" size="md">Create Simulator</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" isLoading={isDeleting}>Delete</Button>
<Button variant="ghost" size="lg">Learn More</Button>
```

### Card Component Template

```typescript
// src/components/ui/card.tsx
import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

const cardVariants = {
  default: "bg-slate-900/60",
  elevated: "bg-slate-900 shadow-lg",
  interactive: "cursor-pointer hover:border-primary-700 hover:shadow-lg",
  flat: "shadow-none",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-xl border border-slate-800 backdrop-blur-sm shadow-md transition-shadow duration-200",
          cardVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("p-4 sm:p-6 border-b border-slate-800", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("p-4 sm:p-6", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("p-4 sm:p-6 border-t border-slate-800", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
```

**Usage:**
```typescript
<Card variant="elevated">
  <CardHeader>
    <h2 className="text-xl font-semibold">Title</h2>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input Component Template

```typescript
// src/components/ui/input.tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <input
        className={clsx(
          "w-full rounded-md border px-3 py-2 text-sm text-white transition-colors duration-150",
          "placeholder:text-slate-500",
          "focus:outline-none focus:ring-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-danger bg-danger/5 focus:border-danger focus:ring-danger/20"
            : success
            ? "border-success bg-success/5 focus:border-success focus:ring-success/20"
            : "border-slate-800 bg-slate-950/60 focus:border-primary focus:ring-primary/20",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Input wrapper with label and error
export interface InputWrapperProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function InputWrapper({ 
  label, 
  error, 
  helperText, 
  required, 
  children 
}: InputWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
```

**Usage:**
```typescript
<InputWrapper 
  label="Simulator Name" 
  error={errors.name?.message}
  helperText="Choose a unique name"
  required
>
  <Input 
    error={!!errors.name}
    placeholder="Enter name..."
    {...register('name')}
  />
</InputWrapper>
```

### Badge Component Template

```typescript
// src/components/ui/badge.tsx
import { type HTMLAttributes } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const badgeVariants: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-primary/10 text-primary border-primary/20",
  neutral: "bg-slate-800 text-slate-300 border-slate-700",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

**Usage:**
```typescript
<Badge variant="success">Active</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Error</Badge>
<Badge variant="info">Info</Badge>
```

---

## 📱 Mobile Navigation Pattern

### Mobile Menu Component

```typescript
// src/components/layout/mobile-menu.tsx
"use client";

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const navigation = [
  { name: 'Simulators', href: '/' },
  { name: 'Health Check', href: '/health' },
  { name: 'Test Features', href: '/test-features' },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger Button */}
      <button
        type="button"
        className="md:hidden p-2 text-slate-400 hover:text-white min-h-[44px] min-w-[44px]"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">Open menu</span>
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
                      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                        <Dialog.Title className="text-lg font-semibold text-white">
                          Menu
                        </Dialog.Title>
                        <button
                          type="button"
                          className="p-2 text-slate-400 hover:text-white min-h-[44px] min-w-[44px]"
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="sr-only">Close menu</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Navigation */}
                      <nav className="flex-1 px-4 py-6">
                        <ul className="space-y-2">
                          {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  className={clsx(
                                    "flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors min-h-[44px]",
                                    isActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                  )}
                                  onClick={() => setIsOpen(false)}
                                >
                                  {item.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </nav>

                      {/* Footer */}
                      <div className="border-t border-slate-800 px-6 py-4">
                        <p className="text-xs text-slate-500">
                          Timezone: {process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur"}
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
```

### Updated Header with Mobile Menu

```typescript
// Update src/app/layout.tsx header section
<header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur relative z-50">
  <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 py-4">
    {/* Logo */}
    <div className="flex items-center gap-3">
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/eternalgy-logo-02.png"
          alt="Eternalgy Logo"
          width={40}
          height={40}
          className="h-10 w-auto"
          priority
        />
        <div className="hidden sm:block">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Eternalgy EMS</p>
          <p className="font-semibold text-slate-100">Simulator Prototype</p>
        </div>
      </Link>
    </div>

    {/* Desktop Navigation */}
    <nav className="hidden md:flex flex-1 items-center justify-end gap-4 text-sm text-slate-400">
      <Link
        href="/"
        className="rounded-md px-3 py-2 transition hover:bg-slate-800/80 hover:text-white min-h-[44px]"
      >
        Simulators
      </Link>
      <Link
        href="/health"
        className="rounded-md px-3 py-2 transition hover:bg-slate-800/80 hover:text-white min-h-[44px]"
      >
        Health check
      </Link>
      <Link
        href="/test-features"
        className="rounded-md px-3 py-2 transition hover:bg-slate-800/80 hover:text-white min-h-[44px]"
      >
        Test Features
      </Link>
      <span className="rounded-md border border-slate-800 px-3 py-2 text-slate-400">
        Timezone: {process.env.NEXT_PUBLIC_TIMEZONE_LABEL ?? "Asia/Kuala_Lumpur"}
      </span>
    </nav>

    {/* Mobile Menu Button */}
    <MobileMenu />
  </div>
</header>
```

---

## 🎭 Animation Patterns

### Fade In Animation

```typescript
// Using Tailwind's animation utilities
<div className="animate-in fade-in duration-300">
  Content
</div>

// Or custom animation
<div className="animate-fadeIn">
  Content
</div>

// In tailwind.config.ts, add:
animation: {
  fadeIn: 'fadeIn 0.3s ease-in',
},
keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
}
```

### Slide In Animation

```typescript
// Slide up
<Transition
  show={isVisible}
  enter="transition ease-out duration-300 transform"
  enterFrom="translate-y-4 opacity-0"
  enterTo="translate-y-0 opacity-100"
  leave="transition ease-in duration-200 transform"
  leaveFrom="translate-y-0 opacity-100"
  leaveTo="translate-y-4 opacity-0"
>
  <div>Content</div>
</Transition>
```

### Scale Animation

```typescript
// Button hover scale
<button className="transition-transform hover:scale-105 active:scale-95">
  Click me
</button>

// Card hover scale
<div className="transition-all hover:scale-[1.02] hover:shadow-xl">
  Card content
</div>
```

### Loading Spinner

```typescript
// Simple spinner component
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
```

### Skeleton Loader

```typescript
// Skeleton component
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-slate-800/40",
        className
      )}
    />
  );
}

// Usage
<div className="space-y-3">
  <Skeleton className="h-8 w-48" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

---

## 🎨 Tailwind Config Enhancements

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          DEFAULT: '#0e7490',
          foreground: '#ffffff',
        },
        success: {
          light: '#86efac',
          DEFAULT: '#22c55e',
          dark: '#16a34a',
          hover: '#15803d',
        },
        warning: {
          light: '#fbbf24',
          DEFAULT: '#f97316',
          dark: '#ea580c',
          hover: '#c2410c',
        },
        danger: {
          light: '#fca5a5',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          hover: '#b91c1c',
        },
      },
      boxShadow: {
        'glow': '0 0 15px rgba(34, 211, 238, 0.5)',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in',
        slideUp: 'slideUp 0.3s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 🎯 Common Responsive Patterns

### Responsive Grid

```typescript
// 1 column mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>

// Sidebar layout (stack on mobile, side-by-side on desktop)
<div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
  <main>Main content</main>
  <aside>Sidebar</aside>
</div>
```

### Responsive Typography

```typescript
// Headings
<h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
  Page Title
</h1>

// Body text
<p className="text-sm sm:text-base text-slate-400">
  Description text
</p>

// Small text
<span className="text-xs sm:text-sm text-slate-500">
  Caption
</span>
```

### Responsive Padding

```typescript
// Container padding
<div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
  Content
</div>

// Card padding
<div className="p-4 sm:p-6 lg:p-8">
  Card content
</div>
```

### Responsive Flex

```typescript
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Reverse order
<div className="flex flex-col-reverse md:flex-row gap-4">
  <div>Shows second on mobile</div>
  <div>Shows first on mobile</div>
</div>
```

---

## ♿ Accessibility Patterns

### Focus Styles

```typescript
// Global focus style (add to globals.css)
*:focus-visible {
  @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-slate-950;
}

// Component-specific focus
<button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
  Button
</button>
```

### ARIA Labels

```typescript
// Icon button
<button
  type="button"
  aria-label="Close menu"
  onClick={handleClose}
>
  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
</button>

// Loading state
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? 'Loading...' : 'Content loaded'}
</div>

// Error messages
<div role="alert" aria-live="assertive">
  {error}
</div>
```

### Screen Reader Only Text

```typescript
// Utility class
<span className="sr-only">Text for screen readers only</span>

// In globals.css (if not already there)
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 🔄 Update Existing Components Pattern

### Example: Updating simulator cards to use new Button component

**Before:**
```typescript
<button
  type="button"
  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-cyan-600"
>
  Run simulator
</button>
```

**After:**
```typescript
<Button variant="primary" size="md">
  Run simulator
</Button>
```

### Example: Updating cards to use Card component

**Before:**
```typescript
<article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
  <h2 className="text-xl font-semibold text-white">{sim.name}</h2>
  {/* content */}
</article>
```

**After:**
```typescript
<Card variant="default">
  <CardContent>
    <h2 className="text-xl font-semibold text-white">{sim.name}</h2>
    {/* content */}
  </CardContent>
</Card>
```

---

**End of Reference Guide**

Use this guide as a quick reference when implementing the UI improvements. All patterns are production-ready and follow best practices.

