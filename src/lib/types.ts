export type Simulator = {
  id: string;
  name: string;
  target_kwh: number;
  whatsapp_msisdn?: string | null;
  created_at?: string;
  updated_at?: string;
  latest_block?: LatestBlock | null;
};

export type ApiSimulator = Omit<Simulator, "target_kwh"> & { target_kwh: number | string };

export type SimulatorListResponse = ApiSimulator[] | { data: ApiSimulator[] };

export type CreateSimulatorInput = {
  name: string;
  target_kwh: number;
  whatsapp_msisdn?: string | null;
};

export type CreateSimulatorPayload = {
  name: string;
  target_kwh: string;
  whatsapp_msisdn?: string | null;
};

export type TickIn = {
  power_kw: number;
  sample_seconds: number;
  device_ts: string;
};

export type IngestRequest = {
  simulator_id: string;
  mode?: "auto" | "manual";
  ticks: TickIn[];
};

export type LatestBlock = {
  simulator_id: string;
  block_start_local: string;
  block_start_utc: string;
  block_end_utc: string;
  target_kwh: number;
  accumulated_kwh: number;
  percent_of_target: number;
  alerted_80pct: boolean;
  chart_bins: {
    bin_seconds: number;
    points: number[];
  };
};

export type HistoryBlock = {
  block_start_local: string;
  target_kwh: number;
  accumulated_kwh: number;
  percent_of_target: number;
};

export type SseEvent =
  | { type: "reading"; ts: string }
  | {
      type: "block-update";
      accumulated_kwh: number;
      percent_of_target: number;
      block_start_local?: string;
      chart_bins?: { bin_seconds: number; points: number[] };
    }
  | { type: "alert-80pct"; message: string }
  | { type: "ping" };

export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
};
