"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ingestReadings } from "./api";
import type { TickIn } from "./types";
import { useToast } from "@/components/ui/toast-provider";

const AUTO_INTERVAL_MS = 1_000;
const MANUAL_INTERVAL_MS = 1_000;
const AUTO_SAMPLE_SECONDS = 30;
const MANUAL_SAMPLE_SECONDS = 30;
const MAX_FAILURES = 3;

export type EmitterState = {
  isRunning: boolean;
  sentCount: number;
  lastSentAt?: string;
};

type UseEmitterOptions = {
  simulatorId: string | null;
  intervalMs: number;
  mode: "auto" | "manual";
  getTick: () => TickIn;
};

function useEmitter({ simulatorId, intervalMs, mode, getTick }: UseEmitterOptions) {
  const { push } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<string | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const failureRef = useRef(0);
  const startRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const sendTick = useCallback(async () => {
    if (!simulatorId) {
      return;
    }

    const tick = getTick();

    try {
      await ingestReadings({ simulator_id: simulatorId, mode, ticks: [tick] });
      failureRef.current = 0;
      setSentCount((prev) => prev + 1);
      setLastSentAt(new Date().toISOString());
    } catch (error) {
      failureRef.current += 1;
      const message = error instanceof Error ? error.message : "Failed to deliver reading";
      if (failureRef.current === 1) {
        push({
          title: "Reading delivery failed",
          description: message,
          variant: "error"
        });
      }
      if (failureRef.current >= MAX_FAILURES) {
        stop();
        push({
          title: "Emitter paused",
          description: `Stopped ${mode} emitter after repeated failures.`,
          variant: "error",
          action: {
            label: "Retry now",
            onClick: () => startRef.current()
          }
        });
      }
    }
  }, [getTick, mode, push, simulatorId, stop]);

  const start = useCallback(() => {
    if (!simulatorId) {
      push({
        title: "No simulator selected",
        description: "Create or pick a simulator before sending readings.",
        variant: "error"
      });
      return;
    }

    if (timerRef.current) {
      return;
    }

    failureRef.current = 0;
    setIsRunning(true);
    void sendTick();
    timerRef.current = setInterval(() => {
      void sendTick();
    }, intervalMs);
  }, [intervalMs, push, sendTick, simulatorId]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isRunning,
    sentCount,
    lastSentAt,
    start,
    stop
  };
}

export function useAutoEmitter(simulatorId: string | null, baseKw: number, volatilityPct: number) {
  const getTick = useCallback((): TickIn => {
    const volatilityFactor = Math.max(0, Math.min(volatilityPct, 100)) / 100;
    const randomDelta = (Math.random() * 2 - 1) * volatilityFactor;
    const powerKw = Math.max(0, baseKw * (1 + randomDelta));
    return {
      power_kw: Number(powerKw.toFixed(3)),
      sample_seconds: AUTO_SAMPLE_SECONDS,
      device_ts: new Date().toISOString()
    };
  }, [baseKw, volatilityPct]);

  return useEmitter({ simulatorId, intervalMs: AUTO_INTERVAL_MS, mode: "auto", getTick });
}

export function useManualEmitter(simulatorId: string | null, getPowerKw: () => number) {
  const getTick = useCallback((): TickIn => {
    const powerKw = Math.max(0, getPowerKw());
    return {
      power_kw: Number(powerKw.toFixed(3)),
      sample_seconds: MANUAL_SAMPLE_SECONDS,
      device_ts: new Date().toISOString()
    };
  }, [getPowerKw]);

  return useEmitter({ simulatorId, intervalMs: MANUAL_INTERVAL_MS, mode: "manual", getTick });
}
