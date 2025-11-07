# Responsive-Aware Development Guidelines

## Overview

This codebase follows a **responsive-aware development approach**. This means:

✅ **DO**: Build with responsive structure from the start using Tailwind breakpoints
✅ **DO**: Ensure mobile functionality works (even if not perfect)
✅ **DO**: Use responsive classes as you build new features
❌ **DON'T**: Perfect mobile spacing/typography until content is stable

## Philosophy

- **Build responsive-aware now, polish later**
- Structure layouts to stack naturally on mobile
- Use Tailwind's responsive utilities (`sm:`, `md:`, `lg:`, `xl:`) from the start
- Focus on functionality first, mobile UX polish comes after content is complete

## Tailwind Breakpoints

```css
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Desktops */
xl:  1280px  /* Large desktops */
```

## Responsive Patterns

### Grids
```tsx
// ✅ Stack on mobile, side-by-side on desktop
<div className="grid gap-6 lg:grid-cols-2">
  <div>Content 1</div>
  <div>Content 2</div>
</div>

// ✅ Simulator cards - single column on mobile, 2 columns on large screens
<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
  {simulators.map((sim) => <Card key={sim.id}>...</Card>)}
</div>
```

### Heights/Sizing
```tsx
// ✅ Smaller on mobile, larger on desktop
<div className="h-48 md:h-72">
  {/* Chart content */}
</div>

// ✅ Responsive logo sizing
<Image
  src="/logo.png"
  width={40}
  height={40}
  className="h-8 sm:h-10 w-auto"
/>
```

### Text/Typography
```tsx
// ✅ Global responsive typography (see globals.css)
h1 {
  @apply text-2xl sm:text-3xl lg:text-4xl;
}

h2 {
  @apply text-xl sm:text-2xl lg:text-3xl;
}

h3 {
  @apply text-lg sm:text-xl lg:text-2xl;
}

// ✅ Usage in components
<h1>Title</h1> {/* Automatically responsive */}
```

### Spacing
```tsx
// ✅ Less padding on mobile
<div className="p-4 md:p-6 lg:p-8">

// ✅ Responsive padding for containers
<main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-10">
```

### Flex Direction
```tsx
// ✅ Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">

// ✅ Button groups - reverse order on mobile for better UX
<div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
  <Button variant="secondary">Cancel</Button>
  <Button variant="primary">Submit</Button>
</div>
```

### Navigation Patterns
```tsx
// ✅ Desktop navigation - hidden on mobile
<nav className="hidden md:flex items-center gap-4">
  {navLinks.map(link => <Link href={link.href}>{link.name}</Link>)}
</nav>

// ✅ Mobile hamburger menu - visible only on mobile
<div className="md:hidden">
  <MobileNav />
</div>
```

### Touch Targets
```tsx
// ✅ Minimum 44x44px for accessibility
<button className="min-h-[44px] min-w-[44px] rounded-md p-2.5">
  <MenuIcon className="h-6 w-6" />
</button>
```

## Components Status

### ✅ Production-Ready Responsive Components

#### Layout Components
- **`app-header.tsx`** - Responsive header with mobile hamburger menu, desktop nav
- **`mobile-nav.tsx`** - Slide-out drawer navigation for mobile with Headless UI
- **`layout.tsx`** - Responsive main layout with proper spacing and container sizing

#### Dashboard Components
- **`combined-dashboard.tsx`** - Responsive grid layout, stacks on mobile
- **`current-block-chart.tsx`** - Chart height responsive (h-48 md:h-72), export button
- **`live-status.tsx`** - Card with bucket visualization, stacks well on mobile
- **`block-history-tiles.tsx`** - List view with loading skeletons

#### Run Panels
- **`auto-run-panel.tsx`** - Form inputs stack on mobile
- **`manual-run-panel.tsx`** - Form inputs stack on mobile

#### Page Components
- **`simulators-page.tsx`** - Card grid (1 column mobile, 2 columns desktop)
- **`health-check-console.tsx`** - Grid layout with responsive stacking
- **`health-check-card.tsx`** - Individual health check cards

#### UI Components (Design System)
- **`button.tsx`** - Responsive sizes (sm, md, lg), variants, loading states
- **`card.tsx`** - Consistent responsive padding and spacing
- **`input.tsx`** - Full-width on mobile, auto-width on desktop with labels
- **`badge.tsx`** - Responsive text sizing
- **`skeleton.tsx`** - Loading state component
- **`empty-state.tsx`** - Centered empty state with icon and CTA
- **`toast-provider.tsx`** - Bottom on mobile, top-right on desktop

### 📋 Responsive Patterns Applied
✅ Mobile-first approach with progressive enhancement
✅ All touch targets minimum 44x44px
✅ Typography scales with viewport (globals.css)
✅ Buttons and forms stack on mobile, inline on desktop
✅ Navigation adapts (hamburger on mobile, full nav on desktop)
✅ Modal dialogs optimized for mobile (full-width buttons, reverse order)
✅ Charts and visualizations scale appropriately
✅ Loading states with skeleton components

## Testing

- Use Chrome DevTools responsive mode
- Test at breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop)
- Ensure no horizontal scrolling
- Verify touch targets are accessible

## Recent Improvements (Phase 3)

### Completed Enhancements ✅
- **Mobile Navigation**: Hamburger menu with slide-out drawer using Headless UI
- **Typography System**: Global responsive typography with proper scaling
- **Design System**: Complete component library with Button, Card, Input, Badge, etc.
- **Toast Notifications**: Auto-dismiss, icons, animations, mobile-friendly positioning
- **Modal Dialogs**: Enhanced with icons, backdrop blur, better mobile styling
- **Chart Tooltips**: Richer information display with progress indicators
- **Loading States**: Skeleton components for all data-loading sections
- **ARIA Labels**: Comprehensive accessibility improvements with role attributes
- **Animations**: Fade-in and slide-up animations for page transitions
- **Visual Polish**: Shadows, backdrop blur, hover effects throughout

### Design System Color Palette
```typescript
// Tailwind config extended with full semantic colors
primary: { DEFAULT: '#0e7490', 50-900 shades }
success: { light: '#86efac', DEFAULT: '#22c55e', dark: '#16a34a' }
warning: { light: '#fbbf24', DEFAULT: '#f97316', dark: '#ea580c' }
danger: { light: '#fca5a5', DEFAULT: '#ef4444', dark: '#dc2626' }
```

### Animation System
```css
/* Available animations (see globals.css and tailwind.config.ts) */
.animate-fadeIn      /* Smooth fade-in effect */
.animate-slideUp     /* Slide up from bottom */
.animate-shimmer     /* Loading shimmer effect */
```

## Notes for AI Sessions

⚠️ **IMPORTANT**: When adding new features or components:
- Always use responsive Tailwind classes (`sm:`, `md:`, `lg:`)
- Structure layouts to stack on mobile by default
- Don't add fixed widths that break on mobile
- Test responsive behavior in your changes
- Maintain this responsive-aware approach throughout

