# EEMS Frontend Design System
**Version:** 1.0  
**Last Updated:** November 1, 2025  
**Status:** Production Ready

---

## 📐 Overview

This document defines the complete design system for the EEMS Frontend application. All components, patterns, and styles documented here are implemented and ready for use.

---

## 🎨 Color System

### Primary Palette (Cyan)
```typescript
primary: {
  50:  '#ecfeff',  // Ultra light (backgrounds)
  100: '#cffafe',  // Very light
  200: '#a5f3fc',  // Light
  300: '#67e8f9',  // Light accent
  400: '#22d3ee',  // Main accent
  500: '#06b6d4',  // Standard
  600: '#0891b2',  // Hover
  700: '#0e7490',  // DEFAULT (current primary)
  800: '#155e75',  // Dark
  900: '#164e63',  // Very dark
  DEFAULT: '#0e7490',
  foreground: '#ffffff',
}
```

**Usage:**
- Buttons: `bg-primary` (700), `hover:bg-cyan-600` (600)
- Links: Active states, highlights
- Focus rings: `ring-primary`

### Semantic Colors

#### Success (Green)
```typescript
success: {
  light: '#86efac',    // Light highlights
  DEFAULT: '#22c55e',  // Main success color
  dark: '#16a34a',     // Darker variant
  hover: '#15803d',    // Hover state
}
```

**Usage:** Success messages, positive indicators, "safe" status

#### Warning (Orange)
```typescript
warning: {
  light: '#fbbf24',    // Light highlights
  DEFAULT: '#f97316',  // Main warning color
  dark: '#ea580c',     // Darker variant
  hover: '#c2410c',    // Hover state
}
```

**Usage:** Warnings, 80-100% thresholds, caution states

#### Danger (Red)
```typescript
danger: {
  light: '#fca5a5',    // Light highlights
  DEFAULT: '#ef4444',  // Main danger color
  dark: '#dc2626',     // Darker variant
  hover: '#b91c1c',    // Hover state
}
```

**Usage:** Errors, delete actions, >100% thresholds

### Neutral Palette (Slate)
```typescript
slate: {
  950: '#020617',  // Background
  900: '#0f172a',  // Cards, elevated surfaces
  800: '#1e293b',  // Borders, dividers
  700: '#334155',  // Subtle borders
  600: '#475569',  // Disabled text
  500: '#64748b',  // Muted text
  400: '#94a3b8',  // Secondary text
  300: '#cbd5e1',  // Primary text (light mode)
  200: '#e2e8f0',  // Borders (light mode)
  100: '#f1f5f9',  // Backgrounds (light mode)
}
```

**Usage:**
- `slate-950`: Page background
- `slate-900`: Card backgrounds
- `slate-800`: Borders
- `slate-400`: Secondary text
- `slate-100`: Primary text

---

## 📝 Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

**Features:**
- Antialiased rendering
- OpenType features enabled (cv02, cv03, cv04, cv11)
- System font fallbacks

### Type Scale

#### Headings
```css
/* H1 - Page Titles */
h1 {
  font-size: 1.5rem;     /* 24px mobile */
  sm: 1.875rem;          /* 30px tablet */
  lg: 2.25rem;           /* 36px desktop */
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

/* H2 - Section Titles */
h2 {
  font-size: 1.25rem;    /* 20px mobile */
  sm: 1.5rem;            /* 24px tablet */
  lg: 1.875rem;          /* 30px desktop */
  font-weight: 600;
  line-height: 1.2;
}

/* H3 - Subsection Titles */
h3 {
  font-size: 1.125rem;   /* 18px mobile */
  sm: 1.25rem;           /* 20px tablet */
  lg: 1.5rem;            /* 24px desktop */
  font-weight: 600;
  line-height: 1.2;
}
```

#### Body Text
```css
/* Base body text */
text-sm sm:text-base    /* 14px → 16px */

/* Small text */
text-xs sm:text-sm      /* 12px → 14px */

/* Large text */
text-base sm:text-lg    /* 16px → 18px */
```

### Font Weights
- **Regular (400)**: Body text
- **Medium (500)**: Labels, nav links
- **Semibold (600)**: Headings, buttons
- **Bold (700)**: Emphasis (sparingly used)

---

## 🧩 Components

### Button Component
**Location:** `src/components/ui/button.tsx`

#### Variants
```typescript
// Primary - Main CTAs
<Button variant="primary" size="md">
  Create Simulator
</Button>
// Appearance: Cyan background, white text, shadow

// Secondary - Alternative actions  
<Button variant="secondary" size="md">
  Cancel
</Button>
// Appearance: Transparent with border, hover background

// Ghost - Subtle actions
<Button variant="ghost" size="md">
  Details
</Button>
// Appearance: No border, hover background only

// Danger - Destructive actions
<Button variant="danger" size="md">
  Delete
</Button>
// Appearance: Red background, white text

// Success - Confirmation actions
<Button variant="success" size="md">
  Confirm
</Button>
// Appearance: Green background, white text
```

#### Sizes
```typescript
sm:  px-3 py-1.5 text-xs  min-h-[36px]
md:  px-4 py-2 text-sm    min-h-[44px]  // Default
lg:  px-6 py-3 text-base  min-h-[48px]
```

#### States
```typescript
// Loading state
<Button isLoading={true}>Processing...</Button>

// Disabled state
<Button disabled>Can't Click</Button>
```

#### Styling
- **Transitions:** 150ms all properties
- **Hover:** Scale 0.95, shadow increase
- **Focus:** Primary ring, 2px offset
- **Active:** Slight scale down

---

### Card Component
**Location:** `src/components/ui/card.tsx`

#### Basic Usage
```typescript
<Card variant="default">
  <CardHeader>
    <h3>Card Title</h3>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Variants
```typescript
default:     bg-slate-900/60, shadow-md
elevated:    bg-slate-900, shadow-lg
interactive: cursor-pointer, hover:border-primary-700
flat:        shadow-none
```

#### Styling
- **Border Radius:** `rounded-xl` (12px)
- **Border:** `border-slate-800`
- **Backdrop:** `backdrop-blur-sm`
- **Shadow:** `shadow-md hover:shadow-lg`
- **Transition:** `transition-shadow duration-300`

---

### Input Components
**Location:** `src/components/ui/input.tsx`

#### Text Input
```typescript
<Input 
  type="text"
  placeholder="Enter value"
  error={!!error}
  success={isValid}
/>
```

#### With Label & Validation
```typescript
<InputWrapper 
  label="Simulator Name" 
  error={errors.name?.message}
  helperText="Choose a unique name"
  required
>
  <Input 
    type="text"
    {...register('name')}
  />
</InputWrapper>
```

#### Select Dropdown
```typescript
<Select value={mode} onChange={handleChange}>
  <option value="auto">Auto</option>
  <option value="manual">Manual</option>
</Select>
```

#### States
- **Default:** `border-slate-800`
- **Focus:** `border-primary ring-primary/20`
- **Error:** `border-danger ring-danger/20`
- **Success:** `border-success ring-success/20`
- **Disabled:** `opacity-50 cursor-not-allowed`

---

### Badge Component
**Location:** `src/components/ui/badge.tsx`

#### Variants
```typescript
<Badge variant="success">Active</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Error</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="neutral">Neutral</Badge>
```

#### Styling
- **Shape:** `rounded-full`
- **Padding:** `px-2.5 py-1`
- **Font:** `text-xs font-medium`
- **Border:** Semi-transparent matching background

---

### Skeleton Loader
**Location:** `src/components/ui/skeleton.tsx`

#### Basic Usage
```typescript
// Generic skeleton
<Skeleton className="h-8 w-48" />

// Text lines
<SkeletonText lines={3} />

// Full card
<SkeletonCard />
```

#### Styling
- **Animation:** `animate-pulse`
- **Background:** `bg-slate-800/40`
- **Border Radius:** `rounded-md`

---

### Empty State
**Location:** `src/components/ui/empty-state.tsx`

#### Usage
```typescript
<EmptyState
  icon={<DocumentIcon className="h-12 w-12" />}
  title="No simulators yet"
  description="Create your first simulator to get started."
  action={<Button>Create Simulator</Button>}
/>
```

#### Styling
- **Border:** Dashed, `border-slate-800`
- **Background:** `bg-slate-900/40`
- **Layout:** Centered, flexbox column

---

## 🎭 Shadows & Elevation

### Shadow System
```typescript
// Tailwind shadow classes
shadow-sm    // Subtle hover effects
shadow-md    // Cards default state
shadow-lg    // Cards hover, elevated content
shadow-xl    // Modals, dropdowns
shadow-2xl   // Maximum elevation
shadow-glow  // Primary color glow (interactive)
```

### Usage Patterns
```typescript
// Standard card
className="shadow-md hover:shadow-lg transition-shadow duration-300"

// Modal/Dialog
className="shadow-2xl"

// Interactive element
className="shadow-sm hover:shadow-glow"
```

---

## 📏 Spacing System

### Container Padding
```css
/* Page containers */
Mobile:    px-4  (16px)
Tablet:    sm:px-6  (24px)
Desktop:   lg:px-8  (32px)

/* Card padding */
Mobile:    p-4  (16px)
Tablet:    sm:p-6  (24px)
```

### Component Gaps
```css
Tight:      gap-2  (8px)
Default:    gap-4  (16px)
Comfortable: gap-6  (24px)
Spacious:   gap-10  (40px)
```

### Section Spacing
```css
/* Between sections */
space-y-6   (24px) - Default
space-y-10  (40px) - Page sections
```

---

## 🎬 Animations

### Available Animations
```css
/* Fade in */
@keyframes fadeIn {
  0%   { opacity: 0 }
  100% { opacity: 1 }
}

/* Slide up */
@keyframes slideUp {
  0%   { transform: translateY(10px); opacity: 0 }
  100% { transform: translateY(0); opacity: 1 }
}

/* Shimmer (loading) */
@keyframes shimmer {
  0%   { background-position: -1000px 0 }
  100% { background-position: 1000px 0 }
}
```

### Usage
```typescript
// Fade in
className="animate-fadeIn"

// Pulse (attention)
className="animate-pulse"

// Spin (loading)
className="animate-spin"

// Shimmer (skeleton)
className="animate-shimmer"
```

### Transition Durations
```css
duration-150  // Quick (hover effects)
duration-200  // Default (most transitions)
duration-300  // Smooth (cards, larger elements)
duration-500  // Slow (drawers, page transitions)
```

---

## ♿ Accessibility

### Focus Styles
```css
/* Global focus visible */
*:focus-visible {
  outline: none;
  ring: 2px solid primary;
  ring-offset: 2px;
  ring-offset-color: slate-950;
}
```

### Touch Targets
**Minimum Size:** 44x44px (iOS), 48x48px (Material Design)

```typescript
// All interactive elements
className="min-h-[44px] min-w-[44px]"

// Links in navigation
className="px-3 py-2 min-h-[44px]"
```

### ARIA Labels
```typescript
// Icon buttons
<button aria-label="Close menu">
  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
</button>

// Navigation
<nav aria-label="Main navigation">

// Current page
<Link aria-current="page">
```

---

## 📱 Responsive Breakpoints

### Tailwind Breakpoints
```css
sm:  640px   // Small tablets
md:  768px   // Tablets landscape
lg:  1024px  // Desktop
xl:  1280px  // Large desktop
2xl: 1536px  // Extra large
```

### Common Patterns

#### Grid Layouts
```typescript
// 1 col mobile → 2 col tablet → 3 col desktop
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

// Sidebar layout
className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6"
```

#### Flex Direction
```typescript
// Stack mobile → row desktop
className="flex flex-col md:flex-row gap-4"
```

#### Typography
```typescript
// Responsive text size
className="text-sm sm:text-base"
className="text-2xl sm:text-3xl lg:text-4xl"
```

---

## 🎯 Component Patterns

### Page Header Pattern
```typescript
<header className="space-y-3">
  <h1>Page Title</h1>
  <p className="max-w-2xl text-sm sm:text-base text-slate-400">
    Description text
  </p>
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary">Primary Action</Button>
    <Button variant="secondary">Secondary Action</Button>
  </div>
</header>
```

### Card Grid Pattern
```typescript
<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
  {items.map(item => (
    <Card key={item.id}>
      <CardContent>
        {/* Card content */}
      </CardContent>
    </Card>
  ))}
</div>
```

### Form Pattern
```typescript
<form className="space-y-4" onSubmit={handleSubmit}>
  <InputWrapper label="Name" required error={errors.name}>
    <Input type="text" {...register('name')} />
  </InputWrapper>
  
  <div className="flex justify-end gap-3 pt-2">
    <Button variant="secondary" onClick={onCancel}>
      Cancel
    </Button>
    <Button variant="primary" type="submit" isLoading={isSubmitting}>
      Submit
    </Button>
  </div>
</form>
```

---

## 🔍 Usage Guidelines

### When to Use Each Component

#### Buttons
- **Primary:** Main action per section (max 1-2)
- **Secondary:** Alternative actions, cancel
- **Ghost:** Tertiary actions, links
- **Danger:** Delete, destructive actions
- **Success:** Confirmations

#### Cards
- **Default:** Most content containers
- **Elevated:** Important sections, focused content
- **Interactive:** Clickable cards
- **Flat:** Nested cards, subtle containers

#### Badges
- **Success:** Positive states (<80%)
- **Warning:** Caution states (80-100%)
- **Danger:** Error states (>100%)
- **Info:** Informational states
- **Neutral:** Default/inactive states

---

## 📚 Related Documentation

- `RESPONSIVE.md` - Responsive design guidelines
- `UI_PRODUCTION_PLAN.md` - Implementation roadmap
- `CODE_PATTERNS_REFERENCE.md` - Code examples

---

## 🔄 Version History

### v1.0 (November 1, 2025)
- Initial design system documentation
- All components implemented and production-ready
- Complete color, typography, and spacing systems
- Responsive patterns documented

---

**Questions?** Refer to the code in `src/components/ui/` for implementation details.

