"use client";

import { useMemo, useState } from "react";
import HealthCheckCard from "./health-check-card";
import ResultLog, { type LogEntry } from "./result-log";
import type { Status } from "./status-badge";
import {
  fetchBackendHealth,
  testSimulatorHandshake,
  testSimulatorRead
} from "@/lib/health-checks";

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
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-200">Backend base URL:</span> {hasBaseUrl ? baseUrl : "Not configured"}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-slate-200">API key present:</span> {process.env.NEXT_PUBLIC_BACKEND_API_KEY ? "Yes" : "No"}
            </p>
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
