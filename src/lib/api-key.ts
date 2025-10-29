const STORAGE_KEY = "eems.apiKeyOverride";

const ENV_KEY_CANDIDATES = [
  { name: "NEXT_PUBLIC_BACKEND_TOKEN", value: process.env.NEXT_PUBLIC_BACKEND_TOKEN },
  { name: "NEXT_PUBLIC_BACKEND_WRITE_TOKEN", value: process.env.NEXT_PUBLIC_BACKEND_WRITE_TOKEN },
  { name: "NEXT_PUBLIC_BACKEND_KEY", value: process.env.NEXT_PUBLIC_BACKEND_KEY },
  { name: "NEXT_PUBLIC_BACKEND_API_KEY", value: process.env.NEXT_PUBLIC_BACKEND_API_KEY }
] as const;

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

function resolveEnvApiKey(): { name: string; value: string } | null {
  for (const candidate of ENV_KEY_CANDIDATES) {
    if (candidate.value) {
      return { name: candidate.name, value: candidate.value };
    }
  }
  return null;
}

export function getEnvApiKey(): string {
  return resolveEnvApiKey()?.value ?? "";
}

export function getEnvApiKeyName(): string | null {
  return resolveEnvApiKey()?.name ?? null;
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
