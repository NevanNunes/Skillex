import { useEffect, useRef, useState } from "react";
import { env, useMocks } from "@/lib/env";
import { useAuthStore } from "@/stores/auth";

export type WsStatus = "connecting" | "open" | "closed" | "reconnecting";

export interface ChatWsEvent {
  type: "chat_message" | "typing" | "presence" | "read";
  [k: string]: unknown;
}

interface Options {
  roomId: string | null;
  onEvent: (e: ChatWsEvent) => void;
}

/** Native WebSocket client for Django Channels with exponential backoff reconnect. */
export function useChatWebSocket({ roomId, onEvent }: Options) {
  const [status, setStatus] = useState<WsStatus>("closed");
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const closedManuallyRef = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!roomId) return;
    if (useMocks || !env.wsBaseUrl) {
      setStatus("open"); // simulated open in mock mode
      return;
    }
    closedManuallyRef.current = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const token = useAuthStore.getState().tokens?.access ?? "";
      const url = `${env.wsBaseUrl.replace(/\/$/, "")}/ws/chat/${roomId}/?token=${encodeURIComponent(token)}`;
      setStatus(attemptRef.current === 0 ? "connecting" : "reconnecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("open");
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as ChatWsEvent;
          onEventRef.current(data);
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        setStatus("closed");
        if (closedManuallyRef.current) return;
        const delay = Math.min(15000, 500 * 2 ** attemptRef.current);
        attemptRef.current += 1;
        timeoutId = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      closedManuallyRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
      wsRef.current?.close();
    };
  }, [roomId]);

  const send = (event: ChatWsEvent) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
  };

  return { status, send };
}
