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
```

### Heights/Sizing
```tsx
// ✅ Smaller on mobile, larger on desktop
<div className="h-48 md:h-72">
  {/* Chart content */}
</div>
```

### Text/Typography
```tsx
// ✅ Smaller headings on mobile
<h1 className="text-2xl md:text-3xl font-semibold">
```

### Spacing
```tsx
// ✅ Less padding on mobile
<div className="p-4 md:p-6 lg:p-8">
```

### Flex Direction
```tsx
// ✅ Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
```

## Components Status

### ✅ Responsive-Aware (Updated)
- `combined-dashboard.tsx` - Uses responsive grids
- `current-block-chart.tsx` - Chart height responsive
- Dashboard layout - Stacks on mobile

### 📝 Future Components
When adding new components:
1. Use responsive classes from the start
2. Test on mobile viewport (Chrome DevTools)
3. Ensure touch targets are at least 44px
4. Polish mobile UX when content is stable

## Testing

- Use Chrome DevTools responsive mode
- Test at breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop)
- Ensure no horizontal scrolling
- Verify touch targets are accessible

## Future Polish Phase

When content is complete (logo, landing page, etc.), polish:
- Fine-tune mobile spacing/padding
- Optimize touch targets
- Mobile-specific navigation
- Logo placement/sizing across breakpoints
- Mobile landing page experience

## Notes for AI Sessions

⚠️ **IMPORTANT**: When adding new features or components:
- Always use responsive Tailwind classes (`sm:`, `md:`, `lg:`)
- Structure layouts to stack on mobile by default
- Don't add fixed widths that break on mobile
- Test responsive behavior in your changes
- Maintain this responsive-aware approach throughout

