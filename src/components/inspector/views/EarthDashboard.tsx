/**
 * EarthDashboard — stable live world telemetry for the Inspector panel.
 *
 * Widgets stay mounted. Missing telemetry renders as an idle state inside the
 * widget, not by removing dashboard structure.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Moon, Orbit, Sun, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useConnectionStore } from "../../../store/connectionStore";
import { useWorldStore } from "../../../store/worldStore";
import { client } from "../../../api/client";
import type { EarthRotation, OrbitalData, SolarActivity } from "../../../api/types";
import { CardSection } from "../CardSection";
import AnimNum from "../AnimNum";
import { useChartTheme, type ChartTheme } from "../charts/useChartTheme";

const MAX_HIST = 120;
const IDLE_ROWS = 24;
const SMOOTH_FRAME_MS = 33;
const GMST_DEG_PER_SEC = 360.98564736629 / 86400;
const SUB_SOLAR_LNG_DEG_PER_SEC = -360 / 86400;
const ORBIT_DEG_PER_SEC = 360 / (365.2422 * 86400);

function push(arr: number[], val: number | null | undefined): number[] {
  if (val == null || !Number.isFinite(val)) return arr;
  const next = [...arr, val];
  return next.length > MAX_HIST ? next.slice(-MAX_HIST) : next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pct(value: number, min: number, max: number): number {
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function wrap360(value: number): number {
  return ((value % 360) + 360) % 360;
}

function wrap180(value: number): number {
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

function fmt(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (abs >= 100) return String(Math.round(value));
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function tooltip(theme: ChartTheme, unit = "") {
  return {
    contentStyle: {
      background: theme.bgCard,
      border: `1px solid ${theme.gridColor}`,
      borderRadius: 6,
      color: theme.textColor,
      fontSize: 9,
      padding: "4px 8px",
    },
    labelFormatter: () => "",
    formatter: (value: unknown, name: unknown) => {
      const n = Number(value);
      return [`${Number.isFinite(n) ? fmt(n) : String(value)}${unit}`, String(name ?? "")];
    },
  };
}

function hasNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function chartRows(data: number[], key = "value"): Record<string, number | null>[] {
  if (data.length === 0) {
    return Array.from({ length: IDLE_ROWS }, (_, idx) => ({ idx, [key]: null }));
  }
  if (data.length === 1) {
    return [
      { idx: 0, [key]: data[0] },
      { idx: 1, [key]: data[0] },
    ];
  }
  return data.map((value, idx) => ({ idx, [key]: value }));
}

function multiRows(series: { key: string; data: number[] }[]): Record<string, number | null>[] {
  const maxLen = Math.max(...series.map((s) => s.data.length), 0);
  const length = maxLen === 0 ? IDLE_ROWS : Math.max(maxLen, 2);

  return Array.from({ length }, (_, idx) => {
    const row: Record<string, number | null> = { idx };
    for (const s of series) {
      if (s.data.length === 0) {
        row[s.key] = null;
        continue;
      }
      if (s.data.length === 1) {
        row[s.key] = s.data[0];
        continue;
      }
      const offset = idx - (length - s.data.length);
      row[s.key] = offset >= 0 ? s.data[offset] : null;
    }
    return row;
  });
}

function IdleOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="text-[9px]" style={{ color: "var(--el-text-faint)" }}>No signal</span>
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase" style={{ color: "var(--el-text-faint)" }}>{label}</div>
      <div className="text-[11px] font-semibold truncate tabular-nums" style={{ color: "var(--el-text)" }}>
        {children}
      </div>
    </div>
  );
}

function MetricValue({
  value,
  decimals = 1,
  suffix = "",
}: {
  value: number | null | undefined;
  decimals?: number;
  suffix?: string;
}) {
  if (!hasNumber(value)) return <>--</>;
  return <AnimNum value={value} decimals={decimals} suffix={suffix} />;
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2">{children}</div>;
}

function useSmoothRotation(source: EarthRotation | null): EarthRotation | null {
  const sourceRef = useRef<{ value: EarthRotation; at: number } | null>(null);
  const [smooth, setSmooth] = useState<EarthRotation | null>(source);

  useEffect(() => {
    if (!source) return;
    sourceRef.current = { value: source, at: performance.now() };
    setSmooth(source);
  }, [source]);

  useEffect(() => {
    if (!source) return;
    let timerId: number | null = null;

    const step = () => {
      const sample = sourceRef.current;
      if (sample) {
        const elapsedSec = (performance.now() - sample.at) / 1000;
        setSmooth({
          ...sample.value,
          gmst_deg: wrap360(sample.value.gmst_deg + elapsedSec * GMST_DEG_PER_SEC),
          sub_solar_lng: wrap180(sample.value.sub_solar_lng + elapsedSec * SUB_SOLAR_LNG_DEG_PER_SEC),
          moon_age_days: hasNumber(sample.value.moon_age_days)
            ? sample.value.moon_age_days + elapsedSec / 86400
            : sample.value.moon_age_days,
        });
      }
      timerId = window.setTimeout(step, SMOOTH_FRAME_MS);
    };

    timerId = window.setTimeout(step, SMOOTH_FRAME_MS);
    return () => {
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [source]);

  return smooth;
}

function useSmoothOrbital(source: OrbitalData | null): OrbitalData | null {
  const sourceRef = useRef<{ value: OrbitalData; at: number } | null>(null);
  const [smooth, setSmooth] = useState<OrbitalData | null>(source);

  useEffect(() => {
    if (!source) return;
    sourceRef.current = { value: source, at: performance.now() };
    setSmooth(source);
  }, [source]);

  useEffect(() => {
    if (!source) return;
    let timerId: number | null = null;

    const step = () => {
      const sample = sourceRef.current;
      if (sample) {
        const elapsedSec = (performance.now() - sample.at) / 1000;
        const elapsedDays = elapsedSec / 86400;
        setSmooth({
          ...sample.value,
          orbital_position_deg: wrap360(sample.value.orbital_position_deg + elapsedSec * ORBIT_DEG_PER_SEC),
          true_anomaly_deg: wrap360(sample.value.true_anomaly_deg + elapsedSec * ORBIT_DEG_PER_SEC),
          mean_anomaly_deg: wrap360(sample.value.mean_anomaly_deg + elapsedSec * ORBIT_DEG_PER_SEC),
          days_to_next_event: Math.max(0, sample.value.days_to_next_event - elapsedDays),
          days_to_perihelion: Math.max(0, sample.value.days_to_perihelion - elapsedDays),
        });
      }
      timerId = window.setTimeout(step, SMOOTH_FRAME_MS);
    };

    timerId = window.setTimeout(step, SMOOTH_FRAME_MS);
    return () => {
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [source]);

  return smooth;
}

function SubSolarPlot({
  lat,
  lng,
  track,
  theme,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  track: { lat: number; lng: number }[];
  theme: ChartTheme;
}) {
  const ready = hasNumber(lat) && hasNumber(lng);
  const points = track.length > 0 ? track : ready ? [{ lat, lng }] : [];

  return (
    <div className="relative" style={{ height: 112 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 10, bottom: 8, left: -12 }}>
          <CartesianGrid stroke={theme.gridColor} strokeDasharray="2 3" />
          <XAxis
            type="number"
            dataKey="lng"
            domain={[-180, 180]}
            ticks={[-180, 0, 180]}
            tick={{ fill: theme.textFaint, fontSize: 8 }}
            axisLine={{ stroke: theme.gridColor }}
            tickLine={false}
            tickFormatter={(v) => `${v}°`}
          />
          <YAxis
            type="number"
            dataKey="lat"
            domain={[-90, 90]}
            ticks={[-90, 0, 90]}
            tick={{ fill: theme.textFaint, fontSize: 8 }}
            axisLine={{ stroke: theme.gridColor }}
            tickLine={false}
            tickFormatter={(v) => `${v}°`}
          />
          <ReferenceLine x={0} stroke={theme.gridColor} />
          <ReferenceLine y={0} stroke={theme.gridColor} />
          {ready && <Tooltip {...tooltip(theme, "°")} cursor={{ stroke: theme.warning, strokeDasharray: "2 2" }} />}
          <Scatter
            data={points}
            fill={theme.warning}
            line={points.length > 1 ? { stroke: theme.info, strokeWidth: 1.2, opacity: 0.75 } : false}
            lineType="joint"
            isAnimationActive
          />
        </ScatterChart>
      </ResponsiveContainer>
      <IdleOverlay show={!ready} />
    </div>
  );
}

function RangeMarker({
  label,
  value,
  min,
  max,
  color,
  theme,
  unit = "",
}: {
  label: string;
  value: number | null | undefined;
  min: number;
  max: number;
  color: string;
  theme: ChartTheme;
  unit?: string;
}) {
  const ready = hasNumber(value);

  return (
    <div className="relative" style={{ height: 48 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 14, bottom: 0, left: 62 }}>
          <XAxis
            type="number"
            dataKey="value"
            domain={[min, max]}
            ticks={[min, 0, max].filter((tick, index, arr) => arr.indexOf(tick) === index)}
            tick={{ fill: theme.textFaint, fontSize: 8 }}
            axisLine={{ stroke: theme.gridColor }}
            tickLine={false}
            tickFormatter={(v) => `${fmt(Number(v))}${unit}`}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 1]}
            hide
          />
          <ReferenceLine x={0} stroke={theme.gridColor} />
          {ready && <Tooltip {...tooltip(theme, unit)} />}
          <Scatter data={ready ? [{ value, y: 0.5, name: label }] : []} fill={color} isAnimationActive />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="absolute left-0 top-3 text-[9px]" style={{ color: "var(--el-text-faint)" }}>{label}</div>
      <IdleOverlay show={!ready} />
    </div>
  );
}

function TrendChart({
  label,
  data,
  color,
  theme,
  unit = "",
  height = 56,
  area = false,
}: {
  label: string;
  data: number[];
  color: string;
  theme: ChartTheme;
  unit?: string;
  height?: number;
  area?: boolean;
}) {
  const rows = useMemo(() => chartRows(data), [data]);
  const ready = data.length > 0;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {area ? (
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke={theme.gridColor} strokeDasharray="2 3" vertical={false} />
            <XAxis dataKey="idx" hide />
            <YAxis hide domain={["auto", "auto"]} />
            {ready && <Tooltip {...tooltip(theme, unit)} />}
            <Area type="monotone" dataKey="value" name={label} stroke={color} fill={color} fillOpacity={0.16} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          </AreaChart>
        ) : (
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke={theme.gridColor} strokeDasharray="2 3" vertical={false} />
            <XAxis dataKey="idx" hide />
            <YAxis hide domain={["auto", "auto"]} />
            {ready && <Tooltip {...tooltip(theme, unit)} />}
            <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
      <div className="absolute left-1 top-0 text-[8px]" style={{ color: "var(--el-text-faint)" }}>{label}</div>
      <IdleOverlay show={!ready} />
    </div>
  );
}

function MultiTrendChart({
  series,
  theme,
  unit = "",
  height = 58,
}: {
  series: { key: string; data: number[]; color: string; dashed?: boolean }[];
  theme: ChartTheme;
  unit?: string;
  height?: number;
}) {
  const rows = useMemo(() => multiRows(series), [series]);
  const ready = series.some((s) => s.data.length > 0);

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={theme.gridColor} strokeDasharray="2 3" vertical={false} />
          <XAxis dataKey="idx" hide />
          <YAxis hide domain={["auto", "auto"]} />
          {ready && <Tooltip {...tooltip(theme, unit)} />}
          {series.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.key}
              stroke={line.color}
              strokeWidth={1.5}
              strokeDasharray={line.dashed ? "4 3" : undefined}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute left-1 top-0 flex gap-2 text-[8px]" style={{ color: "var(--el-text-faint)" }}>
        {series.map((s) => <span key={s.key}>{s.key}</span>)}
      </div>
      <IdleOverlay show={!ready} />
    </div>
  );
}

function DonutGauge({
  label,
  value,
  color,
  theme,
  unit = "%",
}: {
  label: string;
  value: number | null | undefined;
  color: string;
  theme: ChartTheme;
  unit?: string;
}) {
  const ready = hasNumber(value);
  const clamped = ready ? clamp(value, 0, 100) : 0;
  const data = [
    { name: label, value: clamped, color },
    { name: "Remainder", value: 100 - clamped, color: theme.gridColor },
  ];

  return (
    <div className="relative" style={{ height: 92 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={28} outerRadius={40} startAngle={90} endAngle={-270} paddingAngle={ready ? 1 : 0} isAnimationActive>
            {data.map((entry) => <Cell key={entry.name} fill={ready ? entry.color : theme.gridColor} />)}
          </Pie>
          {ready && <Tooltip {...tooltip(theme, unit)} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--el-text)" }}>
          {ready ? `${fmt(value)}${unit}` : "--"}
        </div>
        <div className="text-[8px] uppercase" style={{ color: "var(--el-text-faint)" }}>{label}</div>
      </div>
    </div>
  );
}

function SpaceWeatherRadar({
  solar,
  theme,
}: {
  solar: SolarActivity | null;
  theme: ChartTheme;
}) {
  const data = [
    { metric: "Kp", value: hasNumber(solar?.kp_index) ? pct(solar.kp_index, 0, 9) : null },
    { metric: "Wind", value: hasNumber(solar?.solar_wind_speed_kms) ? pct(solar.solar_wind_speed_kms, 250, 800) : null },
    { metric: "Density", value: hasNumber(solar?.solar_wind_density) ? pct(solar.solar_wind_density, 0, 30) : null },
    { metric: "Bt", value: hasNumber(solar?.bt_nt) ? pct(solar.bt_nt, 0, 30) : null },
    { metric: "Bz", value: hasNumber(solar?.bz_gsm_nt) ? pct(Math.abs(solar.bz_gsm_nt), 0, 30) : null },
  ];
  const ready = data.some((d) => d.value != null);

  return (
    <div className="relative" style={{ height: 112 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.map((d) => ({ ...d, value: d.value ?? 0 }))} margin={{ top: 8, right: 18, bottom: 8, left: 18 }}>
          <PolarGrid stroke={theme.gridColor} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: theme.textFaint, fontSize: 8 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke={theme.warning} fill={theme.warning} fillOpacity={ready ? 0.22 : 0} strokeWidth={1.5} isAnimationActive />
          {ready && <Tooltip {...tooltip(theme, "%")} />}
        </RadarChart>
      </ResponsiveContainer>
      <IdleOverlay show={!ready} />
    </div>
  );
}

export default function EarthDashboard() {
  const connected = useConnectionStore((s) => s.connected);
  const liveTick = useWorldStore((s) => s.tickCount);
  const liveRotation = useWorldStore((s) => s.rotation);
  const liveOrbital = useWorldStore((s) => s.orbital);
  const liveSolar = useWorldStore((s) => s.solarActivity);
  const { theme, themeRef } = useChartTheme();
  const [rotation, setRotation] = useState<EarthRotation | null>(null);
  const [orbital, setOrbital] = useState<OrbitalData | null>(null);
  const [solar, setSolar] = useState<SolarActivity | null>(null);

  const [subLatHist, setSubLatHist] = useState<number[]>([]);
  const [subLngHist, setSubLngHist] = useState<number[]>([]);
  const [declinHist, setDeclinHist] = useState<number[]>([]);
  const [auHist, setAuHist] = useState<number[]>([]);
  const [speedHist, setSpeedHist] = useState<number[]>([]);
  const [windHist, setWindHist] = useState<number[]>([]);
  const [densityHist, setDensityHist] = useState<number[]>([]);
  const [btHist, setBtHist] = useState<number[]>([]);
  const [bzHist, setBzHist] = useState<number[]>([]);
  const smoothRotation = useSmoothRotation(rotation);
  const smoothOrbital = useSmoothOrbital(orbital);

  useEffect(() => {
    if (!liveRotation) return;
    setRotation(liveRotation);
    setSubLatHist((prev) => push(prev, liveRotation.sub_solar_lat));
    setSubLngHist((prev) => push(prev, liveRotation.sub_solar_lng));
    setDeclinHist((prev) => push(prev, liveRotation.solar_declination_deg));
  }, [liveRotation, liveTick]);

  useEffect(() => {
    if (!liveOrbital) return;
    setOrbital(liveOrbital);
    setAuHist((prev) => push(prev, liveOrbital.earth_sun_distance_au));
    setSpeedHist((prev) => push(prev, liveOrbital.orbital_speed_kms));
  }, [liveOrbital, liveTick]);

  useEffect(() => {
    if (!liveSolar) return;
    setSolar(liveSolar);
    setWindHist((prev) => push(prev, liveSolar.solar_wind_speed_kms));
    setDensityHist((prev) => push(prev, liveSolar.solar_wind_density));
    setBtHist((prev) => push(prev, liveSolar.bt_nt));
    setBzHist((prev) => push(prev, liveSolar.bz_gsm_nt));
  }, [liveSolar, liveTick]);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;

    const loadFallback = async () => {
      try {
        const [nextRotation, nextOrbital, nextSolar] = await Promise.all([
          liveRotation ? Promise.resolve(null) : client.getRotation().catch(() => null),
          liveOrbital ? Promise.resolve(null) : client.getOrbital().catch(() => null),
          liveSolar ? Promise.resolve(null) : client.getSolarActivity().catch(() => null),
        ]);
        if (cancelled) return;
        if (nextRotation) setRotation(nextRotation);
        if (nextOrbital) setOrbital(nextOrbital);
        if (nextSolar) setSolar(nextSolar);
      } catch { /* stream remains the primary source */ }
    };

    void loadFallback();
    return () => {
      cancelled = true;
    };
  }, [connected]);

  const visualRotation = smoothRotation ?? rotation;
  const visualOrbital = smoothOrbital ?? orbital;
  const moonIllumination = visualRotation?.moon_illumination_pct ?? null;
  const moonAge = visualRotation?.moon_age_days ?? null;
  const kpValue = solar?.kp_index ?? null;
  const seasonProgress = visualOrbital
    ? visualOrbital.season_progress <= 1 ? visualOrbital.season_progress * 100 : visualOrbital.season_progress
    : null;
  const subSolarTrack = useMemo(
    () => subLatHist.map((lat, idx) => ({ lat, lng: subLngHist[idx] })).filter((point) => hasNumber(point.lat) && hasNumber(point.lng)),
    [subLatHist, subLngHist]
  );
  const visualSubSolarTrack = useMemo(() => {
    if (!hasNumber(visualRotation?.sub_solar_lat) || !hasNumber(visualRotation?.sub_solar_lng)) {
      return subSolarTrack;
    }
    return [...subSolarTrack.slice(-MAX_HIST + 1), {
      lat: visualRotation.sub_solar_lat,
      lng: visualRotation.sub_solar_lng,
    }];
  }, [subSolarTrack, visualRotation]);

  return (
    <div ref={themeRef}>
      <CardSection title="Rotation" icon={<Compass size={10} />}>
        <SubSolarPlot lat={visualRotation?.sub_solar_lat} lng={visualRotation?.sub_solar_lng} track={visualSubSolarTrack} theme={theme} />
        <MetricGrid>
          <Metric label="GMST">
            <MetricValue value={visualRotation?.gmst_deg} decimals={2} suffix="°" />
          </Metric>
          <Metric label="Declination">
            <MetricValue value={visualRotation?.solar_declination_deg} decimals={2} suffix="°" />
          </Metric>
          <Metric label="Sub-solar lat">
            <MetricValue value={visualRotation?.sub_solar_lat} decimals={2} suffix="°" />
          </Metric>
          <Metric label="Sub-solar lng">
            <MetricValue value={visualRotation?.sub_solar_lng} decimals={2} suffix="°" />
          </Metric>
        </MetricGrid>
      </CardSection>

      <CardSection title="Orbit" icon={<Orbit size={10} />}>
        <MetricGrid>
          <Metric label="Distance">
            <MetricValue value={visualOrbital ? visualOrbital.earth_sun_distance_km / 1e6 : null} decimals={2} suffix=" M km" />
          </Metric>
          <Metric label="AU">
            <MetricValue value={visualOrbital?.earth_sun_distance_au} decimals={9} />
          </Metric>
          <Metric label="Speed">
            <MetricValue value={visualOrbital?.orbital_speed_kms} decimals={5} suffix=" km/s" />
          </Metric>
          <Metric label="Position">
            <MetricValue value={visualOrbital?.orbital_position_deg} decimals={5} suffix="°" />
          </Metric>
        </MetricGrid>
        <RangeMarker label="Season" value={seasonProgress} min={0} max={100} color={theme.accent} theme={theme} unit="%" />
        <div className="grid grid-cols-2 gap-2">
          <TrendChart label="AU" data={auHist} color={theme.info} theme={theme} height={48} />
          <TrendChart label="Speed" data={speedHist} color={theme.success} theme={theme} height={48} unit=" km/s" />
        </div>
        <div className="flex items-center justify-between pt-2 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
          <span>Next <b style={{ color: "var(--el-text)" }}>{visualOrbital?.next_event ?? "--"}</b></span>
          <span>In <b style={{ color: "var(--el-text)" }}>{hasNumber(visualOrbital?.days_to_next_event) ? `${Math.round(visualOrbital.days_to_next_event)}d` : "--"}</b></span>
          <span>Perihelion <b style={{ color: "var(--el-text)" }}>{hasNumber(visualOrbital?.days_to_perihelion) ? `${visualOrbital.days_to_perihelion.toFixed(1)}d` : "--"}</b></span>
        </div>
      </CardSection>

      <CardSection title="Solar Geometry" icon={<Sun size={10} />}>
        <RangeMarker label="Declination" value={visualRotation?.solar_declination_deg ?? visualOrbital?.solar_declination_deg} min={-23.44} max={23.44} color={theme.warning} theme={theme} unit="°" />
        <TrendChart label="Declination" data={declinHist} color={theme.warning} theme={theme} height={56} unit="°" />
      </CardSection>

      <CardSection title="Lunar" icon={<Moon size={10} />}>
        <MetricGrid>
          <Metric label="Phase">{visualRotation?.moon_phase_name ?? "--"}</Metric>
          <Metric label="Illumination">
            <MetricValue value={moonIllumination} decimals={1} suffix="%" />
          </Metric>
          <Metric label="Age">
            <MetricValue value={moonAge} decimals={2} suffix=" days" />
          </Metric>
        </MetricGrid>
        <div className="grid grid-cols-[92px_1fr] gap-2 items-center">
          <DonutGauge label="Light" value={moonIllumination} color={theme.info} theme={theme} />
          <RangeMarker label="Cycle" value={moonAge} min={0} max={29.53} color={theme.accent} theme={theme} unit="d" />
        </div>
      </CardSection>

      <CardSection title="Space Weather" icon={<Zap size={10} />}>
        <MetricGrid>
          <Metric label="Kp index">
            {hasNumber(kpValue) ? <><MetricValue value={kpValue} decimals={2} />{solar?.kp_category ? ` ${solar.kp_category}` : ""}</> : "--"}
          </Metric>
          <Metric label="X-ray">{solar?.xray_class ?? "--"}</Metric>
          <Metric label="Wind">
            <MetricValue value={solar?.solar_wind_speed_kms} decimals={0} suffix=" km/s" />
          </Metric>
          <Metric label="Density">
            <MetricValue value={solar?.solar_wind_density} decimals={2} suffix=" p/cm3" />
          </Metric>
        </MetricGrid>
        <div className="grid grid-cols-[112px_1fr] gap-2 items-center">
          <SpaceWeatherRadar solar={solar} theme={theme} />
          <TrendChart label="Wind" data={windHist} color={theme.info} theme={theme} height={70} unit=" km/s" area />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TrendChart label="Density" data={densityHist} color={theme.success} theme={theme} height={52} />
          <MultiTrendChart
            series={[
              { key: "Bt", data: btHist, color: theme.accent },
              { key: "Bz", data: bzHist, color: theme.warning, dashed: true },
            ]}
            theme={theme}
            unit=" nT"
            height={52}
          />
        </div>
      </CardSection>
    </div>
  );
}
