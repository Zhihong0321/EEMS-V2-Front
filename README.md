

# Eternalgy EMS — Frontend & Simulator Project Spec (Prototype)

**Repo:** `eternalgy-ems-frontend`
**Stack:** Next.js (App Router) + React + TypeScript
**UI:** TailwindCSS (+ optional shadcn/ui)
**Charts:** Recharts (or lightweight D3 wrapper)
**Live updates:** Server-Sent Events (SSE) to Backend
**Deploy:** Railway (Node runtime)
**Business timezone:** `Asia/Kuala_Lumpur` (for display only; logic is handled by backend)

---

## 0) Purpose (What & Why)

**What:**
A minimal UI to (1) create/select a simulator profile, (2) run a **Simulator Meter** in Auto or Manual (fast-forward) mode that pushes readings to the backend, and (3) show a **live EMS dashboard** of the latest 30-minute block and the last 10 blocks.

**Why:**

* Enable quick prototyping for 30-minute MD control UX.
* Keep everything simple for smooth Railway deploys.
* Use **REST + SSE** so no WebSocket infra is needed.
* Make a future switch to MQTT straightforward (by optionally adding a publisher in Simulator later; not required now).

**When:**
Now (prototype). Production hardening (auth, roles, caching, MQTT publisher) comes later.

---

## 1) High-Level Architecture (How)

```
[Next.js Frontend UI]
  ├─ Pages:
  │   ├─ /           (Welcome: simulator list, create)
  │   ├─ /sim/:id    (Dashboard: current 30m chart + last 10 blocks)
  │   └─ /sim/:id/run (Simulator: Auto/Manual controls, send ticks)
  ├─ Data Fetch:
  │   ├─ REST (Backend): /simulators, /blocks/latest, /blocks/history, /readings:ingest
  │   └─ SSE  (Backend): /stream/:simulator_id → live updates
  └─ State:
      ├─ Simulator selection (id, name, target)
      ├─ Simulator run config (auto/manual, base kW, volatility, slider value)
      └─ Live chart model (60 bins for 30-minute window)
```

**Networking assumptions:**

* `NEXT_PUBLIC_BACKEND_URL` points to the backend Railway URL.
* All **writes** require API key header (`x-api-key`). Provide it via env var `NEXT_PUBLIC_BACKEND_TOKEN` (or paste an override on the `/health` page for prototypes). In production, move this to a server proxy or session auth.

---

## 2) Environment Variables

* `NEXT_PUBLIC_BACKEND_URL` — e.g., `https://eternalgy-ems-backend.up.railway.app`
* `NEXT_PUBLIC_BACKEND_TOKEN` — only for prototype (write routes). Optional if you plan to paste an override on `/health`.
* `NEXT_PUBLIC_TIMEZONE_LABEL` — default: `Asia/Kuala_Lumpur` (for UI labels).

> Railway quirk: if the dashboard rewrites variable names containing `API`/`KEY`, you can instead set `NEXT_PUBLIC_BACKEND_TOKEN` (preferred) or `NEXT_PUBLIC_BACKEND_WRITE_TOKEN`. The app will also accept the legacy `NEXT_PUBLIC_BACKEND_KEY` / `NEXT_PUBLIC_BACKEND_API_KEY` names if you already have them configured elsewhere.

> **Security note (prototype):** Exposing API key to the browser is acceptable here only for simulation. Later, route writes through a Next server action / edge function that injects the real secret.

---

## 3) Pages & UX Requirements

### 3.1 Welcome (`/`)

**What:** List existing simulators; create a new one.

**Why:** Quick access to a test meter profile.

**UI:**

* **List**: Card per simulator: `name`, `target_kwh`, `last activity` (derived from blocks or readings fetch), buttons:

  * “Open Dashboard”
  * “Run Simulator”
* **Create Modal**: fields `name`, `target_kwh`, `whatsapp_number` (digits only) → `POST /api/v1/simulators`
* Empty-state with CTA to create first simulator.

**Acceptance:**

* [ ] Lists simulators from `GET /api/v1/simulators`.
* [ ] Creates simulator and shows it immediately without page reload.

---

### 3.2 Dashboard (`/sim/:id`)

**What:** Live view of the active 30-minute block + last 10 blocks.

**Why:** Let users visualize if they are approaching MD threshold.

**UI:**

* **Header**: simulator name, target kWh, timezone label `Asia/Kuala_Lumpur (UTC+8)`.
* **Current 30-min Chart**:

  * X: 60 ticks for **30 seconds** each (0→30:00)
  * Y: **cumulative kWh** (must match backend `chart_bins.points`)
  * Horizontal reference line at `target_kwh`
  * Subtext with block local time window, e.g., `14:00–14:30`
* **Tiles (last 10 blocks)**:

  * Each: `accumulated / target` kWh and percentage
  * Color: green (<80%), amber (80–100%), red (>100%)

**Data:**

* On mount:

  * `GET /api/v1/blocks/latest?simulator_id=UUID`
  * `GET /api/v1/blocks/history?simulator_id=UUID&limit=10`
  * Open **SSE** to `/api/v1/stream/:simulator_id`
* On SSE event:

  * `reading`: optionally animate “pulse” on chart.
  * `block-update`: refresh current 30-min series and headline numbers.
  * `alert-80pct`: show a toast: “Reached 80% of target (…kWh). WhatsApp alert sent.”

**Acceptance:**

* [ ] Renders 60 cumulative points, updates live via SSE.
* [ ] Tiles update when the block rolls over (new window).
* [ ] Reference line at exact `target_kwh`.

---

### 3.3 Simulator (`/sim/:id/run`)

**What:** Emit readings to backend in **Auto** or **Manual (fast-forward)** mode.

**Why:** Drive the backend aggregation and alerts without real hardware.

**Modes & Behavior:**

* **Auto Mode**

  * Inputs:

    * **Base Power (kW)** (e.g., default 300)
    * **Volatility %** (applied as ±% per tick; default 5%)
    * **Interval** = **15 seconds** (fixed)
  * On **Start**: begin a `setInterval(15s)` that computes:

    ```
    power_kw = base * (1 + random(-vol, +vol))
    sample_seconds = 15
    device_ts = now() in UTC (ISO 8601)
    ```

    POST batch with one tick to `/api/v1/readings:ingest`.
  * On **Stop**: clear interval.

* **Manual Mode (FAST-FORWARD x15)**

  * UI: **vertical slider** (0 → Max kW; default max e.g., 800 kW).
  * Behavior: every **1 second** browser time, send:

    ```
    power_kw = slider_value
    sample_seconds = 15    // this is the FAST-FORWARD factor
    device_ts = now() UTC
    ```
  * Shows a badge: “FAST-FORWARD x15 (1s = 15s simulated)”.

**Shared Details:**

* Always send `simulator_id`, `mode: "auto"|"manual"`, and `ticks` array (even if length 1).
* Include `x-api-key` on write calls (prototype).
* If a request fails, retry with exponential backoff (max 3); show non-blocking toast if repeated failures.

**Acceptance:**

* [ ] Auto emits a tick every 15s (real time).
* [ ] Manual emits **1/sec** with `sample_seconds=15`.
* [ ] Stopping truly halts network calls and UI indicates “Stopped”.

---

## 4) Client Data Models (TypeScript)

```ts
export type Simulator = {
  id: string;
  name: string;
  target_kwh: number;
  whatsapp_number?: number | null;
  created_at: string;
  updated_at: string;
};

export type TickIn = {
  power_kw: number;         // >= 0
  sample_seconds: number;   // > 0 (15 for both modes; manual sends every 1s but 15s simulated)
  device_ts?: string;       // ISO8601 UTC
};

export type IngestRequest = {
  simulator_id: string;
  mode?: 'auto' | 'manual';
  ticks: TickIn[];
};

export type LatestBlock = {
  simulator_id: string;
  block_start_local: string; // ISO8601 +08:00
  block_start_utc: string;
  block_end_utc: string;
  target_kwh: number;
  accumulated_kwh: number;
  percent_of_target: number;
  alerted_80pct: boolean;
  chart_bins: { bin_seconds: number; points: number[] }; // length 60
};

export type HistoryBlock = {
  block_start_local: string;
  target_kwh: number;
  accumulated_kwh: number;
  percent_of_target: number;
};

export type SseEvent =
  | { type: 'reading'; ts: string }
  | { type: 'block-update'; accumulated_kwh: number; percent_of_target: number }
  | { type: 'alert-80pct'; message: string };
```

---

## 5) Networking Layer

**Base URL:** `const BASE = process.env.NEXT_PUBLIC_BACKEND_URL!`

**Headers (write):**

```ts
const WRITE_HEADERS = {
  'content-type': 'application/json',
  'x-api-key': process.env.NEXT_PUBLIC_BACKEND_TOKEN!,
} as const;

// When deploying without embedding the key, paste an override on /health and the UI will reuse it for write calls.
```

**Calls:**

```ts
// Simulators
GET  `${BASE}/api/v1/simulators`
POST `${BASE}/api/v1/simulators` body: {name, target_kwh, whatsapp_number // integer}

// Ingest
POST `${BASE}/api/v1/readings:ingest` body: IngestRequest

// Read
GET  `${BASE}/api/v1/blocks/latest?simulator_id=${id}`
GET  `${BASE}/api/v1/blocks/history?simulator_id=${id}&limit=10`

// SSE
new EventSource(`${BASE}/api/v1/stream/${id}`)
```

**Retry rules:**

* **GETs:** naive retry 1x on network error.
* **POST /readings:ingest:** backoff 500ms, 1500ms, 3500ms; drop if still failing and show toast.

---

## 6) Charts

* Use **Recharts `LineChart`** for the 60-point cumulative series.
* X labels: 0, 5, 10, …, 30 (minutes).
* Draw a **target line** at `target_kwh`.
* Smooth (monotone) line, no animation jitter when points update.
* On SSE `block-update`, replace the entire data array; do not mutate one by one to avoid visual spikes.

---

## 7) UI Components (suggested)

* `<SimulatorPicker />` — list & create modal.
* `<RunPanel />` — Auto/Manual controls, status, counters.
* `<PowerSlider />` — vertical slider (Manual).
* `<CurrentBlockChart />` — 60 points + target line.
* `<BlockTiles />` — last 10 blocks.
* `<LiveStatusDot />` — green pulsing when SSE connected.

All components should be **controlled** and free of business logic (networking sits in page-level hooks).

---

## 8) Hooks & State

* `useSimulators()` — fetch list and refetch on create.
* `useLatestBlock(simId)` — fetch + SSE subscription; returns `{data, connected}`.
* `useBlockHistory(simId, limit)` — cache by simId.
* `useAutoEmitter(simId, baseKw, volatilityPct)` — start/stop interval.
* `useManualEmitter(simId, getSliderKw)` — start/stop 1s interval.

**Emitter algorithm (auto):**

```ts
const power = baseKw * (1 + (Math.random()*2 - 1) * volatilityPct/100);
const tick: TickIn = { power_kw: Math.max(0, power), sample_seconds: 15, device_ts: new Date().toISOString() };
POST /readings:ingest { simulator_id: simId, mode: 'auto', ticks: [tick] }
```

**Emitter algorithm (manual):**

```ts
const kw = getSliderKw();
const tick: TickIn = { power_kw: kw, sample_seconds: 15, device_ts: new Date().toISOString() };
POST /readings:ingest { simulator_id: simId, mode: 'manual', ticks: [tick] }
```

---

## 9) Error & Edge Handling

* If SSE disconnects, show a small “Reconnecting…” banner; `EventSource` auto-reconnects.
* If ingest fails 3 times consecutively, stop the emitter automatically and show a persistent toast with “Retry” button.
* Validate inputs: `target_kwh >= 0`, `baseKw >= 0`, `0 ≤ volatility ≤ 100`, slider min 0.
* Prevent multiple emitters from running simultaneously (disable Start when running).

---

## 10) Styling & UX Details

* Clean, high-contrast dark-mode friendly (user is in dark mode).
* Primary actions on the right, danger/stop in subtle red.
* Small live indicator (dot) next to “Connected to Backend” (SSE state).
* Use skeletons for initial chart and tiles, then hydrate data.
* Keyboard accessible: space toggles start/stop; slider arrow keys adjust.

---

## 11) File Layout (suggested)

```
/app
  /page.tsx                 # Welcome (list + create)
  /sim/[id]/page.tsx        # Dashboard
  /sim/[id]/run/page.tsx    # Simulator
/components
  SimulatorPicker.tsx
  RunPanel.tsx
  PowerSlider.tsx
  CurrentBlockChart.tsx
  BlockTiles.tsx
  LiveStatusDot.tsx
/lib
  api.ts                    # fetchers for REST
  sse.ts                    # EventSource helpers
  hooks.ts                  # useSimulators, useLatestBlock, useBlockHistory
  emitter.ts                # useAutoEmitter, useManualEmitter
/styles
  globals.css
.env.example
README.md
```

---

## 12) Railway Deployment

**Build:** `npm ci && npm run build`
**Start:** `npm run start` (Next server)
**Env vars:** as in §2 (or paste the API key override via `/health` if Railway injects `secret:` references)
**Health check:** `/` (Welcome page renders)

> We deploy as a Node service (not “Static Sites”) to avoid any SSR/SSE surprises and to keep future flexibility.

---

## 13) Acceptance Criteria (Definition of Done)

* [ ] **Welcome** lists simulators and creates a new one.
* [ ] **Simulator Auto**: emits 1 tick every 15s; stoppable; shows running state.
* [ ] **Simulator Manual**: emits 1 tick/sec with `sample_seconds=15`; stoppable; visible “FAST-FORWARD x15”.
* [ ] **Dashboard**: shows **60-point cumulative** chart for current 30-min window, target line, and updates live via SSE.
* [ ] **History tiles**: last 10 blocks with correct color coding.
* [ ] **Toasts** for 80% alert (SSE `alert-80pct`) and network errors.
* [ ] All network calls use `NEXT_PUBLIC_BACKEND_URL`; write calls pass the API key header via env var or the `/health` override in prototype.
* [ ] Works on Railway with the backend already deployed.

---

## 14) Milestones (tight)

**F0 — Skeleton (½ day)**

* Next app scaffold, Tailwind, basic layout; env wiring.

**F1 — Welcome + Create (½ day)**

* List simulators; modal create; optimistic update.

**F2 — Simulator (1 day)**

* Auto + Manual emitters; UI controls; retries.

**F3 — Dashboard (1 day)**

* Latest block fetch + SSE; 60-point chart; tiles.

**F4 — Polish (≤½ day)**

* Loading states, toasts, keyboard access, README.

---

## 15) Non-Goals Now (for clarity)

* Authentication/authorization beyond simple API key usage.
* Offline buffering of ticks.
* Complex theming; internationalization.
* MQTT publisher (optional future add-on—see below).

---

## 16) Future: Optional MQTT Publisher in Simulator (Design Only)

If we want early parity with production meters:

* Add a toggle “Publish over MQTT” next to Start (Auto/Manual).
* Connect to a broker (public test or your Mosquitto) and publish to topic:
  `simulators/<simulator_id>/reading` with payload equal to backend `TickIn`.
* Keep the REST emitter as the prototype default.
* Backend can later add an MQTT bridge that calls the same ingestion path it already uses.

---

## 17) README Snippets (for Codex to generate)

**.env.example**

```
NEXT_PUBLIC_BACKEND_URL=https://eternalgy-ems-backend.up.railway.app
NEXT_PUBLIC_BACKEND_TOKEN=dev-only-token
NEXT_PUBLIC_TIMEZONE_LABEL=Asia/Kuala_Lumpur
```

**package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p ${PORT:-3000}",
    "lint": "next lint"
  }
}
```

**API helper (pseudo)**

```ts
export async function ingest(req: IngestRequest) {
  const res = await fetch(`${BASE}/api/v1/readings:ingest`, {
    method: 'POST',
    headers: WRITE_HEADERS,
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`ingest failed: ${res.status}`);
  return res.json();
}
```

**SSE helper**

```ts
export function openStream(simId: string, onEvent: (e: SseEvent) => void) {
  const es = new EventSource(`${BASE}/api/v1/stream/${simId}`);
  es.onmessage = (m) => {
    try { onEvent(JSON.parse(m.data)); } catch {}
  };
  es.onerror = () => { /* UI: show reconnecting */ };
  return () => es.close();
}
```

---

### Final Notes to Codex

* Follow the exact endpoint contracts from the **Backend Spec**.
* Treat the backend as the **single source of truth** for windowing and accumulation.
* Keep emitters isolated and cancelable; never run both simultaneously.
* Prefer **SSE** for live updates; avoid WebSockets/polling unless SSE fails.
* Aim for **zero config** Railway deploy with only the three env vars set.

If you’d like, I can generate starter Next.js files and stubbed components exactly per this spec.
