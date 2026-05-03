/**
 * WebTransport (QUIC) manager for world tick events.
 *
 * This client is intentionally WT-only:
 * - No WebSocket fallback path
 * - Explicit failure if WebTransport is unavailable
 */

import type { TickEvent } from "./types";

export type WsStatus = "disconnected" | "connecting" | "connected" | "reconnecting";
export interface WsCallbacks {
  onTick?: (event: TickEvent) => void;
  onStatusChange?: (status: WsStatus) => void;
  onError?: (error: string) => void;
  onRawMessage?: (data: string) => void;
}

interface WorldStreamClient {
  readonly status: WsStatus;
  on(callbacks: WsCallbacks): void;
  connect(serverUrl: string): void;
  disconnect(): void;
}

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

function deriveWtBase(serverUrl: string): string {
  return serverUrl
    .replace(/^http:/, "https:")
    .replace(/\/$/, "");
}

class WorldWebTransport implements WorldStreamClient {
  private transport: any = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private _status: WsStatus = "disconnected";
  private callbacks: WsCallbacks = {};
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = MIN_RECONNECT_MS;

  get status(): WsStatus {
    return this._status;
  }

  static supported(): boolean {
    return typeof (globalThis as any).WebTransport === "function";
  }

  on(callbacks: WsCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  connect(serverUrl: string): void {
    this.intentionalClose = false;
    this.clearReconnectTimer();
    this.setStatus("connecting");
    void this.connectAsync(serverUrl);
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    void this.disconnectAsync();
    this.setStatus("disconnected");
  }

  private async connectAsync(serverUrl: string): Promise<void> {
    const WT = (globalThis as any).WebTransport;
    if (typeof WT !== "function") {
      this.callbacks.onError?.("WebTransport is required but unavailable in this runtime");
      this.setStatus("disconnected");
      return;
    }

    try {
      this.transport = new WT(`${deriveWtBase(serverUrl)}/wt/world`);
      await this.transport.ready;
      this.reconnectDelay = MIN_RECONNECT_MS;
      this.setStatus("connected");
      void this.readDatagramsLoop();
      await this.transport.closed;
    } catch {
      this.callbacks.onError?.("WebTransport connection failed");
    } finally {
      const shouldRetry = !this.intentionalClose;
      await this.disconnectAsync();
      if (shouldRetry) {
        this.setStatus("reconnecting");
        this.scheduleReconnect(serverUrl);
      } else {
        this.setStatus("disconnected");
      }
    }
  }

  private async readDatagramsLoop(): Promise<void> {
    if (!this.transport?.datagrams?.readable) return;
    const reader = this.transport.datagrams.readable.getReader();
    this.reader = reader;
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      try {
        const raw = decoder.decode(value);
        this.callbacks.onRawMessage?.(raw);
        this.callbacks.onTick?.(JSON.parse(raw) as TickEvent);
      } catch {
        // Ignore malformed messages
      }
    }
  }

  private async disconnectAsync(): Promise<void> {
    try {
      await this.reader?.cancel();
    } catch { /* ignore */ }
    this.reader = null;
    try {
      await this.transport?.close?.();
    } catch { /* ignore */ }
    this.transport = null;
  }

  private setStatus(status: WsStatus): void {
    this._status = status;
    this.callbacks.onStatusChange?.(status);
  }

  private scheduleReconnect(serverUrl: string): void {
    this.reconnectTimer = setTimeout(() => {
      this.connect(serverUrl);
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_MS);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/** Singleton stream transport (WT-only). */
export const worldWs = new WorldWebTransport();
