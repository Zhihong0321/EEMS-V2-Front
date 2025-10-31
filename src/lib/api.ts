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
  if (typeof window === 'undefined') {
    url = `http://localhost${url}`;
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
 * Returns the timestamp of the last reading, or null if no readings exist or if the data is in the future.
 */
export async function getLastReadingTimestamp(simulatorId: string): Promise<string | null> {
  try {
    // Fetch latest block - if it has data, we can infer the last reading timestamp
    const block = await fetchLatestBlock(simulatorId);
    const now = new Date();
    
    // Check if block is in the future - if so, ignore it (old fast-forward data)
    if (block.block_start_local) {
      const blockStart = new Date(block.block_start_local);
      const timeDiff = blockStart.getTime() - now.getTime();
      // If block is more than 30 minutes in the future, it's likely old fast-forward data
      if (timeDiff > 30 * 60 * 1000) {
        return null; // Ignore future blocks
      }
    }
    
    // If block has data points, estimate last reading time from block start + bin duration
    if (block.chart_bins?.points && block.chart_bins.points.length > 0) {
      const blockStart = new Date(block.block_start_local);
      const binSeconds = block.chart_bins.bin_seconds || 30;
      const numPoints = block.chart_bins.points.length;
      // Last reading would be approximately at block start + (numPoints * binSeconds)
      const lastReadingTime = new Date(blockStart.getTime() + numPoints * binSeconds * 1000);
      
      // Only return if the last reading is in the past (not future)
      const readingTimeDiff = now.getTime() - lastReadingTime.getTime();
      if (readingTimeDiff > 0 && readingTimeDiff < 60 * 60 * 1000) {
        // Last reading is in the past and not too old (within last hour)
        return lastReadingTime.toISOString();
      }
    }
    
    // If no data or data is in future, return null (will start from current time)
    return null;
  } catch (error) {
    // If fetch fails, return null (will start from current time)
    console.warn("Failed to fetch last reading timestamp:", error);
    return null;
  }
}