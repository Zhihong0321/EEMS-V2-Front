# Project Structure & Organization

## Folder Layout

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Welcome page (simulator list/create)
│   ├── sim/[id]/          # Simulator-specific routes
│   │   ├── page.tsx       # Dashboard view
│   │   └── run/page.tsx   # Simulator controls
│   └── test-*/            # Development/testing pages
├── components/            # Reusable UI components
│   ├── dashboard/         # Dashboard-specific components
│   ├── notifications/     # WhatsApp notification components
│   ├── common/            # Shared components (panels, forms)
│   └── ui/               # Base UI primitives
└── lib/                  # Business logic & utilities
    ├── hooks.ts          # Custom React hooks
    ├── emitter.ts        # Simulator emitter logic
    ├── api.ts            # Backend API calls
    └── types.ts          # TypeScript definitions
```

## Component Patterns

### Page Components
- Keep pages thin - delegate to components and hooks
- Use server components where possible, client components for interactivity
- Follow Next.js App Router conventions

### UI Components
- **Controlled components** - no internal state for business logic
- **Responsive-first** - mobile-friendly with Tailwind breakpoints
- **Accessible** - proper ARIA labels and keyboard navigation

### Custom Hooks
- `useSimulators()` - Simulator CRUD operations
- `useLatestBlock()` - Real-time block data via SSE
- `useAutoEmitter()` / `useManualEmitter()` - Simulator controls

## File Naming

- **Pages**: `page.tsx`, `layout.tsx` (Next.js conventions)
- **Components**: PascalCase (`CurrentBlockChart.tsx`)
- **Hooks/Utils**: camelCase (`hooks.ts`, `api.ts`)
- **Types**: Shared in `lib/types.ts`

## Code Organization Rules

1. **Business logic in `/lib`** - Keep components focused on UI
2. **One component per file** - Easier to maintain and test
3. **Co-locate related files** - Group dashboard components together
4. **Minimal abstractions** - Don't over-engineer, keep it simple

## Import Patterns

```typescript
// External libraries first
import { useState } from "react";
import clsx from "clsx";

// Internal imports with @/ alias
import { useLatestBlock } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import type { Simulator } from "@/lib/types";
```