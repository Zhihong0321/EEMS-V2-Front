"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ingestReadings } from "./api";
import type { TickIn } from "./types";
import { useToast } from "@/components/ui/toast-provider";

const AUTO_INTERVAL_MS = 1_000;
const MANUAL_INTERVAL_MS = 1_000;
const AUTO_SAMPLE_SECONDS = 30;
const MANUAL_SAMPLE_SECONDS = 30;
const FAST_FORWARD_MULTIPLIER = 30; // 30x speed: 1 real second = 30 simulated seconds
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
  fastForwardEnabled?: boolean;
  onTickSent?: (tick: TickIn) => void;
};

function useEmitter({ simulatorId, intervalMs, mode, getTick, fastForwardEnabled = false, onTickSent }: UseEmitterOptions) {
  const { push } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<string | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const failureRef = useRef(0);
  const startRef = useRef<() => void>(() => {});
  // Track the last simulated timestamp for fast-forward mode
  const lastSimulatedTsRef = useRef<Date | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    lastSimulatedTsRef.current = null;
  }, []);

  const sendTick = useCallback(async () => {
    if (!simulatorId) {
      return;
    }

    // Get the base tick
    let tick = getTick();

    // Apply fast-forward timestamp if enabled
    if (fastForwardEnabled) {
      const now = new Date();
      
      // Initialize or advance simulated timestamp
      if (!lastSimulatedTsRef.current) {
        // Start from current real-world time (not midnight) so readings appear immediately
        // This ensures the chart shows the current block based on the reading timestamps
        lastSimulatedTsRef.current = new Date(now);
      } else {
        // Advance by FAST_FORWARD_MULTIPLIER seconds per real second
        // Since we're sending every intervalMs, advance by that much simulated time
        const simulatedSeconds = (intervalMs / 1000) * FAST_FORWARD_MULTIPLIER;
        lastSimulatedTsRef.current = new Date(lastSimulatedTsRef.current.getTime() + simulatedSeconds * 1000);
      }
      
      // Use the simulated timestamp
      tick = {
        ...tick,
        device_ts: lastSimulatedTsRef.current.toISOString()
      };
    }

    try {
      await ingestReadings({ simulator_id: simulatorId, mode, ticks: [tick] });
      failureRef.current = 0;
      setSentCount((prev) => prev + 1);
      setLastSentAt(tick.device_ts);
      
      // Notify parent component about the tick sent
      onTickSent?.(tick);

      // Store the sent tick in localStorage for raw chart data
      const storageKey = `recent_ticks_${simulatorId}`;
      const existingTicks = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingTicks.push({ ts: Date.now(), ...tick });
      // Keep only last 180 ticks (for 30-min block at 10s intervals, but generous)
      if (existingTicks.length > 180) {
        existingTicks.shift();
      }
      localStorage.setItem(storageKey, JSON.stringify(existingTicks));

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
  }, [fastForwardEnabled, getTick, intervalMs, mode, onTickSent, push, simulatorId, stop]);

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

export function useAutoEmitter(
  simulatorId: string | null,
  baseKw: number,
  volatilityPct: number,
  fastForwardEnabled = false,
  onTickSent?: (tick: TickIn) => void
) {
  const getTick = useCallback((): TickIn => {
    const volatilityFactor = Math.max(0, Math.min(volatilityPct, 100)) / 100;
    const randomDelta = (Math.random() * 2 - 1) * volatilityFactor;
    const powerKw = Math.max(0, baseKw * (1 + randomDelta));
    return {
      power_kw: Number(powerKw.toFixed(3)),
      sample_seconds: AUTO_SAMPLE_SECONDS,
      device_ts: new Date().toISOString() // Will be overridden in emitter if fast-forward enabled
    };
  }, [baseKw, volatilityPct]);

  return useEmitter({
    simulatorId,
    intervalMs: AUTO_INTERVAL_MS,
    mode: "auto",
    getTick,
    fastForwardEnabled,
    onTickSent
  });
}

export function useManualEmitter(
  simulatorId: string | null,
  getPowerKw: () => number,
  fastForwardEnabled = false,
  onTickSent?: (tick: TickIn) => void
) {
  const getTick = useCallback((): TickIn => {
    const powerKw = Math.max(0, getPowerKw());
    return {
      power_kw: Number(powerKw.toFixed(3)),
      sample_seconds: MANUAL_SAMPLE_SECONDS,
      device_ts: new Date().toISOString() // Will be overridden in emitter if fast-forward enabled
    };
  }, [getPowerKw]);

  return useEmitter({
    simulatorId,
    intervalMs: MANUAL_INTERVAL_MS,
    mode: "manual",
    getTick,
    fastForwardEnabled,
    onTickSent
  });
}
