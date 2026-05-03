/**
 * Explorer — left sidebar. World dashboard.
 *
 * Dense, compact information about the state of the virtual world.
 * No redundancy with other panels. Empty sections are hidden.
 */

import {
  Globe,
  Bot,
  MapPin,
  Link,
  Activity,
  Clock,
  Sun,
  Moon,
  Server,
  Map,
  Flag,
  Building2,
  Mountain,
  Droplets,
  Orbit,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useWorldNow } from "../hooks/useWorldNow";
import { useWorldStore } from "../store/worldStore";
import { useConnectionStore } from "../store/connectionStore";
import { client } from "../api/client";
import type { OrbitalData, EarthRotation, SolarActivity } from "../api/types";

/* ---------- Compact row: label left, value right ---------- */

function Row({
  icon,
  label,
  value,
  color,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-[3px] min-h-[22px]">
      {icon && (
        <span className="shrink-0 w-4 flex justify-center" style={{ color: "var(--el-text-faint)" }}>
          {icon}
        </span>
      )}
      <span className="text-[11px] truncate" style={{ color: "var(--el-text-muted)" }}>
        {label}
      </span>
      <span
        className="ml-auto text-[11px] font-medium tabular-nums shrink-0"
        style={{ color: color || "var(--el-text)" }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

/* ---------- Section divider ---------- */

function Section({ label }: { label: string }) {
  return (
    <div
      className="text-[9px] font-semibold uppercase tracking-widest pt-3 pb-1 px-3"
      style={{ color: "var(--el-text-faint)" }}
    >
      {label}
    </div>
  );
}

/* ---------- Main ---------- */

export default function Explorer() {
  const connected = useConnectionStore((s) => s.connected);
  const {
    time,
    isRunning,
    locationCount,
    connectionCount,
    agentCount,
    agentBackend,
    tickCount,
    speedMultiplier,
    geographyStats,
  } = useWorldStore();

  const now = useWorldNow();
  const hours = connected ? String(now.getUTCHours()).padStart(2, "0") : "--";
  const minutes = connected ? String(now.getUTCMinutes()).padStart(2, "0") : "--";
  const seconds = connected ? String(now.getUTCSeconds()).padStart(2, "0") : "--";

  // Live orbital state — refetched every 30s.
  const [orbital, setOrbital] = useState<OrbitalData | null>(null);
  // Live rotation/lunar/equation-of-time — refetched every 10s (changes faster).
  const [rotation, setRotation] = useState<EarthRotation | null>(null);
  // Live space weather — refetched every 5min (NOAA polls similarly).
  const [solar, setSolar] = useState<SolarActivity | null>(null);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;

    const fetchOrbital = async () => {
      try {
        const data = await client.getOrbital();
        if (!cancelled) setOrbital(data);
      } catch { /* ignore */ }
    };
    const fetchRotation = async () => {
      try {
        const data = await client.getRotation();
        if (!cancelled) setRotation(data);
      } catch { /* ignore */ }
    };
    const fetchSolar = async () => {
      try {
        const data = await client.getSolarActivity();
        if (!cancelled) setSolar(data);
      } catch { /* ignore */ }
    };

    fetchOrbital(); fetchRotation(); fetchSolar();
    const idOrb = setInterval(fetchOrbital, 30_000);
    const idRot = setInterval(fetchRotation, 10_000);
    const idSol = setInterval(fetchSolar, 300_000);
    return () => {
      cancelled = true;
      clearInterval(idOrb); clearInterval(idRot); clearInterval(idSol);
    };
  }, [connected]);

  // Full date from server time (authoritative world date)
  let fullDate = "";
  if (time?.current_time) {
    const utc = new Date(time.current_time);
    fullDate = utc.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <div className="el-panel el-no-select">
      <div className="el-panel-header"><Globe size={12} />World</div>

      <div className="flex-1 overflow-y-auto">
        {/* Connected world data */}
        {connected && (
          <>
            {/* Time block — real-time ticking clock */}
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: "var(--el-text)" }}>
                  {hours}:{minutes}:{seconds}
                </span>
                <span className="text-[11px]" style={{ color: "var(--el-text-muted)" }}>
                  UTC
                </span>
              </div>
              {fullDate && (
                <div className="mt-0.5">
                  <span className="text-[11px]" style={{ color: "var(--el-text-faint)" }}>
                    {fullDate}
                  </span>
                </div>
              )}
            </div>

            {/* Time / sidereal extras */}
            {rotation && (
              <div className="px-3 mt-1">
                <Row icon={<Clock size={11} />} label="GMST" value={`${rotation.gmst_deg.toFixed(2)}°`} />
                {rotation.equation_of_time_min != null && (
                  <Row
                    icon={<Sun size={11} />}
                    label="Equation of Time"
                    value={`${rotation.equation_of_time_min >= 0 ? "+" : ""}${rotation.equation_of_time_min.toFixed(2)} min`}
                  />
                )}
              </div>
            )}

            {/* Simulation status */}
            <Section label="Simulation" />
            <div className="px-3">
              <Row icon={<Activity size={11} />} label="Status" value={isRunning ? "Running" : "Stopped"} color={isRunning ? "var(--el-success)" : "var(--el-text-faint)"} />
              <Row icon={<Clock size={11} />} label="Tick" value={tickCount} />
              <Row icon={<Activity size={11} />} label="Speed" value={`${speedMultiplier}x`} color={speedMultiplier > 1 ? "var(--el-accent)" : undefined} />
              {agentBackend && (
                <Row icon={<Server size={11} />} label="Runtime" value={agentBackend} />
              )}
            </div>

            {/* Physical */}
            <Section label="Physical" />
            <div className="px-3">
              <Row icon={<Globe size={11} />} label="Radius" value="6,371 km" />
              <Row icon={<Globe size={11} />} label="Surface Area" value="510.1M km²" />
              <Row icon={<Droplets size={11} />} label="Water" value="71%" />
              <Row icon={<Mountain size={11} />} label="Land" value="29%" />
              <Row icon={<Mountain size={11} />} label="Highest Point" value="8,849 m" />
              <Row icon={<Mountain size={11} />} label="Lowest Point" value="-11,034 m" />
            </div>

            {/* Orbital — live from /api/orbital */}
            <Section label="Orbital" />
            <div className="px-3">
              <Row
                icon={<Orbit size={11} />}
                label="Axial Tilt"
                value={orbital ? `${orbital.axial_tilt_deg.toFixed(4)}°` : "—"}
              />
              <Row icon={<Clock size={11} />} label="Sidereal Day" value="23h 56m 4s" />
              <Row icon={<Orbit size={11} />} label="Orbital Period" value="365.25 days" />
              <Row
                icon={<Sun size={11} />}
                label="Distance from Sun"
                value={
                  orbital
                    ? `${(orbital.earth_sun_distance_km / 1_000_000).toFixed(2)}M km`
                    : "—"
                }
              />
              <Row
                icon={<Activity size={11} />}
                label="Orbital Speed"
                value={orbital ? `${orbital.orbital_speed_kms.toFixed(2)} km/s` : "—"}
              />
              <Row
                icon={<Sun size={11} />}
                label="Solar Declination"
                value={orbital ? `${orbital.solar_declination_deg.toFixed(2)}°` : "—"}
              />
              {rotation && (
                <Row
                  icon={<Sun size={11} />}
                  label="Sub-solar Point"
                  value={`${rotation.sub_solar_lat.toFixed(2)}°, ${rotation.sub_solar_lng.toFixed(2)}°`}
                />
              )}
              <Row
                icon={<Clock size={11} />}
                label="Days to Perihelion"
                value={orbital ? `${orbital.days_to_perihelion.toFixed(0)}d` : "—"}
              />
              <Row
                icon={<Clock size={11} />}
                label="Next Event"
                value={orbital ? `${orbital.next_event} in ${orbital.days_to_next_event.toFixed(0)}d` : "—"}
              />
              <Row icon={<Moon size={11} />} label="Moons" value="1" />
            </div>

            {/* Lunar — global, same everywhere on Earth at this instant */}
            {rotation?.moon_phase_name && (
              <>
                <Section label="Lunar" />
                <div className="px-3">
                  <Row icon={<Moon size={11} />} label="Phase" value={rotation.moon_phase_name} />
                  {rotation.moon_illumination_pct != null && (
                    <Row
                      icon={<Moon size={11} />}
                      label="Illumination"
                      value={`${rotation.moon_illumination_pct.toFixed(1)}%`}
                    />
                  )}
                  {rotation.moon_age_days != null && (
                    <Row
                      icon={<Clock size={11} />}
                      label="Age"
                      value={`${rotation.moon_age_days.toFixed(2)} days`}
                    />
                  )}
                </div>
              </>
            )}

            {/* Space Weather — live global readings (NOAA/SWPC) */}
            {solar && (
              <>
                <Section label="Space Weather" />
                <div className="px-3">
                  {solar.kp_index != null && (
                    <Row
                      icon={<Activity size={11} />}
                      label="Kp Index"
                      value={`${solar.kp_index.toFixed(2)}${solar.kp_category ? ` · ${solar.kp_category}` : ""}`}
                    />
                  )}
                  {solar.xray_class && (
                    <Row
                      icon={<Sun size={11} />}
                      label="X-ray Class"
                      value={solar.xray_class}
                    />
                  )}
                  {solar.solar_wind_speed_kms != null && (
                    <Row
                      icon={<Activity size={11} />}
                      label="Solar Wind"
                      value={`${solar.solar_wind_speed_kms.toFixed(0)} km/s`}
                    />
                  )}
                </div>
              </>
            )}

            {/* Places */}
            <Section label="Places" />
            <div className="px-3">
              <Row icon={<MapPin size={11} />} label="Locations" value={locationCount} />
              <Row icon={<Link size={11} />} label="Connections" value={connectionCount} />
              {geographyStats && Object.keys(geographyStats.countries).length > 0 && (
                <Row icon={<Flag size={11} />} label="Countries" value={Object.keys(geographyStats.countries).length} />
              )}
              {geographyStats && Object.keys(geographyStats.regions).length > 0 && (
                <Row icon={<Map size={11} />} label="Regions" value={Object.keys(geographyStats.regions).length} />
              )}
              {geographyStats && Object.keys(geographyStats.location_types).length > 0 && (
                <Row icon={<Building2 size={11} />} label="Place Types" value={Object.keys(geographyStats.location_types).length} />
              )}
              {geographyStats && geographyStats.total_population > 0 && (
                <Row
                  icon={<Bot size={11} />}
                  label="Total Population"
                  value={geographyStats.total_population.toLocaleString()}
                />
              )}
            </div>

            {/* Agents */}
            <Section label="Agents" />
            <div className="px-3">
              <Row icon={<Bot size={11} />} label="Active" value={agentCount} color="var(--el-info)" />
            </div>



          </>
        )}
      </div>
    </div>
  );
}
