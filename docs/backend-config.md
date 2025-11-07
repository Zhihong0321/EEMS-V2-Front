# EEMS V2 Backend Configuration

This document records the backend connection details for the Eternalgy EMS Frontend (prototype).

Last updated: Automatically by assistant

## Backend URL

- Base URL: https://eems-v2-backend-production.up.railway.app
- Note: The value is stored in `.env.local` as `NEXT_PUBLIC_BACKEND_URL`. It is intentionally saved without a trailing slash to avoid `//api/...` when concatenating paths.

## API Authentication

- API key (prototype): 01121000099
- Header: `x-api-key: <API_KEY>`
- Stored in `.env.local` as `NEXT_PUBLIC_BACKEND_TOKEN`. For Railway deployments, alternative env names are supported by the app:
  - `NEXT_PUBLIC_BACKEND_WRITE_TOKEN`
  - `NEXT_PUBLIC_BACKEND_KEY`
  - `NEXT_PUBLIC_BACKEND_API_KEY`

## API Documentation

- Reference: https://eems-v2-backend-production.up.railway.app/
- The Swagger/guide documents available at the base URL describe endpoints like:
  - `POST /api/v1/simulators`
  - `GET /api/v1/simulators`
  - `POST /api/v1/readings:ingest`
  - `GET /api/v1/blocks/latest?simulator_id=<UUID>`
  - `GET /api/v1/blocks/history?simulator_id=<UUID>&limit=<N>`
  - `GET /api/v1/stream/<simulator_id>` (SSE)
  - `GET /healthz`

## Frontend Behavior & Tips

- The frontend reads:
  - `NEXT_PUBLIC_BACKEND_URL` for the base URL.
  - Write requests automatically add `x-api-key` from `NEXT_PUBLIC_BACKEND_TOKEN` (or the alternate env vars listed above).
- You can override the key at runtime on the `/health` page:
  - Paste a key in “Manual API key override”.
  - Optionally tick “Remember on this device” to persist locally.

## Changing Values

1. Edit `.env.local` and update any of:
   - `NEXT_PUBLIC_BACKEND_URL`
   - `NEXT_PUBLIC_BACKEND_TOKEN`
   - `NEXT_PUBLIC_TIMEZONE_LABEL`
2. Restart the dev server if running (or reload the app) to apply changes.

## Security Note (Prototype)

This prototype exposes the API key to the browser for convenience in simulation. In production, route writes through a server action or edge function that injects the real secret.