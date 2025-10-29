const STORAGE_KEY = "eems.apiKeyOverride";

let overrideValue: string | null = null;
let hasLoadedPersisted = false;
let isPersisted = false;

function loadPersistedOverride() {
  if (hasLoadedPersisted) {
    return;
  }
  hasLoadedPersisted = true;
  if (typeof window === "undefined") {
    return;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      overrideValue = stored;
      isPersisted = true;
    }
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

export function getEnvApiKey(): string {
  return process.env.NEXT_PUBLIC_BACKEND_KEY ?? process.env.NEXT_PUBLIC_BACKEND_API_KEY ?? "";
}

export function getEnvApiKeyName(): string | null {
  if (process.env.NEXT_PUBLIC_BACKEND_KEY) {
    return "NEXT_PUBLIC_BACKEND_KEY";
  }
  if (process.env.NEXT_PUBLIC_BACKEND_API_KEY) {
    return "NEXT_PUBLIC_BACKEND_API_KEY";
  }
  return null;
}

export function getApiKeyOverride(): string | null {
  if (typeof window !== "undefined") {
    loadPersistedOverride();
  }
  return overrideValue;
}

export function isOverridePersisted(): boolean {
  if (typeof window !== "undefined") {
    loadPersistedOverride();
  }
  return isPersisted && !!overrideValue;
}

export function setApiKeyOverride(value: string, options?: { persist?: boolean }) {
  const trimmed = value.trim();
  overrideValue = trimmed ? trimmed : null;
  isPersisted = Boolean(options?.persist && overrideValue);

  if (typeof window === "undefined") {
    return;
  }

  try {
    if (isPersisted && overrideValue) {
      window.localStorage.setItem(STORAGE_KEY, overrideValue);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

export function clearApiKeyOverride() {
  overrideValue = null;
  isPersisted = false;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getEffectiveApiKey(): string {
  const override = getApiKeyOverride();
  if (override) {
    return override;
  }
  return getEnvApiKey();
}

export function hasEffectiveApiKey(): boolean {
  return getEffectiveApiKey().length > 0;
}

export function hasEnvApiKey(): boolean {
  return getEnvApiKey().length > 0;
}
