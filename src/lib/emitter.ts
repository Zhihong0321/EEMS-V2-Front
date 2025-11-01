"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ingestReadings, deleteFutureReadings, getLastReadingTimestamp } from "./api";
import type { TickIn } from "./types";
import { useToast } from "@/components/ui/toast-provider";

const AUTO_INTERVAL_MS = 2_000; // 2 seconds per signal (was 1 second)
const MANUAL_INTERVAL_MS = 2_000; // 2 seconds per signal (was 1 second)
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
  // Store the latest getTick function in a ref so the interval always uses the latest version
  const getTickRef = useRef(getTick);
  
  // Update the ref whenever getTick changes
  useEffect(() => {
    getTickRef.current = getTick;
  }, [getTick]);

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

    // Get the base tick using the ref to ensure we always use the latest getTick function
    let tick = getTickRef.current();

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
  }, [fastForwardEnabled, intervalMs, mode, onTickSent, push, simulatorId, stop]);

  const start = useCallback(async () => {
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

    // Delete future readings from backend when simulator starts
    // This ensures clean start without old fast-forward data interfering
    void deleteFutureReadings(simulatorId).catch((error) => {
      // Log but don't block simulator start if cleanup fails
      console.warn("Failed to delete future readings:", error);
    });

    // Get last reading timestamp and continue from there
    // This creates continuous simulated data and prevents chart gaps
    // ALWAYS continue from latest reading timestamp (even if it's in the future)
    try {
      const lastReadingTs = await getLastReadingTimestamp(simulatorId);
      if (lastReadingTs && fastForwardEnabled) {
        // Continue simulation from last reading timestamp (no matter if past or future)
        lastSimulatedTsRef.current = new Date(lastReadingTs);
      } else if (fastForwardEnabled) {
        // No last reading found, start from current time
        lastSimulatedTsRef.current = new Date();
      }
      // If fast-forward disabled, lastSimulatedTsRef stays null (will use current time in sendTick)
    } catch (error) {
      // If fetch fails, start from current time (default behavior)
      console.warn("Failed to get last reading timestamp, starting from current time:", error);
      if (fastForwardEnabled) {
        lastSimulatedTsRef.current = new Date();
      }
    }

    failureRef.current = 0;
    setIsRunning(true);
    void sendTick();
    timerRef.current = setInterval(() => {
      void sendTick();
    }, intervalMs);
  }, [fastForwardEnabled, intervalMs, push, sendTick, simulatorId]);

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
