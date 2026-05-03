/**
 * Stream transport manager for world tick events.
 *
 * Starts the QUIC/WebTransport migration while preserving compatibility:
 * - Preferred transport can be set via localStorage/env
 * - Automatic fallback to WebSocket when WT is unavailable
 * - Existing callback/status contract preserved for store compatibility
 */

import type { TickEvent } from "./types";

export type WsStatus = "disconnected" | "connecting" | "connected" | "reconnecting";
export type StreamTransportKind = "websocket" | "webtransport";

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

function deriveWsBase(serverUrl: string): string {
  return serverUrl
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:")
    .replace(/\/$/, "");
}

function deriveWtBase(serverUrl: string): string {
  return serverUrl
    .replace(/^http:/, "https:")
    .replace(/\/$/, "");
}

function preferredTransport(): StreamTransportKind {
  const fromStorage = typeof localStorage !== "undefined"
    ? localStorage.getItem("earthlink_stream_transport")
    : null;
  const fromEnv = (import.meta.env.VITE_STREAM_TRANSPORT as string | undefined)?.toLowerCase();
  const raw = (fromStorage ?? fromEnv ?? "webtransport").toLowerCase();
  return raw === "websocket" ? "websocket" : "webtransport";
}

class WorldWebSocket implements WorldStreamClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = MIN_RECONNECT_MS;
  private intentionalClose = false;
  private _status: WsStatus = "disconnected";
  private callbacks: WsCallbacks = {};

  get status(): WsStatus {
    return this._status;
  }

  on(callbacks: WsCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  connect(serverUrl: string): void {
    this.intentionalClose = false;
    this.clearReconnectTimer();

    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(`${deriveWsBase(serverUrl)}/ws/world`);
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
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_MS);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
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
      this.callbacks.onError?.("WebTransport not supported by this runtime");
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

class WorldStreamManager implements WorldStreamClient {
  private callbacks: WsCallbacks = {};
  private current: WorldStreamClient | null = null;
  private _status: WsStatus = "disconnected";

  get status(): WsStatus {
    return this._status;
  }

  on(callbacks: WsCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    if (this.current) this.current.on(this.callbacks);
  }

  connect(serverUrl: string): void {
    const preferred = preferredTransport();
    this.disconnect();

    if (preferred === "webtransport") {
      if (WorldWebTransport.supported()) {
        this.callbacks.onError?.("Using WebTransport (QUIC) for world stream");
        this.current = this.createClient("webtransport");
        this.current.connect(serverUrl);
        return;
      }
      this.callbacks.onError?.("WebTransport unavailable; falling back to WebSocket");
    }

    this.current = this.createClient("websocket");
    this.current.connect(serverUrl);
  }

  disconnect(): void {
    this.current?.disconnect();
    this.current = null;
    this.setStatus("disconnected");
  }

  private createClient(kind: StreamTransportKind): WorldStreamClient {
    const client = kind === "webtransport"
      ? new WorldWebTransport()
      : new WorldWebSocket();
    client.on({
      ...this.callbacks,
      onStatusChange: (status) => {
        this.setStatus(status);
        this.callbacks.onStatusChange?.(status);
      },
      onError: (err) => this.callbacks.onError?.(err),
      onRawMessage: (raw) => this.callbacks.onRawMessage?.(raw),
      onTick: (tick) => this.callbacks.onTick?.(tick),
    });
    return client;
  }

  private setStatus(status: WsStatus): void {
    this._status = status;
  }
}

/** Singleton stream manager (WT preferred, WS fallback). */
export const worldWs = new WorldStreamManager();
