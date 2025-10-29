"use client";

import { useEffect, useMemo, useState } from "react";
import HealthCheckCard from "./health-check-card";
import ResultLog, { type LogEntry } from "./result-log";
import type { Status } from "./status-badge";
import {
  fetchBackendHealth,
  testSimulatorHandshake,
  testSimulatorRead
} from "@/lib/health-checks";
import {
  clearApiKeyOverride,
  getApiKeyOverride,
  getEffectiveApiKey,
  getEnvApiKey,
  getEnvApiKeyName,
  hasEnvApiKey,
  isOverridePersisted,
  setApiKeyOverride
} from "@/lib/api-key";

type CheckKey = "backend" | "handshake" | "simulatorRead";

type CheckState = {
  status: Status;
  duration?: number;
  message?: string;
};

const initialState: Record<CheckKey, CheckState> = {
  backend: { status: "idle" },
  handshake: { status: "idle" },
  simulatorRead: { status: "idle" }
};

export default function HealthCheckConsole() {
  const [state, setState] = useState(initialState);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const baseUrl = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL ?? "", []);
  const hasBaseUrl = baseUrl.length > 0;
  const envApiKey = useMemo(() => getEnvApiKey(), []);
  const envApiKeyPresent = hasEnvApiKey();
  const envApiKeyName = useMemo(() => getEnvApiKeyName(), []);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [persistOverride, setPersistOverride] = useState(false);
  const [usingOverride, setUsingOverride] = useState(false);
  const [effectiveApiKey, setEffectiveApiKey] = useState("");

  useEffect(() => {
    const override = getApiKeyOverride();
    if (override) {
      setApiKeyInput(override);
      setUsingOverride(true);
      setPersistOverride(isOverridePersisted());
    } else {
      setApiKeyInput(envApiKey);
      setUsingOverride(false);
      setPersistOverride(false);
    }
    setEffectiveApiKey(getEffectiveApiKey());
  }, [envApiKey]);

  const handleApplyApiKey = () => {
    setApiKeyOverride(apiKeyInput, { persist: persistOverride });
    const appliedOverride = apiKeyInput.trim().length > 0;
    setUsingOverride(appliedOverride);
    setPersistOverride(appliedOverride ? isOverridePersisted() : false);
    setEffectiveApiKey(getEffectiveApiKey());
  };

  const handleClearApiKey = () => {
    clearApiKeyOverride();
    setUsingOverride(false);
    setPersistOverride(false);
    setApiKeyInput(envApiKey);
    setEffectiveApiKey(getEffectiveApiKey());
  };

  const apiKeySourceLabel = usingOverride
    ? persistOverride
      ? "Using manual override (saved locally)"
      : "Using manual override"
    : envApiKeyPresent
    ? `Using ${envApiKeyName ?? "environment API key"}`
    : "API key not configured";

  const runCheck = async (key: CheckKey) => {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], status: "running", message: undefined } }));

    try {
      const result =
        key === "backend"
          ? await fetchBackendHealth()
          : key === "handshake"
          ? await testSimulatorHandshake()
          : await testSimulatorRead();

      setState((prev) => ({
        ...prev,
        [key]: {
          status: result.ok ? "success" : "error",
          duration: result.durationMs,
          message: result.message
        }
      }));

      setLogs((prev) => [
        {
          id: `${key}-${Date.now()}`,
          title: `${key} check`,
          status: result.ok ? "success" : "error",
          detail: result.raw ?? result.message,
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown failure";
      setState((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          message
        }
      }));
      setLogs((prev) => [
        {
          id: `${key}-${Date.now()}`,
          title: `${key} check`,
          status: "error",
          detail: message,
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-white">Communication Health Checks</h1>
          <p className="text-sm text-slate-400">
            Run quick diagnostics to verify if the frontend can reach the backend services. These checks will automatically
            attach prototype headers and surface full responses for debugging.
          </p>
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-400">
            <div>
              <p>
                <span className="font-semibold text-slate-200">Backend base URL:</span> {hasBaseUrl ? baseUrl : "Not configured"}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-200">API key:</span> {effectiveApiKey ? "Configured" : "Missing"}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">{apiKeySourceLabel}</p>
            </div>

            <div className="space-y-2 text-slate-300">
              <label className="block text-xs font-semibold text-slate-200" htmlFor="health-api-key">
                Manual API key override
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="health-api-key"
                  type="password"
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                  placeholder="Paste prototype API key"
                />
                <button
                  type="button"
                  onClick={handleApplyApiKey}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-cyan-600"
                >
                  Apply key
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary"
                    checked={persistOverride}
                    onChange={(event) => setPersistOverride(event.target.checked)}
                  />
                  Remember on this device
                </label>
                {usingOverride && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="text-slate-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    Clear override
                  </button>
                )}
                <span className="text-slate-500">
                  Useful when Railway rewrites environment variables with "API" into secret references.
                </span>
              </div>
            </div>
          </div>
        </header>

        <HealthCheckCard
          title="API availability"
          description="Calls the health endpoint to ensure the backend server is reachable and responding."
          status={state.backend.status}
          meta={
            state.backend.duration && (
              <span>
                Latest response time: <strong>{state.backend.duration.toFixed(0)}ms</strong>
              </span>
            )
          }
          body={
            <p className="text-sm text-slate-300">
              {state.backend.message ?? "No response logged yet."}
            </p>
          }
          onRun={() => runCheck("backend")}
          disabled={!hasBaseUrl || state.backend.status === "running"}
        />

        <HealthCheckCard
          title="Simulator handshake"
          description="Sends a prototype handshake payload to validate the simulator ingestion endpoint and API key authentication."
          status={state.handshake.status}
          meta={
            state.handshake.duration && (
              <span>
                Latest response time: <strong>{state.handshake.duration.toFixed(0)}ms</strong>
              </span>
            )
          }
          body={
            <p className="text-sm text-slate-300">
              {state.handshake.message ?? "No response logged yet."}
            </p>
          }
          onRun={() => runCheck("handshake")}
          disabled={!hasBaseUrl || state.handshake.status === "running"}
          actionLabel="Send handshake"
        />

        <HealthCheckCard
          title="Read API sample"
          description="Fetches a small simulator list to confirm read endpoints return data correctly."
          status={state.simulatorRead.status}
          meta={
            state.simulatorRead.duration && (
              <span>
                Latest response time: <strong>{state.simulatorRead.duration.toFixed(0)}ms</strong>
              </span>
            )
          }
          body={
            <p className="text-sm text-slate-300">
              {state.simulatorRead.message ?? "No response logged yet."}
            </p>
          }
          onRun={() => runCheck("simulatorRead")}
          disabled={!hasBaseUrl || state.simulatorRead.status === "running"}
          actionLabel="Fetch simulators"
        />
      </div>

      <aside className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Response log</h2>
        <ResultLog entries={logs} />
      </aside>
    </div>
  );
}
