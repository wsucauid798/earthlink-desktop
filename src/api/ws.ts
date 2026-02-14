/**
 * WebSocket manager for streaming tick events from the EarthLink server.
 *
 * Features:
 * - Auto-reconnect with exponential backoff (1s → 2s → 4s → … → 30s)
 * - Typed tick event parsing
 * - Callbacks for open/close/error/message
 * - Clean disconnect on demand
 */

import type { TickEvent } from "./types";

export type WsStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface WsCallbacks {
  onTick?: (event: TickEvent) => void;
  onStatusChange?: (status: WsStatus) => void;
  onError?: (error: string) => void;
  onRawMessage?: (data: string) => void;
}

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

export class WorldWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = MIN_RECONNECT_MS;
  private intentionalClose = false;
  private _status: WsStatus = "disconnected";
  private callbacks: WsCallbacks = {};

  get status(): WsStatus {
    return this._status;
  }

  /** Register event callbacks. */
  on(callbacks: WsCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /** Connect to the server WebSocket endpoint. */
  connect(serverUrl: string): void {
    this.intentionalClose = false;
    this.clearReconnectTimer();

    // Derive WS URL from HTTP URL
    const wsUrl = serverUrl
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:")
      .replace(/\/$/, "");

    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(`${wsUrl}/ws/world`);
    } catch {
      this.setStatus("disconnected");
      this.callbacks.onError?.("Failed to create WebSocket");
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = MIN_RECONNECT_MS;
      this.setStatus("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        this.callbacks.onRawMessage?.(event.data);
        const data = JSON.parse(event.data) as TickEvent;
        this.callbacks.onTick?.(data);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onError?.("WebSocket error");
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.intentionalClose) {
        this.setStatus("reconnecting");
        this.scheduleReconnect(serverUrl);
      } else {
        this.setStatus("disconnected");
      }
    };
  }

  /** Gracefully disconnect. */
  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  private setStatus(status: WsStatus): void {
    this._status = status;
    this.callbacks.onStatusChange?.(status);
  }

  private scheduleReconnect(serverUrl: string): void {
    this.reconnectTimer = setTimeout(() => {
      this.connect(serverUrl);
    }, this.reconnectDelay);
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_MS);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/** Singleton WebSocket instance. */
export const worldWs = new WorldWebSocket();
