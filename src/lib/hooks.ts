"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSimulator, updateSimulator, deleteSimulator, fetchBlockHistory, fetchLatestBlock, getSimulators, simulatorEndpoint } from "./api";
import type { CreateSimulatorInput, HistoryBlock, LatestBlock, Simulator, SseEvent } from "./types";
import { useToast } from "@/components/ui/toast-provider";
import { notificationManager } from "./notification-manager";
import { debug } from "./debug";

export function useSimulators(initialSimulators: Simulator[] = []) {
  const { push } = useToast();
  const [simulators, setSimulators] = useState<Simulator[]>(initialSimulators);
  const [loading, setLoading] = useState(initialSimulators.length === 0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSimulators();
      setSimulators(data);
      setError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load simulators";
      setError(message);
      push({
        title: "Unable to load simulators",
        description: message,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    if (initialSimulators.length === 0) {
      void refresh();
    }
  }, [initialSimulators.length, refresh]);

  // Auto-refresh on window focus to prevent stale data
  useEffect(() => {
    const handleFocus = () => {
      void refresh();
    };
    
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const create = useCallback(
    async (input: CreateSimulatorInput) => {
      try {
        const simulator = await createSimulator(input);
        
        // Send startup notification and log to history
        try {
          debug.log('[STARTUP] Sending startup notification...');
          
          const phoneNumber = '60123456789'; // Replace with your number
          const message = `🚀 Simulator Started!\n\nName: ${simulator.name}\nTarget: ${simulator.target_kwh} kWh\nTime: ${new Date().toLocaleString()}\n\nYour energy simulator is now running!`;
          
          // Send via WhatsApp API
          const { sendWhatsAppMessage } = await import('./whatsapp-api');
          const result = await sendWhatsAppMessage({
            to: phoneNumber,
            message: message
          });
          
          // Create fake trigger for history logging
          const startupTrigger = {
            id: `startup-${Date.now()}`,
            simulatorId: simulator.id,
            phoneNumber: phoneNumber,
            thresholdPercentage: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Log to notification history
          const { createNotificationHistory } = await import('./notification-storage');
          const historyEntry = createNotificationHistory(
            startupTrigger,
            0, // percentage
            result.success,
            result.success ? undefined : (result.error || 'Failed to send startup notification')
          );
          
          const storage = new (await import('./notification-storage')).LocalStorageNotificationStorage();
          await storage.saveNotificationHistory(historyEntry);
          
          debug.log(`[STARTUP] Startup notification ${result.success ? 'sent' : 'failed'} and logged to history`);
        } catch (error) {
          debug.error('[STARTUP] Error sending startup notification:', error);
        }
        
        // After a successful create, refresh from the server to ensure we show
        // the persisted record and any server-side defaults/derived fields.
        await refresh();
        push({
          title: "Simulator created",
          description: `${simulator.name} is ready to run.`,
          variant: "success"
        });
        return simulator;
      } catch (error) {
        // Surface backend validation messages (e.g., 422) clearly in the UI and console.
        const message = error instanceof Error ? error.message : "Failed to create simulator";
        // Log full error object for precise debugging (payload may contain field-level details)
        // without disrupting the user experience.
        // eslint-disable-next-line no-console
        console.error("Create simulator failed", error);
        push({
          title: "Create simulator failed",
          description: message,
          variant: "error"
        });
        throw error;
      }
    },
    [push, refresh]
  );

  const update = useCallback(
    async (id: string, input: Partial<CreateSimulatorInput>) => {
      try {
        const updatedSimulator = await updateSimulator(id, input);
        // Update the local state immediately
        setSimulators((prev) => prev.map((sim) => sim.id === id ? updatedSimulator : sim));
        void refresh(); // Also refresh from server
        push({
          title: "Simulator updated",
          description: `${updatedSimulator.name} has been updated successfully.`,
          variant: "success"
        });
        return updatedSimulator;
      } catch (error) {
        console.error("Update simulator failed", error);
        push({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Failed to update simulator",
          variant: "error"
        });
        throw error;
      }
    },
    [push, refresh]
  );

  const del = useCallback(
    async (id: string) => {
      try {
        await deleteSimulator(id);
        // After a successful delete, filter the item out of the local state
        // for an immediate UI update, then trigger a full refresh from the
        // server to ensure consistency.
        setSimulators((prev) => prev.filter((sim) => sim.id !== id));
        void refresh();
        push({
          title: "Simulator deleted",
          variant: "success"
        });
      } catch (error) {
        // Provide user-friendly messages based on error type
        let title = "Delete failed";
        let description = "Failed to delete simulator";
        
        if (error instanceof Error) {
          // Check if it's an API error with status code
          const apiError = error as any;
          if (apiError.status === 404) {
            title = "Delete not supported";
            description = "Backend DELETE endpoint not implemented. Contact backend team to add DELETE /api/v1/simulators/{id}";
          } else if (apiError.status === 500 || apiError.status === 502 || apiError.status === 503) {
            title = "Server error";
            description = "The backend server encountered an error. Please try again.";
          } else if (apiError.status === 401 || apiError.status === 403) {
            title = "Permission denied";
            description = "You don't have permission to delete this simulator";
          } else if (!apiError.status) {
            // Network error
            title = "Connection failed";
            description = "Could not connect to the server. Check your internet connection.";
          } else {
            description = error.message;
          }
        }
        
        console.error("Delete simulator failed", error);
        push({
          title,
          description,
          variant: "error"
        });
        throw error;
      }
    },
    [push, refresh]
  );

  return useMemo(
    () => ({ simulators, loading, error, refresh, create, update, delete: del }),
    [simulators, loading, error, refresh, create, update, del]
  );
}

type LatestBlockOptions = {
  onAlert80pct?: (message: string) => void;
  onWindowChange?: (blockStartLocal?: string) => void;
};

type LatestBlockState = {
  block: LatestBlock | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  reconnecting: boolean;
  lastReadingTs?: string;
};

export function useLatestBlock(
  simulatorId: string | null,
  options: LatestBlockOptions = {},
  initialBlock: LatestBlock | null = null
) {
  const { push, dismiss } = useToast();
  const { onAlert80pct, onWindowChange } = options;
  const [state, setState] = useState<LatestBlockState>({
    block: initialBlock,
    loading: !initialBlock && !!simulatorId,
    error: null,
    connected: false,
    reconnecting: false,
    lastReadingTs: undefined
  });
  const alertRef = useRef(false);
  const reconnectToastId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!simulatorId) return;
    // Only show loading if we don't have block data yet (initial load)
    // Don't show loading during refreshes to avoid flickering
    setState((prev) => ({ ...prev, loading: prev.block == null }));
    try {
      const block = await fetchLatestBlock(simulatorId);
      setState((prev) => ({ ...prev, block, loading: false, error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load latest block";
      setState((prev) => ({ ...prev, loading: false, error: message }));
      push({
        title: "Unable to load latest block",
        description: message,
        variant: "error"
      });
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [simulatorId, push]);

  useEffect(() => {
    if (!simulatorId) {
      setState((prev) => ({ ...prev, block: null, loading: false, error: null, connected: false, reconnecting: false }));
      return;
    }

    if (initialBlock) {
      setState((prev) => ({ ...prev, block: initialBlock, loading: false }));
    }

    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: prev.block == null }));
      try {
        const block = await fetchLatestBlock(simulatorId);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            block,
            loading: false,
            error: null
          }));
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load latest block";
          setState((prev) => ({ ...prev, loading: false, error: message }));
          push({
            title: "Unable to load latest block",
            description: message,
            variant: "error"
          });
        }
      }
    };

    void load();

    let source: EventSource | null = null;
    let disposed = false;
    let refreshDebounceTimer: NodeJS.Timeout | null = null;

    let sseUrl: string;
    try {
      sseUrl = simulatorEndpoint(`/api/v1/stream/${simulatorId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backend URL is not configured.";
      setState((prev) => ({ ...prev, error: message, reconnecting: false, connected: false }));
      push({
        title: "SSE connection failed",
        description: message,
        variant: "error"
      });
      return () => undefined;
    }

    const openStream = () => {
      if (disposed) return;
      source = new EventSource(sseUrl);
      source.addEventListener("open", () => {
        if (reconnectToastId.current) {
          dismiss(reconnectToastId.current);
          reconnectToastId.current = null;
        }
        setState((prev) => ({ ...prev, connected: true, reconnecting: false }));
      });
      source.addEventListener("error", () => {
        setState((prev) => ({ ...prev, connected: false, reconnecting: true }));
        if (!reconnectToastId.current) {
          reconnectToastId.current = push({
            title: "Reconnecting to live stream",
            description: "Attempting to re-establish SSE connection…",
            variant: "warning",
            dismissible: false
          });
        }
      });

      const handleEvent = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as SseEvent;
          processEvent(data);
        } catch (error) {
          debug.warn("Failed to parse SSE event", error);
        }
      };

      const processEvent = (event: SseEvent) => {
        if (event.type === "reading") {
          // Update lastReadingTs from SSE event
          setState((prev) => ({ ...prev, lastReadingTs: event.ts }));
          // Auto-refresh block data when reading is received (for prototype - ensures chart updates)
          // Use debouncing to batch rapid readings
          if (!cancelled && !disposed) {
            if (refreshDebounceTimer) {
              clearTimeout(refreshDebounceTimer);
            }
            refreshDebounceTimer = setTimeout(() => {
              if (!disposed && !cancelled) {
                void refresh();
              }
            }, 500); // 500ms debounce for rapid readings
          }
          return;
        }

        setState((prev) => {
          if (event.type === "alert-80pct") {
            if (!alertRef.current) {
              alertRef.current = true;
            }
            onAlert80pct?.(event.message);
            push({
              title: "Block alert",
              description: event.message || "Reached 80% of target for this block.",
              variant: "warning"
            });
            return prev;
          }
          if (event.type === "block-update") {
            debug.log('[SSE] Block-update event received:', event);
            const previousBlock = prev.block;
            const nextBlock: LatestBlock | null = previousBlock
              ? {
                  ...previousBlock,
                  accumulated_kwh: event.accumulated_kwh,
                  percent_of_target: event.percent_of_target,
                  chart_bins: event.chart_bins ?? previousBlock.chart_bins,
                  block_start_local: event.block_start_local ?? previousBlock.block_start_local
                }
              : previousBlock;

            if (previousBlock && event.block_start_local && event.block_start_local !== previousBlock.block_start_local) {
              alertRef.current = false;
              onWindowChange?.(event.block_start_local);
            }

            // Check notification thresholds when percentage updates
            if (event.percent_of_target !== undefined && simulatorId) {
              try {
                notificationManager.checkThresholds(simulatorId, event.percent_of_target)
                  .catch(error => {
                    debug.error('[SSE] Error checking notification thresholds:', error);
                  });
              } catch (syncError) {
                debug.error('[SSE] Synchronous error calling checkThresholds:', syncError);
              }
            }

            return {
              ...prev,
              block: nextBlock,
              error: null
            };
          }
          return prev;
        });
      };

      source.addEventListener("message", handleEvent);
      source.addEventListener("reading", handleEvent as EventListener);
      source.addEventListener("block-update", handleEvent as EventListener);
      source.addEventListener("alert-80pct", handleEvent as EventListener);
      source.addEventListener("ping", () => {
        setState((prev) => ({ ...prev, connected: true, reconnecting: false }));
      });
    };

    openStream();

    return () => {
      cancelled = true;
      disposed = true;
      if (source) {
        source.close();
      }
      if (refreshDebounceTimer) {
        clearTimeout(refreshDebounceTimer);
        refreshDebounceTimer = null;
      }
      if (reconnectToastId.current) {
        dismiss(reconnectToastId.current);
        reconnectToastId.current = null;
      }
    };
  }, [dismiss, initialBlock, onAlert80pct, onWindowChange, push, refresh, simulatorId]);



  return {
    block: state.block,
    loading: state.loading,
    error: state.error,
    connected: state.connected,
    reconnecting: state.reconnecting,
    lastReadingTs: state.lastReadingTs,
    refresh: refresh
  };
}

export function useBlockHistory(simulatorId: string | null, limit = 10, initialHistory: HistoryBlock[] = []) {
  const { push } = useToast();
  const [history, setHistory] = useState<HistoryBlock[]>(initialHistory);
  const [loading, setLoading] = useState(Boolean(simulatorId) && initialHistory.length === 0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!simulatorId) return;
    setLoading(true);
    try {
      const blocks = await fetchBlockHistory(simulatorId, limit);
      setHistory(blocks);
      setError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load block history";
      setError(message);
      push({
        title: "Unable to load block history",
        description: message,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [limit, push, simulatorId]);

  useEffect(() => {
    if (simulatorId) {
      if (initialHistory.length > 0) {
        setHistory(initialHistory);
        setLoading(false);
      } else {
        void refresh();
      }
    } else {
      setHistory([]);
      setLoading(false);
    }
  }, [initialHistory, refresh, simulatorId]);

  return { history, loading, error, refresh };
}
