# Tech Stack & Build System

## Core Technologies

- **Framework**: Next.js 14.2.3 with App Router
- **Runtime**: React 18.3.1 + TypeScript 5.4.5
- **Styling**: TailwindCSS 3.4.1 with custom design system
- **Charts**: Recharts 2.8.0 for data visualization
- **UI Components**: Headless UI + Heroicons
- **Deployment**: Railway (Node.js runtime)

## Key Libraries

- `clsx` - Conditional CSS classes
- `sharp` - Image optimization
- `dotenv` - Environment variable management

## Common Commands

```bash
# Development
npm run dev              # Start dev server on localhost:3000

# Production
npm run build           # Build for production (includes deployment alerts)
npm run start           # Start production server
npm run lint            # Run ESLint

# Deployment Testing
npm run test:alerts     # Test deployment notification system
npm run alert           # Manual deployment alert trigger
```

## Build Process

The build includes automated deployment notifications:
- `build_start` - Notifies when build begins
- `build_success` - Confirms successful build
- `build_failure` - Alerts on build errors
- `deployment_success` - Confirms successful deployment

## Environment Variables

```bash
NEXT_PUBLIC_BACKEND_URL=https://backend-url.railway.app
NEXT_PUBLIC_BACKEND_TOKEN=your-api-token
NEXT_PUBLIC_TIMEZONE_LABEL=Asia/Kuala_Lumpur
```

## Development Philosophy

**Simple first, perfect later.** Focus on getting core functionality working before adding complexity. Use straightforward patterns and avoid over-engineering.