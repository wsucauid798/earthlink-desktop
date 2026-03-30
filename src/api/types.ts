/**
 * TypeScript interfaces matching the EarthLink server Pydantic schemas.
 * Keep in sync with earthlink-server/src/api/schemas.py.
 */

// --- Location ---

export interface Location {
  id: number;
  name: string;
  type: string; // "capital" | "city" | "town" | "village" | "hamlet"
  lat: number;
  lng: number;
  elevation: number | null;
  terrain: string | null;
  admin_level_1: string | null;
  admin_level_2: string | null;
  admin_level_3: string | null;
  admin_level_4: string | null;
  population: number | null;
}

export interface Connection {
  from_id: number;
  to_id: number;
  distance_km: number;
  connection_type: string;
  route_name: string | null;
  direction: string | null;
}

export interface NearbyLocation {
  location: Location;
  connection: Connection;
}

// --- Weather ---

export interface Weather {
  location_id: number;
  temperature_c: number | null;
  precipitation_mm: number | null;
  humidity_pct: number | null;
  wind_speed_kmh: number | null;
  wind_direction_deg: number | null;
  cloud_cover_pct: number | null;
  visibility_km: number | null;
  pressure_hpa: number | null;
  conditions: string | null;
}

// --- Wind ---

export interface WindData {
  location_id: number;
  speed_kmh: number | null;
  direction_deg: number | null;
  gust_kmh: number | null;
  speed_upper_kmh: number | null;
  direction_upper_deg: number | null;
  upper_height_m: number | null;
  pressure_hpa: number | null;
  beaufort: number;
  beaufort_description: string;
  terrain_modifier: string | null;
  is_interpolated: boolean;
  interpolation_distance_km: number | null;
}

// --- Time ---

export interface WorldTime {
  current_time: string;
  local_time: string | null;
  tick_count: number;
  date: string;
  hour: number;
  minute: number;
  season: string;
  timezone: string;
  timezone_abbr: string;
  utc_offset: string;
}

// --- Astronomy ---

export interface Astronomy {
  // Sun
  sunrise: string | null;
  sunset: string | null;
  solar_noon: string | null;
  day_length_hours: number | null;
  is_daylight: boolean;
  solar_elevation_deg: number | null;
  solar_azimuth_deg: number | null;

  // Twilight
  civil_dawn: string | null;
  civil_dusk: string | null;
  nautical_dawn: string | null;
  nautical_dusk: string | null;

  // Moon
  moon_phase: number | null;
  moon_phase_name: string | null;
  moon_phase_emoji: string | null;
  moon_illumination_pct: number | null;
  moon_age_days: number | null;
  moonrise: string | null;
  moonset: string | null;
}

// --- Geophysics ---

export interface GeophysicsData {
  gravity_ms2: number;
  gravity_base_ms2: number;
  tidal_variation_ms2: number;
  magnetic_field_ut: number;
  magnetic_declination_deg: number;
  magnetic_inclination_deg: number;
  rotation_speed_kmh: number;
}

// --- Atmosphere ---

export interface AtmosphereData {
  // Air quality (fetched)
  european_aqi: number | null;
  european_aqi_label: string | null;
  us_aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogen_dioxide: number | null;
  sulphur_dioxide: number | null;
  carbon_monoxide: number | null;
  // Derived (computed)
  dew_point_c: number | null;
  feels_like_c: number | null;
  uv_index: number | null;
  air_density_kgm3: number | null;
}

// --- World State ---

export interface WeatherSummary {
  temperature_c: number | null;
  conditions: string | null;
  wind_speed_kmh: number | null;
  is_daylight: boolean;
}

export interface RefreshStatus {
  enabled: boolean;
  interval_minutes: number;
  last_refresh: string | null;
  refresh_count: number;
}

export interface EarthProxyStatus {
  adapters: number;
  total_resolves: number;
  ttl_seconds: number;
  backend: string;
}

export interface GeographyStats {
  location_types: Record<string, number>;
  countries: Record<string, number>;
  regions: Record<string, number>;
  total_population: number;
  elevation_min: number | null;
  elevation_max: number | null;
}

export interface WorldState {
  time: WorldTime | null;
  is_running: boolean;
  location_count: number;
  connection_count: number;
  weather_stations: number;
  wind_stations: number;
  weather: Record<string, WeatherSummary>;
  geography_stats: GeographyStats | null;
  agent_count: number;
  agent_backend: string;
  agents: AgentSummary[];
  earth_proxy: EarthProxyStatus | null;
  refresh: Record<string, RefreshStatus> | null;
}

// --- Agents ---

export interface AgentTopLocation {
  location_id: number;
  location_name: string | null;
  score: number;
  visits: number;
}

export interface AgentVisitedPlace {
  location_id: number;
  location_name: string | null;
  visits: number;
}

export interface AgentSummary {
  id: string;
  name: string;
  location_id: number;
  location_name: string | null;
  last_action: string;
  energy: number;
  knowledge_score: number;
  visited_locations: number;
  policy: string;
  last_reward: number;
  goal: Record<string, unknown> | null;
}

export interface AgentDetail extends AgentSummary {
  top_locations: AgentTopLocation[];
  known_conditions: Record<string, number>;
  visited_places: AgentVisitedPlace[];
}

export interface AgentAnswer {
  agent_id: string;
  question: string;
  answer: string;
  visited_places: AgentVisitedPlace[];
  retrieval_backend: string;
  answer_confidence: number;
  answer_certainty: string;
  supporting_facts: Record<string, unknown>[];
}

// --- Orbital ---

export interface OrbitalData {
  earth_sun_distance_km: number;
  earth_sun_distance_au: number;
  orbital_position_deg: number;
  true_anomaly_deg: number;
  mean_anomaly_deg: number;
  orbital_speed_kms: number;
  axial_tilt_deg: number;
  solar_declination_deg: number;
  season: string;
  season_progress: number;
  days_to_perihelion: number;
  days_to_next_event: number;
  next_event: string;
  eccentricity: number;
  semi_major_axis_km: number;
}

// --- Solar Activity ---

export interface SolarActivity {
  kp_index: number | null;
  kp_category: string | null;
  solar_wind_speed_kms: number | null;
  solar_wind_density: number | null;
  solar_wind_temperature_k: number | null;
  bz_gsm_nt: number | null;
  bt_nt: number | null;
  xray_flux: number | null;
  xray_class: string | null;
  last_updated: string | null;
}

// --- Tick Event (WebSocket) ---

export interface AgentEvent {
  agent_id: string;
  from_location_id: number;
  to_location_id: number;
  action: string;
  knowledge_score: number;
  reward: number;
  q_value: number;
  energy: number;
  visited_count: number;
  moved: boolean;
  distance_km: number;
  goal: Record<string, unknown> | null;
}

export interface EarthRotation {
  gmst_deg: number;
  sub_solar_lat: number;
  sub_solar_lng: number;
  solar_declination_deg: number;
}

export interface TickEvent {
  tick: number;
  time: WorldTime;
  rotation: EarthRotation;
  weather_updated: boolean;
  wind_updated: boolean;
  atmosphere_updated: boolean;
  astronomy_updated: boolean;
  data_feeds_updated: boolean;
  agent_events: AgentEvent[];
  earth_proxy_resolves?: number;
  agent_phase_exceeded?: boolean;
}

// --- Extended Agent Types (pending server support) ---

/** Archetype classification from behavioral clustering */
export interface AgentArchetype {
  label: string; // e.g. "explorer", "settler", "trader"
  confidence: number; // 0..1
  cluster_id?: number;
}

/** Belief about a specific location's conditions */
export interface AgentBelief {
  location_id: number;
  location_name: string | null;
  believed_conditions: Record<string, unknown>;
  confidence: number; // 0..1
  last_updated_tick: number;
  /** How many ticks since last observation */
  staleness: number;
}

/** Per-tick utility breakdown */
export interface UtilityBreakdown {
  tick: number;
  reward: number;
  knowledge_gain: number;
  energy_cost: number;
  exploration_bonus: number;
  social_bonus: number;
  total_utility: number;
}

/** Readiness score — is the agent prepared for its current goal */
export interface ReadinessMetrics {
  energy_sufficient: boolean;
  knowledge_adequate: boolean;
  goal_feasible: boolean;
  overall_score: number; // 0..1
}

/** Extended agent detail — future version of AgentDetail */
export interface AgentDetailExtended extends AgentDetail {
  archetype?: AgentArchetype;
  beliefs?: AgentBelief[];
  utility_history?: UtilityBreakdown[];
  readiness?: ReadinessMetrics;
}

// --- Simulation ---

export interface SimulationControl {
  action: "start" | "pause" | "reset";
}

export interface ServerVersion {
  version: string;
}
