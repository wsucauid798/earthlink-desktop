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
  sunrise: string | null;
  sunset: string | null;
  day_length_hours: number | null;
  is_daylight: boolean;
}

// --- World State ---

export interface WorldState {
  time: WorldTime | null;
  is_running: boolean;
  location_count: number;
  connection_count: number;
  weather_stations: number;
  weather: Record<string, Record<string, unknown>>;
  agent_count: number;
  agents: AgentSummary[];
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

// --- Tick Event (WebSocket) ---

export interface AgentEvent {
  agent_id: string;
  from_location_id: number;
  to_location_id: number;
  action: string;
  knowledge_score: number;
  reward: number;
  q_value: number;
  goal: Record<string, unknown> | null;
}

export interface TickEvent {
  tick: number;
  time: WorldTime;
  weather_updated: boolean;
  agent_events: AgentEvent[];
}

// --- Simulation ---

export interface SimulationControl {
  action: "start" | "pause" | "reset";
}

export interface ServerVersion {
  version: string;
}
