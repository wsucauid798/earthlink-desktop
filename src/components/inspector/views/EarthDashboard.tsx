/**
 * EarthDashboard — default Inspector view showing Earth rotation, orbit, and solar geometry.
 *
 * Accumulates short-session history for trend charts so you can see
 * values evolving in real time even when the underlying quantities change slowly.
 */

import { useEffect, useState, useRef } from "react";
import { Compass, Orbit, Sun, Moon, Zap, Wind, Magnet, Globe } from "lucide-react";
import { useConnectionStore } from "../../../store/connectionStore";
import { client } from "../../../api/client";
import type { EarthRotation, OrbitalData, SolarActivity } from "../../../api/types";
import { CardSection } from "../CardSection";
import AnimNum from "../AnimNum";
import SubSolarMap from "../viz/SubSolarMap";
import OrbitalDiagram from "../viz/OrbitalDiagram";
import DeclinationTrack from "../viz/DeclinationTrack";
import MoonDisc from "../viz/MoonDisc";
import RealtimeChart from "../charts/RealtimeChart";
import SparklineChart from "../charts/SparklineChart";
import ArcGauge from "../gauges/ArcGauge";

const MAX_HIST = 120;

function push(arr: number[], val: number): number[] {
  const next = [...arr, val];
  return next.length > MAX_HIST ? next.slice(-MAX_HIST) : next;
}

export default function EarthDashboard() {
  const connected = useConnectionStore((s) => s.connected);
  const [rotation, setRotation] = useState<EarthRotation | null>(null);
  const [orbital, setOrbital] = useState<OrbitalData | null>(null);
  const [solar, setSolar] = useState<SolarActivity | null>(null);

  // Session-history ring buffers for trend charts
  const [gmstHist, setGmstHist] = useState<number[]>([]);
  const [declinHist, setDeclinHist] = useState<number[]>([]);
  const [distHist, setDistHist] = useState<number[]>([]);
  const [speedHist, setSpeedHist] = useState<number[]>([]);
  const [kpHist, setKpHist] = useState<number[]>([]);
  const [windHist, setWindHist] = useState<number[]>([]);

  // Track cumulative GMST to unwrap across the 0/360 boundary
  const prevGmst = useRef<number | null>(null);
  const gmstOffset = useRef(0);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [nextRotation, nextOrbital] = await Promise.all([
          client.getRotation().catch(() => null),
          client.getOrbital().catch(() => null),
        ]);
        if (cancelled) return;

        if (nextRotation) {
          setRotation(nextRotation);
          // Unwrap GMST for smooth chart (no 360→0 jumps)
          if (prevGmst.current !== null) {
            let diff = nextRotation.gmst_deg - prevGmst.current;
            if (diff < -180) diff += 360;
            if (diff > 180) diff -= 360;
            gmstOffset.current += diff;
          }
          prevGmst.current = nextRotation.gmst_deg;
          setGmstHist(prev => push(prev, gmstOffset.current));
          setDeclinHist(prev => push(prev, nextRotation.solar_declination_deg));
        }
        if (nextOrbital) {
          setOrbital(nextOrbital);
          setDistHist(prev => push(prev, nextOrbital.earth_sun_distance_km / 1e6));
          setSpeedHist(prev => push(prev, nextOrbital.orbital_speed_kms));
        }
      } finally {
        inFlight = false;
      }
    };

    // Slow domain — space weather refreshes every ~5 min upstream.
    const loadSolar = async () => {
      try {
        const next = await client.getSolarActivity();
        if (cancelled || !next) return;
        setSolar(next);
        if (next.kp_index != null) setKpHist(prev => push(prev, next.kp_index as number));
        if (next.solar_wind_speed_kms != null) setWindHist(prev => push(prev, next.solar_wind_speed_kms as number));
      } catch { /* ignore */ }
    };

    void load();
    void loadSolar();

    const intervalId = window.setInterval(() => {
      void load();
    }, 1000);
    const solarIntervalId = window.setInterval(() => {
      void loadSolar();
    }, 300_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearInterval(solarIntervalId);
    };
  }, [connected]);

  if (!rotation && !orbital) {
    return (
      <div className="px-3 py-4 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
        Waiting for live Earth telemetry...
      </div>
    );
  }

  const orbNextEvent = orbital?.next_event ?? null;
  const orbDaysToEvent = orbital?.days_to_next_event ?? null;
  const orbDaysToPerihelion = orbital?.days_to_perihelion ?? null;
  const declination = rotation?.solar_declination_deg ?? orbital?.solar_declination_deg ?? null;

  return (
    <>
      {rotation && (
        <CardSection title="Rotation" icon={<Compass size={10} />}>
          <SubSolarMap subSolarLat={rotation.sub_solar_lat} subSolarLng={rotation.sub_solar_lng} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
            <div>GMST <AnimNum value={rotation.gmst_deg} decimals={2} suffix="°"
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            <div>Declination <AnimNum value={rotation.solar_declination_deg} decimals={2} suffix="°"
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            <div>Sub-Solar Lat <AnimNum value={rotation.sub_solar_lat} decimals={2} suffix="°"
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            <div>Sub-Solar Lng <AnimNum value={rotation.sub_solar_lng} decimals={2} suffix="°"
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
          </div>
          {gmstHist.length >= 2 && (
            <RealtimeChart
              series={[
                { label: "GMST", data: gmstHist, color: "var(--el-accent)" },
                { label: "Declin", data: declinHist, color: "var(--el-warning)", dashed: true },
              ]}
              unit="°" height={52} gridLines={2}
            />
          )}
        </CardSection>
      )}

      {orbital && (
        <CardSection title="Orbit" icon={<Orbit size={10} />}>
          <div className="flex items-center gap-3">
            <OrbitalDiagram position={orbital.orbital_position_deg} />
            <div className="flex-1 text-[10px] space-y-1.5" style={{ color: "var(--el-text-muted)" }}>
              <div>Distance <AnimNum value={orbital.earth_sun_distance_km / 1e6} decimals={2} suffix=" M km"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              <div>AU <AnimNum value={orbital.earth_sun_distance_au} decimals={6}
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              <div>Speed <AnimNum value={orbital.orbital_speed_kms} decimals={2} suffix=" km/s"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              <div>Position <AnimNum value={orbital.orbital_position_deg} decimals={2} suffix="°"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              <div>Axial Tilt <AnimNum value={orbital.axial_tilt_deg} decimals={4} suffix="°"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              <div>Eccentricity <AnimNum value={orbital.eccentricity} decimals={4}
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            </div>
          </div>
          {(orbNextEvent || orbDaysToEvent != null || orbDaysToPerihelion != null) && (
            <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
              {orbNextEvent && <span>Next Event <b style={{ color: "var(--el-text)" }}>{orbNextEvent}</b></span>}
              {orbDaysToEvent != null && <span>In <b style={{ color: "var(--el-text)" }}>{Math.round(orbDaysToEvent)}d</b></span>}
              {orbDaysToPerihelion != null && <span>Perihelion <b style={{ color: "var(--el-text)" }}>{orbDaysToPerihelion.toFixed(1)}d</b></span>}
            </div>
          )}
          {distHist.length >= 2 && (
            <RealtimeChart
              series={[
                { label: "Distance", data: distHist, color: "var(--el-info)" },
                { label: "Speed", data: speedHist, color: "var(--el-success)", dashed: true },
              ]}
              unit="" height={52} gridLines={2}
            />
          )}
        </CardSection>
      )}

      {declination != null && (
        <CardSection title="Solar Geometry" icon={<Sun size={10} />}>
          <DeclinationTrack declination={declination} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
            <div>Declination <AnimNum value={declination} decimals={2} suffix="°"
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            {rotation && (
              <div>Sub-Solar Lat <AnimNum value={rotation.sub_solar_lat} decimals={2} suffix="°"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            )}
            {orbNextEvent && (
              <div>Next Event <b style={{ color: "var(--el-text)" }}>{orbNextEvent}</b></div>
            )}
            {orbDaysToEvent != null && (
              <div>Days to Event <b style={{ color: "var(--el-text)" }}>{Math.round(orbDaysToEvent)}d</b></div>
            )}
            {orbDaysToPerihelion != null && (
              <div>Perihelion <b style={{ color: "var(--el-text)" }}>{orbDaysToPerihelion.toFixed(1)}d</b></div>
            )}
          </div>
        </CardSection>
      )}

      {/* Lunar — global instantaneous moon state from /api/rotation */}
      {rotation && rotation.moon_phase_name && (
        <CardSection title="Lunar" icon={<Moon size={10} />}>
          <div className="flex items-center gap-3">
            <MoonDisc illuminationPct={rotation.moon_illumination_pct ?? 0} />
            <div className="flex-1 text-[10px] space-y-1.5" style={{ color: "var(--el-text-muted)" }}>
              <div>Phase <b style={{ color: "var(--el-text)" }}>{rotation.moon_phase_name}</b></div>
              {rotation.moon_illumination_pct != null && (
                <div>Illumination <AnimNum value={rotation.moon_illumination_pct} decimals={1} suffix="%"
                  style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              )}
              {rotation.moon_age_days != null && (
                <div>Age <AnimNum value={rotation.moon_age_days} decimals={2} suffix=" days"
                  style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              )}
            </div>
          </div>
        </CardSection>
      )}

      {/* Space Weather — live NOAA/SWPC global readings */}
      {solar && (
        <CardSection title="Space Weather" icon={<Zap size={10} />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
            {solar.kp_index != null && (
              <div>Kp <AnimNum value={solar.kp_index} decimals={2}
                style={{ color: "var(--el-text)", fontWeight: 600 }} />{solar.kp_category && (
                  <span className="ml-1 opacity-70">· {solar.kp_category}</span>
                )}</div>
            )}
            {solar.xray_class && (
              <div>X-ray <b style={{ color: "var(--el-text)" }}>{solar.xray_class}</b></div>
            )}
            {solar.solar_wind_speed_kms != null && (
              <div>Wind <AnimNum value={solar.solar_wind_speed_kms} decimals={0} suffix=" km/s"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            )}
            {solar.solar_wind_density != null && (
              <div>Density <AnimNum value={solar.solar_wind_density} decimals={2} suffix=" p/cm³"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            )}
            {solar.bt_nt != null && (
              <div>IMF Bt <AnimNum value={solar.bt_nt} decimals={2} suffix=" nT"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            )}
            {solar.bz_gsm_nt != null && (
              <div>IMF Bz <AnimNum value={solar.bz_gsm_nt} decimals={2} suffix=" nT"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            )}
          </div>
          {(kpHist.length >= 2 || windHist.length >= 2) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {kpHist.length >= 2 && (
                <SparklineChart data={kpHist} color="var(--el-warning)" height={28} />
              )}
              {windHist.length >= 2 && (
                <SparklineChart data={windHist} color="var(--el-info)" height={28} />
              )}
            </div>
          )}
        </CardSection>
      )}

      {/* Atmosphere — global mean composition (constants) + live equatorial pressure (~constant) */}
      <CardSection title="Atmosphere" icon={<Wind size={10} />}>
        <div className="space-y-1.5 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
          <div className="flex items-center justify-between">
            <span>N₂ <b style={{ color: "var(--el-text)" }}>78.09%</b></span>
            <span>O₂ <b style={{ color: "var(--el-text)" }}>20.95%</b></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ar <b style={{ color: "var(--el-text)" }}>0.93%</b></span>
            <span>CO₂ <b style={{ color: "var(--el-text)" }}>425 ppm</b></span>
          </div>
          <div>Sea-level Pressure <b style={{ color: "var(--el-text)" }}>1013.25 hPa</b></div>
        </div>
      </CardSection>

      {/* Geophysics — global equatorial reference values */}
      <CardSection title="Geophysics" icon={<Magnet size={10} />}>
        <div className="flex items-center justify-around py-1">
          <svg width={70} height={50} viewBox="0 0 70 50">
            <ArcGauge cx={35} cy={42} r={26} value={9.81} max={10} color="var(--el-info)" label="Gravity" unit="m/s²" />
          </svg>
          <svg width={70} height={50} viewBox="0 0 70 50">
            <ArcGauge cx={35} cy={42} r={26} value={47.9} max={70} color="var(--el-accent)" label="Mag Field" unit="µT" />
          </svg>
          <svg width={70} height={50} viewBox="0 0 70 50">
            <ArcGauge cx={35} cy={42} r={26} value={1674} max={2000} color="var(--el-success)" label="Rotation" unit="km/h" />
          </svg>
        </div>
      </CardSection>

      {/* Planet — Earth constants */}
      <CardSection title="Planet" icon={<Globe size={10} />}>
        <div className="space-y-2 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
          <div>
            <div className="flex justify-between mb-1">
              <span>Land <b style={{ color: "var(--el-text)" }}>29.2%</b></span>
              <span>Water <b style={{ color: "var(--el-text)" }}>70.8%</b></span>
            </div>
            <div className="h-1.5 rounded overflow-hidden flex" style={{ background: "var(--el-border-subtle)" }}>
              <div style={{ width: "29.2%", background: "var(--el-warning)" }} />
              <div style={{ width: "70.8%", background: "var(--el-info)" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>Radius <b style={{ color: "var(--el-text)" }}>6,371 km</b></div>
            <div>Age <b style={{ color: "var(--el-text)" }}>4.54 Gyr</b></div>
            <div>Surface <b style={{ color: "var(--el-text)" }}>510.1M km²</b></div>
            <div>Moons <b style={{ color: "var(--el-text)" }}>1</b></div>
          </div>
        </div>
      </CardSection>

    </>
  );
}
