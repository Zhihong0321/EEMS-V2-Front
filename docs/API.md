# Eternalgy EMS Backend API – Practical Guide and Test Cookbook

This document provides a concise, actionable reference of the backend API used by the EEMS frontend, with ready-to-run test commands and payload shapes. Use it during development and debugging, especially for schema verification and 422/401/404/500 diagnostics.

Last updated: assistant

## Base URL and Authentication
- Base URL: https://eems-v2-backend-production.up.railway.app
- Authentication: header `x-api-key: 01121000099` (prototype)
- Content type for writes: `Content-Type: application/json`
- Recommended header for reads: `Accept: application/json`

## Health Endpoints
- GET /healthz
  - Response: `{ "ok": true }`
  - PowerShell:
    Invoke-WebRequest -Uri "https://eems-v2-backend-production.up.railway.app/healthz" -Method GET -UseBasicParsing

- GET /api/v1/health
  - Note: May not be present in all deployments; expect 404

- GET /
  - Returns API documentation HTML page

## Simulators

### GET /api/v1/simulators
- Description: List all simulators
- Headers: `x-api-key` recommended; `Accept: application/json`
- Response: Either a raw array or `{ "data": Simulator[] }`
- Simulator type:
  ```json
  {
    "id": "<UUID>",
    "name": "Factory A",
    "target_kwh": 120,
    "whatsapp_number": 60123456789,
    "created_at": "2024-05-02T06:00:00Z",
    "updated_at": "2024-05-02T06:00:00Z"
  }
  ```
- PowerShell:
  ```powershell
  $headers = @{ "x-api-key" = "01121000099"; "Accept" = "application/json" }
  Invoke-RestMethod -Uri "https://eems-v2-backend-production.up.railway.app/api/v1/simulators" -Headers $headers -Method GET
  ```

### POST /api/v1/simulators
- Description: Create a simulator (flat JSON body)
- Body schema:
  ```json
  { "name": "Factory A", "target_kwh": 120, "whatsapp_number": 60123456789 }
  ```
- Response: `Simulator` or `{ "data": Simulator }`
- Common 422 cause: nested body `{ "simulator": { ... } }` – must be flat
- PowerShell:
  ```powershell
  $headers = @{ "x-api-key" = "01121000099"; "Content-Type" = "application/json" }
  $body = @{ name = "Factory A"; target_kwh = 120 } | ConvertTo-Json
  $created = Invoke-RestMethod -Uri "https://eems-v2-backend-production.up.railway.app/api/v1/simulators" -Headers $headers -Method POST -Body $body
  $simId = ($created.data ?? $created).id
  ```

## Blocks

### GET /api/v1/blocks/latest?simulator_id=<UUID>
- Description: Fetch latest block metrics for a simulator
- Query: `simulator_id` must be a valid UUID
- Response:
  ```json
  {
    "simulator_id": "<UUID>",
    "block_start_local": "2024-05-02T14:00:00+08:00",
    "block_start_utc": "2024-05-02T06:00:00Z",
    "block_end_utc": "2024-05-02T06:30:00Z",
    "target_kwh": 120.0,
    "accumulated_kwh": 96.5,
    "percent_of_target": 80.42,
    "alerted_80pct": true,
    "chart_bins": { "bin_seconds": 30, "points": [12.5, 24.8, ...] }
  }
  ```
- PowerShell:
  ```powershell
  Invoke-RestMethod -Uri "https://eems-v2-backend-production.up.railway.app/api/v1/blocks/latest?simulator_id=$simId" -Headers @{ "x-api-key" = "01121000099" } -Method GET
  ```

-### GET /api/v1/blocks/history?simulator_id=<UUID>&limit=<N>
- Description: Fetch recent block summaries for a simulator
- Response: `HistoryBlock[]` or `{ "data": HistoryBlock[] }` or `{ "items": HistoryBlock[] }`
- HistoryBlock:
  ```json
  { "block_start_local": "2024-05-02T13:30:00+08:00", "target_kwh": 120.0, "accumulated_kwh": 101.2, "percent_of_target": 84.33 }
  ```
- PowerShell:
  ```powershell
  Invoke-RestMethod -Uri "https://eems-v2-backend-production.up.railway.app/api/v1/blocks/history?simulator_id=$simId&limit=10" -Headers @{ "x-api-key" = "01121000099" } -Method GET
  ```

## Readings

### POST /api/v1/readings:ingest
- Description: Ingest device ticks
- Body schema:
  ```json
  {
    "simulator_id": "<UUID>",
    "mode": "manual",
    "ticks": [
      { "power_kw": 2, "sample_seconds": 15, "device_ts": "2024-05-02T06:00:30Z" }
    ]
  }
  ```
- Response: 200 OK, empty body
- PowerShell:
  ```powershell
  $ts = (Get-Date).ToUniversalTime().ToString("o")
  $body = @{ simulator_id = $simId; mode = "manual"; ticks = @(@{ power_kw = 2; sample_seconds = 15; device_ts = $ts }) } | ConvertTo-Json
  Invoke-WebRequest -Uri "https://eems-v2-backend-production.up.railway.app/api/v1/readings:ingest" -Headers @{ "x-api-key" = "01121000099"; "Content-Type" = "application/json" } -Method POST -Body $body -UseBasicParsing
  ```

## Server-Sent Events (SSE)

- GET /api/v1/stream/<simulator_id>
  - Description: Live stream of readings and block updates
  - Note: HEAD may return 404; test via a browser or curl to observe events
  - Frontend uses EventSource in `useLatestBlock`

## Error Handling and Diagnostics
- 422 Unprocessable Entity: Most common when request body shape is invalid. For creating simulators, ensure flat JSON body (no nested `simulator`).
- 401 Unauthorized: Invalid or missing `x-api-key`.
- 404 Not Found: Endpoint not present or invalid simulator_id.
- 500 Internal Server Error: Backend-side failure; retry logic is implemented for certain statuses (see frontend lib/api.ts).

## Frontend Mapping
- src/lib/api.ts
  - GET /api/v1/simulators: `getSimulators()`
  - POST /api/v1/simulators: `createSimulator(input)`
  - GET /api/v1/blocks/latest: `fetchLatestBlock(simulatorId)`
  - GET /api/v1/blocks/history: `fetchBlockHistory(simulatorId, limit)`
  - POST /api/v1/readings:ingest: `ingestReadings(payload)`
  - SSE: `simulatorEndpoint("/api/v1/stream/<id>")` via `useLatestBlock`

## Known Hosting Behaviors
- Some hosting layers return the HTML documentation page even on errors. Prefer `Invoke-RestMethod` for JSON, and include `Accept: application/json`.
- If you receive HTML instead of JSON, confirm the exact status code and try again with explicit headers.

## Quick Verification Script (PowerShell)
```powershell
$base = "https://eems-v2-backend-production.up.railway.app"
$apiKey = "01121000099"

# Create simulator
$headersWrite = @{ "x-api-key" = $apiKey; "Content-Type" = "application/json" }
$body = @{ name = "Factory A $(Get-Date -Format "yyyyMMddHHmmss")"; target_kwh = 120 } | ConvertTo-Json
$created = Invoke-RestMethod -Uri "$base/api/v1/simulators" -Headers $headersWrite -Method POST -Body $body
if ($created.data) { $created = $created.data }
$simId = $created.id
Write-Host "Created id=$simId"

# Latest block
Invoke-RestMethod -Uri "$base/api/v1/blocks/latest?simulator_id=$simId" -Headers @{ "x-api-key" = $apiKey } -Method GET

# Ingest
$ts = (Get-Date).ToUniversalTime().ToString("o")
$ingestBody = @{ simulator_id = $simId; mode = "manual"; ticks = @(@{ power_kw = 2; sample_seconds = 15; device_ts = $ts }) } | ConvertTo-Json
Invoke-WebRequest -Uri "$base/api/v1/readings:ingest" -Headers $headersWrite -Method POST -Body $ingestBody -UseBasicParsing

# History
Invoke-RestMethod -Uri "$base/api/v1/blocks/history?simulator_id=$simId&limit=5" -Headers @{ "x-api-key" = $apiKey } -Method GET
```

## Troubleshooting Checklist
- Verify `.env.local` values (`NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_BACKEND_TOKEN`).
- Confirm request body shapes are flat and conform to documented schema.
- Ensure `x-api-key` is present on write endpoints.
- Add `Accept: application/json` when testing with tools that may default to HTML.
- Review backend `/healthz` to confirm service availability.