/**
 * Selection store — tracks what entity is currently selected.
 *
 * The Explorer, Map, and Inspector all share this state.
 * When a selection changes, the Inspector fetches detail.
 */

import { create } from "zustand";
import { client } from "../api/client";
import type { AgentDetail, Astronomy, AtmosphereData, GeophysicsData, Location, NearbyLocation, Weather, WindData, AgentAnswer, TickEvent } from "../api/types";

/* ---------- History helpers ---------- */

const MAX_HISTORY = 120;

function pushHist(arr: number[], val: number | null | undefined): number[] {
  if (val == null) return arr;
  const next = [...arr, val];
  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
}

const emptyHistory = () => ({
  weatherTemp: [] as number[],
  weatherHumidity: [] as number[],
  weatherCloud: [] as number[],
  weatherPressure: [] as number[],
  windSpeed: [] as number[],
  windGust: [] as number[],
  geoGravity: [] as number[],
  geoTidal: [] as number[],
  geoMagField: [] as number[],
  atmPM25: [] as number[],
  atmPM10: [] as number[],
  atmUV: [] as number[],
});

export type DataHistory = ReturnType<typeof emptyHistory>;

/* ---------- Store ---------- */

export type SelectionKind = "location" | "agent" | null;

export interface SelectionState {
  kind: SelectionKind;
  id: string | number | null;

  // Fetched detail (populated after selection)
  locationDetail: Location | null;
  locationWeather: Weather | null;
  locationWind: WindData | null;
  locationNearby: NearbyLocation[];
  locationAstronomy: Astronomy | null;
  locationGeophysics: GeophysicsData | null;
  locationAtmosphere: AtmosphereData | null;
  agentDetail: AgentDetail | null;

  // History ring buffers for real-time charts
  history: DataHistory;

  // Ask agent
  askLoading: boolean;
  lastAnswer: AgentAnswer | null;

  // Actions
  selectLocation: (id: number) => void;
  selectAgent: (id: string) => void;
  clearSelection: () => void;
  askAgent: (question: string) => Promise<void>;
  /** Re-fetch stale domains for the selected location based on tick refresh flags. */
  handleTick: (event: TickEvent) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  kind: null,
  id: null,
  locationDetail: null,
  locationWeather: null,
  locationWind: null,
  locationNearby: [],
  locationAstronomy: null,
  locationGeophysics: null,
  locationAtmosphere: null,
  agentDetail: null,
  history: emptyHistory(),
  askLoading: false,
  lastAnswer: null,

  selectLocation: async (id) => {
    set({
      kind: "location",
      id,
      locationDetail: null,
      locationWeather: null,
      locationWind: null,
      locationNearby: [],
      locationAstronomy: null,
      locationGeophysics: null,
      locationAtmosphere: null,
      agentDetail: null,
      lastAnswer: null,
      history: emptyHistory(),
    });
    try {
      const [loc, weather, wind, nearby, astronomy, geophysics, atmosphere] = await Promise.all([
        client.getLocation(id),
        client.getWeather(id).catch(() => null),
        client.getWind(id).catch(() => null),
        client.getNearbyLocations(id).catch(() => []),
        client.getAstronomy(id).catch(() => null),
        client.getGeophysics(id).catch(() => null),
        client.getAtmosphere(id).catch(() => null),
      ]);
      // Only update if still selected
      if (get().kind === "location" && get().id === id) {
        // Seed chart history with initial data point
        const h = emptyHistory();
        if (weather?.temperature_c != null) h.weatherTemp.push(weather.temperature_c);
        if (weather?.humidity_pct != null) h.weatherHumidity.push(weather.humidity_pct);
        if (weather?.cloud_cover_pct != null) h.weatherCloud.push(weather.cloud_cover_pct);
        if (weather?.pressure_hpa != null) h.weatherPressure.push(weather.pressure_hpa);
        if (wind?.speed_kmh != null) h.windSpeed.push(wind.speed_kmh);
        if (wind?.gust_kmh != null) h.windGust.push(wind.gust_kmh);
        if (geophysics) {
          h.geoGravity.push(geophysics.gravity_ms2);
          h.geoTidal.push(geophysics.tidal_variation_ms2);
          h.geoMagField.push(geophysics.magnetic_field_ut);
        }
        if (atmosphere?.pm2_5 != null) h.atmPM25.push(atmosphere.pm2_5);
        if (atmosphere?.pm10 != null) h.atmPM10.push(atmosphere.pm10);
        if (atmosphere?.uv_index != null) h.atmUV.push(atmosphere.uv_index);
        set({
          locationDetail: loc,
          locationWeather: weather,
          locationWind: wind,
          locationNearby: nearby,
          locationAstronomy: astronomy,
          locationGeophysics: geophysics,
          locationAtmosphere: atmosphere,
          history: h,
        });
      }
    } catch {
      // Selection may have changed
    }
  },

  selectAgent: async (id) => {
    set({
      kind: "agent",
      id,
      locationDetail: null,
      locationWeather: null,
      locationWind: null,
      locationNearby: [],
      locationAstronomy: null,
      locationGeophysics: null,
      locationAtmosphere: null,
      agentDetail: null,
      lastAnswer: null,
      history: emptyHistory(),
    });
    try {
      const detail = await client.getAgent(id);
      if (get().kind === "agent" && get().id === id) {
        set({ agentDetail: detail });
      }
    } catch {
      // Selection may have changed
    }
  },

  clearSelection: () =>
    set({
      kind: null,
      id: null,
      locationDetail: null,
      locationWeather: null,
      locationWind: null,
      locationNearby: [],
      locationAstronomy: null,
      locationGeophysics: null,
      locationAtmosphere: null,
      agentDetail: null,
      lastAnswer: null,
      history: emptyHistory(),
    }),

  askAgent: async (question) => {
    const { kind, id } = get();
    if (kind !== "agent" || !id) return;
    set({ askLoading: true, lastAnswer: null });
    try {
      const answer = await client.askAgent(String(id), question);
      set({ lastAnswer: answer, askLoading: false });
    } catch {
      set({ askLoading: false });
    }
  },

  handleTick: async (event) => {
    const { kind, id } = get();
    if (kind !== "location" || id == null) return;
    const locId = id as number;

    // --- Push current values to history on EVERY tick (1 Hz real-time) ---
    const s = get();
    const h = { ...s.history };
    const w = s.locationWeather;
    const wi = s.locationWind;
    const g = s.locationGeophysics;
    const a = s.locationAtmosphere;
    if (w) {
      h.weatherTemp = pushHist(h.weatherTemp, w.temperature_c);
      h.weatherHumidity = pushHist(h.weatherHumidity, w.humidity_pct);
      h.weatherCloud = pushHist(h.weatherCloud, w.cloud_cover_pct);
      h.weatherPressure = pushHist(h.weatherPressure, w.pressure_hpa);
    }
    if (wi) {
      h.windSpeed = pushHist(h.windSpeed, wi.speed_kmh);
      h.windGust = pushHist(h.windGust, wi.gust_kmh);
    }
    if (g) {
      h.geoGravity = pushHist(h.geoGravity, g.gravity_ms2);
      h.geoTidal = pushHist(h.geoTidal, g.tidal_variation_ms2);
      h.geoMagField = pushHist(h.geoMagField, g.magnetic_field_ut);
    }
    if (a) {
      h.atmPM25 = pushHist(h.atmPM25, a.pm2_5);
      h.atmPM10 = pushHist(h.atmPM10, a.pm10);
      h.atmUV = pushHist(h.atmUV, a.uv_index);
    }
    set({ history: h });

    // --- Re-fetch domains that the server actually refreshed ---
    const fetches: Promise<void>[] = [];

    if (event.weather_updated) {
      fetches.push(
        client.getWeather(locId).catch(() => null).then((w) => {
          if (get().kind === "location" && get().id === locId) {
            set({ locationWeather: w });
          }
        }),
      );
    }
    if (event.wind_updated) {
      fetches.push(
        client.getWind(locId).catch(() => null).then((w) => {
          if (get().kind === "location" && get().id === locId) {
            set({ locationWind: w });
          }
        }),
      );
    }
    // Atmosphere mixes fetched AQ with weather/astronomy-derived values,
    // so refresh whenever any of those upstream domains change.
    if (event.atmosphere_updated || event.weather_updated || event.astronomy_updated) {
      fetches.push(
        client.getAtmosphere(locId).catch(() => null).then((a) => {
          if (get().kind === "location" && get().id === locId) {
            set({ locationAtmosphere: a });
          }
        }),
      );
    }
    if (event.astronomy_updated) {
      fetches.push(
        client.getAstronomy(locId).catch(() => null).then((a) => {
          if (get().kind === "location" && get().id === locId) set({ locationAstronomy: a });
        }),
      );
    }

    // Geophysics: tidal gravity varies with lunar position — refresh every 60 ticks (~1 min)
    if (event.tick % 60 === 0) {
      fetches.push(
        client.getGeophysics(locId).catch(() => null).then((g) => {
          if (get().kind === "location" && get().id === locId) {
            set({ locationGeophysics: g });
          }
        }),
      );
    }

    if (fetches.length > 0) {
      await Promise.all(fetches);
    }
  },
}));
