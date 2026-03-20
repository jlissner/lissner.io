import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/api/client";
import type { ActivitySnapshot } from "./activity-types";

const ActivityContext = createContext<ActivitySnapshot | null>(null);

function parseActivityMessage(raw: string): ActivitySnapshot | null {
  try {
    const msg = JSON.parse(raw) as {
      type?: string;
      v?: number;
      payload?: ActivitySnapshot;
    };
    if (msg.type === "activity" && msg.payload?.v === 1) {
      return msg.payload;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Loads initial snapshot via GET /api/activity, then keeps a WebSocket to `/ws/activity`.
 * Reconnects on close/error with backoff, refetches when the tab becomes visible, and
 * periodically GETs /api/activity only when the WebSocket is not connected (safety net).
 */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);

  useEffect(() => {
    const cancelled = { value: false };
    const wsRef = { current: null as WebSocket | null };
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let backoffMs = 1500;

    const fetchSnapshot = async (): Promise<void> => {
      try {
        const res = await apiFetch("activity", {
          // Avoid stale cached GET overwriting live WebSocket updates after refresh.
          cache: "no-store",
        });
        if (res.ok && !cancelled.value) {
          const data = (await res.json()) as ActivitySnapshot;
          if (data?.v === 1) {
            setSnapshot(data);
          }
        }
      } catch {
        /* ignore */
      }
    };

    const clearReconnect = () => {
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const scheduleReconnect = () => {
      clearReconnect();
      if (cancelled.value) return;
      reconnectTimer = setTimeout(() => {
        backoffMs = Math.min(backoffMs * 2, 30_000);
        connect();
      }, backoffMs);
    };

    const connect = () => {
      if (cancelled.value) return;
      clearReconnect();

      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${proto}//${window.location.host}/ws/activity`;
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        backoffMs = 1500;
        void fetchSnapshot();
      };

      socket.onmessage = (ev) => {
        const next = parseActivityMessage(ev.data as string);
        if (next) setSnapshot(next);
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          /* ignore */
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        if (!cancelled.value) {
          scheduleReconnect();
        }
      };
    };

    void fetchSnapshot();
    connect();

    // When the WebSocket is down, poll HTTP so we still get updates. Do NOT poll while
    // WS is open: a cached GET could return a stale snapshot and overwrite fresher WS
    // payloads (especially noticeable after a full page refresh during indexing).
    const fallbackTimer = setInterval(() => {
      if (cancelled.value) return;
      const ws = wsRef.current;
      const wsOk = ws !== null && ws.readyState === WebSocket.OPEN;
      if (!wsOk) {
        void fetchSnapshot();
      }
    }, 2500);

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || cancelled.value) return;
      void fetchSnapshot();
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        backoffMs = 1500;
        connect();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled.value = true;
      clearReconnect();
      if (fallbackTimer !== undefined) {
        clearInterval(fallbackTimer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, []);

  return <ActivityContext.Provider value={snapshot}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivitySnapshot | null {
  return useContext(ActivityContext);
}
