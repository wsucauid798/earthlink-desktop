/**
 * LocationSolar — location-specific solar data with live clock, SolarCurve, and elevation trend.
 */

import { useEffect, useState } from "react";
import { Sun, Clock } from "lucide-react";
import { CardSection } from "../CardSection";
import AnimNum from "../AnimNum";
import SolarCurve from "../viz/SolarCurve";
import RealtimeChart from "../charts/RealtimeChart";

export default function LocationSolar({ lat, lng }: { lat: number; lng: number }) {
  const [now, setNow] = useState(() => new Date());
  const [elevHist, setElevHist] = useState<number[]>([]);

  useEffect(() => {
    setElevHist([]);
    const id = setInterval(() => {
      const n = new Date();
      setNow(n);
      const doy = Math.floor((n.getTime() - new Date(n.getUTCFullYear(), 0, 0).getTime()) / 86400000);
      const utcH = n.getUTCHours() + n.getUTCMinutes() / 60 + n.getUTCSeconds() / 3600;
      const localH = ((utcH + lng / 15) % 24 + 24) % 24;
      const dec = -23.44 * Math.cos((2 * Math.PI * (doy + 10)) / 365);
      const latR = (lat * Math.PI) / 180, decR = (dec * Math.PI) / 180;
      const ha = ((localH - 12) * 15 * Math.PI) / 180;
      const elev = (Math.asin(
        Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(ha)
      ) * 180) / Math.PI;
      setElevHist(prev => {
        const next = [...prev, Math.round(elev * 100) / 100];
        return next.length > 120 ? next.slice(-120) : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lat, lng]);

  const dayOfYear = Math.floor((now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000);
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  const localOffset = lng / 15;
  const localHours = ((utcHours + localOffset) % 24 + 24) % 24;
  const localH = Math.floor(localHours);
  const localM = Math.floor((localHours - localH) * 60);
  const localS = Math.floor(((localHours - localH) * 3600) % 60);
  const localTimeStr = `${String(localH).padStart(2, "0")}:${String(localM).padStart(2, "0")}`;
  const localSecStr = String(localS).padStart(2, "0");

  const declination = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const hourAngle = ((localHours - 12) * 15 * Math.PI) / 180;
  const solarElevation = (Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle)
  ) * 180) / Math.PI;

  const cosHA = -Math.tan(latRad) * Math.tan(decRad);
  const dayLength = cosHA >= 1 ? 0 : cosHA <= -1 ? 24 : (2 * Math.acos(cosHA) * 12) / Math.PI;

  const isDaytime = solarElevation > 0;
  const offsetSign = localOffset >= 0 ? "+" : "";

  return (
    <CardSection title="Solar" icon={<Sun size={10} />}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock size={11} style={{ color: "var(--el-text-faint)" }} />
          <span className="text-lg font-bold tabular-nums tracking-tight" style={{ color: "var(--el-text)" }}>
            {localTimeStr}:{localSecStr}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
          local {"\u00b7"} UTC{offsetSign}{localOffset.toFixed(1)}h
        </span>
      </div>
      <SolarCurve
        dayOfYear={dayOfYear} hourFrac={localHours}
        elevation={Math.round(solarElevation * 10) / 10}
        isDaytime={isDaytime} lat={lat} idPrefix="el-solar-loc"
      />
      <RealtimeChart
        series={[{ label: "Elevation", data: elevHist, color: isDaytime ? "var(--el-warning)" : "var(--el-info)" }]}
        unit={"\u00B0"} height={48} gridLines={2}
      />
      <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
        <span>Elev <AnimNum value={Math.round(solarElevation * 10) / 10} suffix={"\u00B0"} duration={900}
          style={{ color: "var(--el-text)", fontWeight: 600 }} /></span>
        <span style={{ color: isDaytime ? "var(--el-warning)" : "var(--el-info)" }}>
          {isDaytime ? "\u2600 Day" : "\u263E Night"}
        </span>
        <span>Day <AnimNum value={Math.round(dayLength * 10) / 10} suffix="h" duration={900}
          style={{ color: "var(--el-text)", fontWeight: 600 }} /></span>
      </div>
    </CardSection>
  );
}
