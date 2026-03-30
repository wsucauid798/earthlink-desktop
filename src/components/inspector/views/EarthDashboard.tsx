/**
 * EarthDashboard — default Inspector view showing Earth rotation, orbit, and solar geometry.
 *
 * Accumulates short-session history for trend charts so you can see
 * values evolving in real time even when the underlying quantities change slowly.
 */

import { useEffect, useState, useRef } from "react";
import { Compass, Orbit, Sun, Activity } from "lucide-react";
import { useConnectionStore } from "../../../store/connectionStore";
import { client } from "../../../api/client";
import type { EarthRotation, OrbitalData } from "../../../api/types";
import { CardSection } from "../CardSection";
import AnimNum from "../AnimNum";
import SubSolarMap from "../viz/SubSolarMap";
import OrbitalDiagram from "../viz/OrbitalDiagram";
import DeclinationTrack from "../viz/DeclinationTrack";
import RealtimeChart from "../charts/RealtimeChart";

const MAX_HIST = 120;

function push(arr: number[], val: number): number[] {
  const next = [...arr, val];
  return next.length > MAX_HIST ? next.slice(-MAX_HIST) : next;
}

export default function EarthDashboard() {
  const connected = useConnectionStore((s) => s.connected);
  const [rotation, setRotation] = useState<EarthRotation | null>(null);
  const [orbital, setOrbital] = useState<OrbitalData | null>(null);

  // Session-history ring buffers for trend charts
  const [gmstHist, setGmstHist] = useState<number[]>([]);
  const [declinHist, setDeclinHist] = useState<number[]>([]);
  const [distHist, setDistHist] = useState<number[]>([]);
  const [speedHist, setSpeedHist] = useState<number[]>([]);

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

    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
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
              <div>Position <AnimNum value={orbital.orbital_position_deg} decimals={0} suffix="°"
                style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
              <div>Axial Tilt <AnimNum value={orbital.axial_tilt_deg} decimals={2} suffix="°"
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

      {/* Live session activity feed */}
      {(gmstHist.length > 0 || distHist.length > 0) && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1 text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--el-text-faint)" }}>
            <Activity size={8} />
            Live · {gmstHist.length} samples
          </div>
        </div>
      )}
    </>
  );
}
