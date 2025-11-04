import { getEffectiveApiKey } from "./api-key";
import { type ApiErrorPayload, type CreateSimulatorInput, type HistoryBlock, type IngestRequest, type LatestBlock, type Simulator, type SimulatorListResponse } from "./types";

// Route all browser requests through a same-origin proxy to avoid CORS.
// The proxy is implemented at /api/bridge/[...path].
// This keeps the frontend free from cross-origin limitations.
export const API_BASE_URL = "/api/bridge";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string) {
  if (!API_BASE_URL) {
    throw new ApiError("Backend base URL is not configured.", 0);
  }
  if (path.startsWith("http")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ApiError(`Invalid JSON response: ${(error as Error).message}`, response.status);
  }
}

async function createApiError(response: Response): Promise<ApiError> {
  let payload: (ApiErrorPayload & { detail?: unknown }) | undefined;
  try {
    payload = await response.clone().json();
  } catch {
    // ignore — fallback to text below
  }

  if (!payload) {
    try {
      const text = await response.text();
      if (text) {
        return new ApiError(text, response.status);
      }
    } catch {
      // ignore
    }
  }

  // Prefer explicit error message/code if provided by backend
  let message = payload?.error?.message ?? payload?.message ?? response.statusText ?? `Request failed with status ${response.status}`;
  let code = payload?.error?.code;
  let details = payload?.error?.details;

  // FastAPI-style validation errors: { detail: [...] }
  // Extract and flatten messages to surface meaningful feedback in the UI.
  if (payload && payload.detail) {
    details = payload.detail;
    try {
      if (Array.isArray(payload.detail)) {
        const msgs = (payload.detail as Array<{ msg?: string; loc?: unknown; detail?: string }>).
          map((d) => d?.msg || d?.detail || "Validation error")
          .filter(Boolean);
        if (msgs.length > 0) {
          message = msgs.join("; ");
        }
      } else if (typeof payload.detail === "string") {
        message = payload.detail;
      }
    } catch {
      // fallback to default message
    }
  }

  return new ApiError(message, response.status, code, details);
}

function shouldRetry(status: number) {
  return RETRYABLE_STATUS.has(status);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RequestOptions = {
  retryDelays?: number[];
};

async function requestJson<T>(path: string, init?: RequestInit, options: RequestOptions = {}): Promise<T> {
  let url = buildUrl(path);
  // On the server (SSR/RSC), Node's fetch requires an absolute URL.
  // Using 'localhost' can resolve to IPv6 ::1 and default to port 80, causing ECONNREFUSED on platforms like Railway
  // where Next.js listens on PORT (e.g., 8080). Prefer SITE_URL if provided, otherwise 127.0.0.1:PORT.
  if (typeof window === 'undefined') {
    const port = process.env.PORT || '3000';
    const origin = process.env.SITE_URL || `http://127.0.0.1:${port}`;
    url = `${origin}${url}`;
  }
  const retryDelays = options.retryDelays ?? [];
  let attempt = 0;

  // Always ensure we use credentialsless fetch
  const mergedHeaders = new Headers(init?.headers);
  mergedHeaders.set("Accept", "application/json");

  const requestInit: RequestInit = {
    ...init,
    headers: mergedHeaders
  };

  while (true) {
    try {
      const response = await fetch(url, requestInit);
      if (!response.ok) {
        const error = await createApiError(response);
        if (shouldRetry(response.status) && attempt < retryDelays.length) {
          await delay(retryDelays[attempt++]);
          continue;
        }
        throw error;
      }
      if (response.status === 204) {
        return undefined as T;
      }
      return await parseJson<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (attempt < retryDelays.length) {
        await delay(retryDelays[attempt++]);
        continue;
      }
      throw error;
    }
  }
}

export function withWriteHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const apiKey = getEffectiveApiKey();
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  } else {
    headers.delete("x-api-key");
  }

  return {
    ...init,
    headers
  };
}

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await requestJson<T>(path, init);
  } catch (error) {
    // retry GET once on network failure (non ApiError)
    if (!(error instanceof ApiError)) {
      return await requestJson<T>(path, init, { retryDelays: [500] });
    }
    throw error;
  }
}

export function simulatorEndpoint(path: string) {
  return buildUrl(path);
}

export async function getSimulators(): Promise<Simulator[]> {
  const payload = await getJson<SimulatorListResponse>("/api/v1/simulators");
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
}

export async function createSimulator(input: CreateSimulatorInput): Promise<Simulator> {
  // Backend expects a flat body (name, target_kwh, whatsapp_number?)
  const response = await requestJson<Simulator | { data: Simulator }>(
    "/api/v1/simulators",
    withWriteHeaders({
      method: "POST",
      body: JSON.stringify(input)
    }),
    { retryDelays: [500, 1500, 3500] }
  );

  if ("data" in response) {
    return response.data;
  }

  return response;
}

export async function updateSimulator(id: string, input: Partial<CreateSimulatorInput>): Promise<Simulator> {
  const response = await requestJson<Simulator | { data: Simulator }>(
    `/api/v1/simulators/${id}`,
    withWriteHeaders({
      method: "PUT",
      body: JSON.stringify(input)
    }),
    { retryDelays: [500, 1500, 3500] }
  );

  if ("data" in response) {
    return response.data;
  }

  return response;
}

export async function deleteSimulator(id: string): Promise<void> {
  console.log("deleteSimulator called with id:", id);
  try {
    await requestJson<void>(
      `/api/v1/simulators/${id}`,
      withWriteHeaders({
        method: "DELETE",
      }),
      { retryDelays: [500, 1500] }
    );
    console.log("deleteSimulator successful for id:", id);
  } catch (error) {
    console.error("deleteSimulator error for id:", id, error);
    throw error;
  }
}

export async function fetchLatestBlock(simulatorId: string): Promise<LatestBlock> {
  return await getJson<LatestBlock>(`/api/v1/blocks/latest?simulator_id=${encodeURIComponent(simulatorId)}`);
}

export async function fetchBlockHistory(simulatorId: string, limit = 10): Promise<HistoryBlock[]> {
  const payload = await getJson<HistoryBlock[] | { data: HistoryBlock[] }>(
    `/api/v1/blocks/history?simulator_id=${encodeURIComponent(simulatorId)}&limit=${limit}`
  );
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
}

export async function ingestReadings(payload: IngestRequest): Promise<void> {
  await requestJson<void>(
    "/api/v1/readings:ingest",
    withWriteHeaders({
      method: "POST",
      body: JSON.stringify(payload)
    }),
    { retryDelays: [500, 1500, 3500] }
  );
}

/**
 * Delete future readings for a simulator.
 * This clears all readings with timestamps in the future relative to current time.
 * Used when starting a new simulation session to avoid showing old fast-forward data.
 */
export async function deleteFutureReadings(simulatorId: string): Promise<void> {
  try {
    // Try DELETE endpoint with simulator_id and current timestamp
    const now = new Date().toISOString();
    await requestJson<void>(
      `/api/v1/readings?simulator_id=${encodeURIComponent(simulatorId)}&before=${encodeURIComponent(now)}`,
      withWriteHeaders({
        method: "DELETE"
      }),
      { retryDelays: [500, 1500] }
    );
  } catch (error) {
    // If DELETE endpoint doesn't exist or fails, try alternative endpoint
    // Some backends might use: DELETE /api/v1/simulators/{id}/readings
    try {
      await requestJson<void>(
        `/api/v1/simulators/${encodeURIComponent(simulatorId)}/readings`,
        withWriteHeaders({
          method: "DELETE"
        }),
        { retryDelays: [500, 1500] }
      );
    } catch (fallbackError) {
      // If both fail, log warning but don't throw - simulator can still start
      console.warn("Failed to delete future readings from backend:", error, fallbackError);
      // Don't throw - allow simulator to start even if cleanup fails
    }
  }
}

/**
 * Get the last reading timestamp for a simulator.
 * Returns the timestamp of the last reading, or null if no readings exist.
 * Always returns the latest reading timestamp regardless of whether it's past or future.
 */
export async function getLastReadingTimestamp(simulatorId: string): Promise<string | null> {
  try {
    // Fetch latest block - if it has data, we can infer the last reading timestamp
    const block = await fetchLatestBlock(simulatorId);
    
    // If block has data points, estimate last reading time from block start + bin duration
    if (block.chart_bins?.points && block.chart_bins.points.length > 0) {
      const blockStart = new Date(block.block_start_local);
      const binSeconds = block.chart_bins.bin_seconds || 30;
      const numPoints = block.chart_bins.points.length;
      // Last reading would be approximately at block start + (numPoints * binSeconds)
      const lastReadingTime = new Date(blockStart.getTime() + numPoints * binSeconds * 1000);
      return lastReadingTime.toISOString();
    }
    
    // If no data, return null (will start from current time)
    return null;
  } catch (error) {
    // If fetch fails, return null (will start from current time)
    console.warn("Failed to fetch last reading timestamp:", error);
    return null;
  }
}

// TNB Bill API functions
const TNB_API_BASE = "https://eternalgy-erp-retry3-production.up.railway.app";

/**
 * Calculate TNB bill breakdown based on monthly bill amount (RM).
 * Finds the closest matching tariff record where bill_total_normal <= amount.
 */
export async function calculateTnbBill(amount: number): Promise<{
  tariff: any;
  inputAmount: number;
  message: string;
}> {
  if (amount <= 0) {
    throw new ApiError("Invalid bill amount provided", 400);
  }

  const url = `${TNB_API_BASE}/api/calculate-bill?amount=${amount}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError("TNB API endpoint not available. The backend may not have implemented this feature yet.", 404);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `Request failed with status ${response.status}`,
        response.status
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch TNB bill data: ${(error as Error).message}`, 500);
  }
}

/**
 * Get sample TNB tariff data (first 10 rows).
 */
export async function getTnbTariffSample(): Promise<{
  data: any[];
  count: number;
}> {
  const url = `${TNB_API_BASE}/api/tnb-tariff`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError("TNB API endpoint not available. The backend may not have implemented this feature yet.", 404);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `Request failed with status ${response.status}`,
        response.status
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch TNB tariff data: ${(error as Error).message}`, 500);
  }
}

/**
 * Mock TNB bill calculation for demo purposes when API is not available.
 * This provides sample data to demonstrate the functionality.
 */
export function calculateTnbBillMock(amount: number): {
  tariff: any;
  inputAmount: number;
  message: string;
} {
  // Sample tariff data for demonstration
  const mockTariffs = [
    { bill_total_normal: 50, usage_kwh: 150, eei: -45, network: 20, capacity: 8.5 },
    { bill_total_normal: 100, usage_kwh: 250, eei: -40, network: 35, capacity: 12.0 },
    { bill_total_normal: 150, usage_kwh: 350, eei: -35, network: 50, capacity: 15.5 },
    { bill_total_normal: 200, usage_kwh: 450, eei: -30, network: 65, capacity: 18.0 },
    { bill_total_normal: 300, usage_kwh: 650, eei: -25, network: 95, capacity: 25.0 },
  ];

  // Find closest match where bill_total_normal <= amount
  let closestTariff = mockTariffs[0];
  for (const tariff of mockTariffs) {
    if (tariff.bill_total_normal <= amount) {
      closestTariff = tariff;
    } else {
      break;
    }
  }

  const message = closestTariff.bill_total_normal <= amount 
    ? "Found closest matching tariff (DEMO DATA)"
    : "Used lowest available tariff - input amount below all records (DEMO DATA)";

  return {
    tariff: {
      id: Math.floor(Math.random() * 1000),
      bubble_id: `demo-${Date.now()}`,
      ...closestTariff,
      created_date: new Date().toISOString(),
    },
    inputAmount: amount,
    message
  };
}