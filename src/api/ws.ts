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
  connect(serverUrl: string, opts?: { wtUrl?: string | null; wtPath?: string | null }): void;
  disconnect(): void;
}

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

function deriveWtUrl(
  serverUrl: string,
  wtUrl?: string | null,
  wtPath?: string | null,
): string {
  if (wtUrl && wtUrl.trim().length > 0) {
    return wtUrl.trim();
  }

  const base = serverUrl.replace(/^http:/, "https:").replace(/\/$/, "");
  const path = (wtPath && wtPath.trim().length > 0 ? wtPath : "/wt/world").trim();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

class WorldWebTransport implements WorldStreamClient {
  private transport: any = null;
  private datagramReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private incomingStreamReader: ReadableStreamDefaultReader<ReadableStream<Uint8Array>> | null = null;
  private activeStreamReaders = new Set<ReadableStreamDefaultReader<Uint8Array>>();
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

  connect(serverUrl: string, opts?: { wtUrl?: string | null; wtPath?: string | null }): void {
    this.intentionalClose = false;
    this.clearReconnectTimer();
    this.setStatus("connecting");
    void this.connectAsync(serverUrl, opts);
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    void this.disconnectAsync();
    this.setStatus("disconnected");
  }

  private async connectAsync(
    serverUrl: string,
    opts?: { wtUrl?: string | null; wtPath?: string | null },
  ): Promise<void> {
    const WT = (globalThis as any).WebTransport;
    if (typeof WT !== "function") {
      this.callbacks.onError?.("WebTransport is required but unavailable in this runtime");
      this.setStatus("disconnected");
      return;
    }

    try {
      const target = deriveWtUrl(serverUrl, opts?.wtUrl, opts?.wtPath);
      this.transport = new WT(target);
      await this.transport.ready;
      this.reconnectDelay = MIN_RECONNECT_MS;
      this.setStatus("connected");
      void this.readDatagramsLoop();
      void this.readIncomingStreamsLoop();
      await this.transport.closed;
    } catch {
      this.callbacks.onError?.("WebTransport connection failed");
    } finally {
      const shouldRetry = !this.intentionalClose;
      await this.disconnectAsync();
      if (shouldRetry) {
        this.setStatus("reconnecting");
        this.scheduleReconnect(serverUrl, opts);
      } else {
        this.setStatus("disconnected");
      }
    }
  }

  private async readDatagramsLoop(): Promise<void> {
    if (!this.transport?.datagrams?.readable) return;
    const reader = this.transport.datagrams.readable.getReader();
    this.datagramReader = reader;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        try {
          this.dispatchRawTick(decoder.decode(value));
        } catch {
          // Ignore malformed messages
        }
      }
    } catch {
      // Ignore transport read errors during reconnect/close
    }
  }

  private async readIncomingStreamsLoop(): Promise<void> {
    if (!this.transport?.incomingUnidirectionalStreams) return;

    const reader = this.transport.incomingUnidirectionalStreams.getReader();
    this.incomingStreamReader = reader;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        void this.readSingleIncomingStream(value);
      }
    } catch {
      // Ignore transport read errors during reconnect/close
    }
  }

  private async readSingleIncomingStream(stream: ReadableStream<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    this.activeStreamReaders.add(reader);
    let raw = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
      if (raw.length > 0) {
        this.dispatchRawTick(raw);
      }
    } catch {
      // Ignore malformed/aborted stream frames
    } finally {
      this.activeStreamReaders.delete(reader);
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors on closed streams
      }
    }
  }

  private dispatchRawTick(raw: string): void {
    this.callbacks.onRawMessage?.(raw);
    this.callbacks.onTick?.(JSON.parse(raw) as TickEvent);
  }

  private async disconnectAsync(): Promise<void> {
    try {
      await this.datagramReader?.cancel();
    } catch { /* ignore */ }
    this.datagramReader = null;
    try {
      await this.incomingStreamReader?.cancel();
    } catch { /* ignore */ }
    this.incomingStreamReader = null;
    for (const reader of this.activeStreamReaders) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors on closing transport
      }
    }
    this.activeStreamReaders.clear();
    try {
      await this.transport?.close?.();
    } catch { /* ignore */ }
    this.transport = null;
  }

  private setStatus(status: WsStatus): void {
    this._status = status;
    this.callbacks.onStatusChange?.(status);
  }

  private scheduleReconnect(
    serverUrl: string,
    opts?: { wtUrl?: string | null; wtPath?: string | null },
  ): void {
    this.reconnectTimer = setTimeout(() => {
      this.connect(serverUrl, opts);
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
