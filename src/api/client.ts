/**
 * Typed REST client for the EarthLink server API.
 *
 * All methods throw on network/HTTP errors. The caller (stores)
 * is responsible for catching and reporting errors.
 */

// Routes requests through the Tauri (Rust) HTTP stack instead of the webview's
// fetch, so they are not subject to browser CORS enforcement. Allowed hosts are
// scoped in src-tauri/capabilities/default.json.
import { fetch } from "@tauri-apps/plugin-http";

import type {
  AgentAnswer,
  AgentDetail,
  AgentSummary,
  Astronomy,
  AtmosphereData,
  EarthRotation,
  GeophysicsData,
  Location,
  NearbyLocation,
  OrbitalData,
  ServerVersion,
  SolarActivity,
  Weather,
  WindData,
  WorldState,
} from "./types";

export class EarthLinkClient {
  constructor(public baseUrl: string = "http://localhost:8000") {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${path} — ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${path} — ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // --- Version ---

  getVersion(): Promise<ServerVersion> {
    return this.get("/api/version");
  }

  // --- World State ---

  getWorldState(): Promise<WorldState> {
    return this.get("/api/world/state");
  }

  // --- Locations ---

  getLocations(params?: {
    type?: string;
    region?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Location[]> {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.region) qs.set("region", params.region);
    if (params?.search) qs.set("search", params.search);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return this.get(`/api/locations${q ? `?${q}` : ""}`);
  }

  getLocationsGeoJSON(opts?: {
    bbox?: [number, number, number, number]; // [west, south, east, north]
    zoom?: number;
  }): Promise<GeoJSON.FeatureCollection> {
    const qs = new URLSearchParams();
    if (opts?.bbox) qs.set("bbox", opts.bbox.join(","));
    if (opts?.zoom != null) qs.set("zoom", String(opts.zoom));
    const q = qs.toString();
    return this.get(`/api/locations/geojson${q ? `?${q}` : ""}`);
  }

  getLocation(id: number): Promise<Location> {
    return this.get(`/api/locations/${id}`);
  }

  getNearbyLocations(id: number): Promise<NearbyLocation[]> {
    return this.get(`/api/locations/${id}/nearby`);
  }

  // --- Weather ---

  getWeather(locationId: number): Promise<Weather | null> {
    return this.get(`/api/weather/${locationId}`);
  }

  // --- Wind ---

  getWind(locationId: number): Promise<WindData | null> {
    return this.get(`/api/wind/${locationId}`);
  }

  // --- Astronomy ---

  getAstronomy(locationId: number): Promise<Astronomy | null> {
    return this.get(`/api/astronomy/${locationId}`);
  }

  // --- Geophysics ---

  getGeophysics(locationId: number): Promise<GeophysicsData | null> {
    return this.get(`/api/geophysics/${locationId}`);
  }

  // --- Atmosphere ---

  getAtmosphere(locationId: number): Promise<AtmosphereData | null> {
    return this.get(`/api/atmosphere/${locationId}`);
  }

  // --- Orbital ---

  getOrbital(): Promise<OrbitalData> {
    return this.get("/api/orbital");
  }

  getRotation(): Promise<EarthRotation> {
    return this.get("/api/rotation");
  }

  // --- Data Feeds ---

  getSolarActivity(): Promise<SolarActivity | null> {
    return this.get("/api/data-feeds/solar");
  }

  // --- Time ---

  getTime(): Promise<Record<string, unknown>> {
    return this.get("/api/time");
  }

  // --- Agents ---

  getAgents(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<AgentSummary[]> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return this.get(`/api/agents${q ? `?${q}` : ""}`);
  }

  getAgent(id: string): Promise<AgentDetail> {
    return this.get(`/api/agents/${id}`);
  }

  askAgent(id: string, question: string): Promise<AgentAnswer> {
    const q = encodeURIComponent(question);
    return this.get(`/api/agents/${id}/ask?question=${q}`);
  }

  // --- Simulation ---

  controlSimulation(action: "start" | "pause" | "reset"): Promise<{ status: string }> {
    return this.post("/api/simulation/control", { action });
  }

  configureSimulation(config: { tick_interval_seconds?: number }): Promise<unknown> {
    return this.post("/api/simulation/config", config);
  }
}

/** Singleton client instance — base URL can be changed via stores. */
export const client = new EarthLinkClient();
