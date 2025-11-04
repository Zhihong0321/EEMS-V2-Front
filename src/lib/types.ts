export type TariffType = "Medium" | "Medium ToU" | "High";

export type Simulator = {
  id: string;
  name: string;
  plant_name: string;
  tariff_type: TariffType;
  target_kwh: number;
  whatsapp_number?: number | null;
  created_at?: string;
  updated_at?: string;
  latest_block?: LatestBlock | null;
};

export type SimulatorListResponse = Simulator[] | { data: Simulator[] };

// Backend expects a flat JSON body for simulator creation.
// Example:
// {
//   "name": "Factory A",
//   "target_kwh": 120,
//   "whatsapp_number": 60123456789
// }
export type CreateSimulatorInput = {
  name: string;
  plant_name: string;
  tariff_type: TariffType;
  target_kwh: number;
  whatsapp_number?: number | null;
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
// WhatsApp Notification System Types

export type NotificationTrigger = {
  id: string;
  simulatorId: string;
  phoneNumber: string;
  thresholdPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NotificationHistory = {
  id: string;
  triggerId: string;
  simulatorId: string;
  phoneNumber: string;
  thresholdPercentage: number;
  actualPercentage: number;
  sentAt: string;
  success: boolean;
  errorMessage?: string;
  notificationType?: 'threshold' | 'startup' | 'shutdown';
};

export type NotificationSettings = {
  cooldownMinutes: number; // Prevent spam notifications
  maxDailyNotifications: number;
  enabledGlobally: boolean;
};

// Validation types
export type PhoneNumberValidation = {
  isValid: boolean;
  error?: string;
  formattedNumber?: string;
};

export type ThresholdValidation = {
  isValid: boolean;
  error?: string;
  normalizedValue?: number;
};

// Error handling types
export enum NotificationError {
  WHATSAPP_API_UNAVAILABLE = 'WHATSAPP_API_UNAVAILABLE',
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_TRIGGER = 'DUPLICATE_TRIGGER',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE'
}

export type NotificationValidationError = {
  type: NotificationError;
  message: string;
  field?: string;
};

// Storage and configuration types
export type NotificationStorageKeys = {
  TRIGGERS: 'notification_triggers';
  HISTORY: 'notification_history';
  SETTINGS: 'notification_settings';
  COOLDOWNS: 'notification_cooldowns';
};

export type CreateNotificationTriggerInput = Omit<NotificationTrigger, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateNotificationTriggerInput = Partial<Omit<NotificationTrigger, 'id' | 'createdAt' | 'updatedAt'>>;

// Maximum Demand Charge Calculation Types
export const TARIFF_RATES: Record<TariffType, number> = {
  "Medium": 89.27,      // RM/kW
  "Medium ToU": 97.06,  // RM/kW  
  "High": 31.21         // RM/kW
};

export type MaximumDemandData = {
  monthlyHighestKw: number;
  tariffRate: number;
  totalDemandCharge: number;
  peakHourBlocks: HistoryBlock[];
};