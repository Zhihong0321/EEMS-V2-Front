import { API_BASE_URL, getJson, simulatorEndpoint, withWriteHeaders } from "./api";
import { hasEffectiveApiKey } from "./api-key";
import type { SimulatorListResponse } from "./types";

type FetchResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  message: string;
  raw?: string;
};

const HEALTH_PATHS = ["/healthz", "/api/v1/health", "/"];

async function performRequest(path: string, init?: RequestInit): Promise<FetchResult> {
  if (!API_BASE_URL) {
    return {
      ok: false,
      status: 0,
      durationMs: 0,
      message: "Backend base URL is not configured."
    };
  }

  const url = simulatorEndpoint(path);
  const started = Date.now();
  try {
    const response = await fetch(url, init);
    const durationMs = Date.now() - started;
    let message = `${response.status} ${response.statusText}`;
    let raw: string | undefined;

    try {
      const text = await response.text();
      raw = text;
      if (text) {
        message = `${message}\n${text}`;
      }
    } catch {
      // ignore body parsing errors
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      message,
      raw
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : "Request failed";
    return {
      ok: false,
      status: 0,
      durationMs,
      message
    };
  }
}

export async function fetchBackendHealth(): Promise<FetchResult> {
  for (const path of HEALTH_PATHS) {
    const result = await performRequest(path);
    if (result.ok) {
      return {
        ...result,
        message: `Health endpoint responded at ${path}.\n${result.message}`
      };
    }
    if (result.status !== 404 && result.status !== 405) {
      return {
        ...result,
        message: `Health check failed at ${path}.\n${result.message}`
      };
    }
  }
  return {
    ok: false,
    status: 404,
    durationMs: 0,
    message: "No health endpoints responded (tried /healthz, /api/v1/health, /)."
  };
}

export async function testSimulatorHandshake(): Promise<FetchResult> {
  if (!hasEffectiveApiKey()) {
    return {
      ok: false,
      status: 0,
      durationMs: 0,
      message:
        "API key is not configured. Provide one above or set NEXT_PUBLIC_BACKEND_KEY to run the handshake check."
    };
  }

  const payload = {
    simulator_id: "health-check",
    mode: "auto",
    ticks: [
      {
        power_kw: 1,
        sample_seconds: 15,
        device_ts: new Date().toISOString()
      }
    ]
  };

  const result = await performRequest(
    "/api/v1/readings:ingest",
    withWriteHeaders({
      method: "POST",
      body: JSON.stringify(payload)
    })
  );

  if (!result.ok && result.status === 401) {
    return {
      ...result,
      message:
        "Handshake request failed: backend rejected the API key. Double-check the value provided above or the NEXT_PUBLIC_BACKEND_KEY environment variable."
    };
  }

  return {
    ...result,
    message: result.ok
      ? "Ingestion endpoint accepted the payload. Review acknowledgement below."
      : `Handshake request failed.\n${result.message}`
  };
}

export async function testSimulatorRead(): Promise<FetchResult> {
  const started = Date.now();
  try {
    const payload = await getJson<SimulatorListResponse>("/api/v1/simulators");
    const durationMs = Date.now() - started;
    const data = Array.isArray(payload) ? payload : payload.data ?? [];
    return {
      ok: true,
      status: 200,
      durationMs,
      message: data.length
        ? `Fetched ${data.length} simulator(s).`
        : "Simulator list responded successfully but returned no items.",
      raw: JSON.stringify(data, null, 2)
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    return {
      ok: false,
      status: error instanceof Error && "status" in error ? Number((error as { status: number }).status) : 0,
      durationMs,
      message: error instanceof Error ? error.message : "Simulator read failed"
    };
  }
}
