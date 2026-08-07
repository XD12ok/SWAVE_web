"use client";

import { useEffect, useRef, useState } from "react";

export interface RealtimeEvent {
  channel: string;
  payload: Record<string, unknown> | null;
}

interface UseRealtimeOptions {
  intervalMs?: number;
  onEvent?: (event: RealtimeEvent) => void;
  onPoll?: () => void;
}

export function useRealtime(
  channels: string[],
  options?: UseRealtimeOptions,
) {
  const { intervalMs = 10000, onEvent, onPoll } = options ?? {};

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  const [connected, setConnected] = useState(false);

  const channelsKey = channels.join(",");

  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (typeof window !== "undefined" && "EventSource" in window) {
      const url = `/api/events?channels=${encodeURIComponent(channelsKey)}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => setConnected(true);
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed?.type === "connected") return;
          onEventRef.current?.(parsed as RealtimeEvent);
        } catch {
          // ignore malformed frames
        }
      };
      eventSource.onerror = () => setConnected(false);
    } else {
      setConnected(false);
    }

    const pollTimer = setInterval(() => {
      onPollRef.current?.();
    }, intervalMs);

    return () => {
      eventSource?.close();
      clearInterval(pollTimer);
    };
  }, [channelsKey, intervalMs]);

  return { connected };
}
