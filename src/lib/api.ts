import { getEffectiveApiKey } from "./api-key";
import { type ApiErrorPayload, type CreateSimulatorInput, type HistoryBlock, type IngestRequest, type LatestBlock, type Simulator, type SimulatorListResponse } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

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
  let payload: ApiErrorPayload | undefined;
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

  const message =
    payload?.error?.message ??
    payload?.message ??
    response.statusText ??
    `Request failed with status ${response.status}`;
  return new ApiError(message, response.status, payload?.error?.code, payload?.error?.details);
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
  const url = buildUrl(path);
  const retryDelays = options.retryDelays ?? [];
  let attempt = 0;

  // Always ensure we use credentialsless fetch
  const requestInit: RequestInit = {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {})
    }
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
