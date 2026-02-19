/**
 * Inspector — right sidebar panel.
 *
 * Card-based detail view of the selected entity. Driven by the
 * selection store — fetches location/agent detail from the server.
 */

import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Bot,
  X,
  ChevronDown,
  ChevronRight,
  Navigation,
  Wind,
  Cloud,
  Brain,
  Eye,
  MessageCircle,
  BarChart3,
  Compass,
  Mountain,
  Target,
  Send,
  Loader,
  ListChecks,
  FileText,
  Gauge,
  Shield,
  Route,
  Sun,
  Sunrise,
  Sunset,
  Globe,
  Orbit,
  Magnet,
  Waves,
  Droplets,
  Gauge as GaugeIcon,
  Eye as EyeIcon,
  Link,
  ArrowRight,
  Zap,
  Users,
  Clock,
} from "lucide-react";
import { useSelectionStore } from "../store/selectionStore";
import { useConnectionStore } from "../store/connectionStore";
import { useViewportStore } from "../store/viewportStore";
import { useAgentHistoryStore } from "../store/agentHistoryStore";
import { useWorldStore } from "../store/worldStore";
import Sparkline from "./Sparkline";
import { client } from "../api/client";
import type { AgentDetail, Astronomy, AtmosphereData, GeophysicsData, Location, NearbyLocation, OrbitalData, SolarActivity, Weather, WindData, AgentAnswer } from "../api/types";

/* ---------- Collapsible card section ---------- */

function CardSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="el-card mx-3 mb-2 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider cursor-default"
        style={{ color: "var(--el-text-muted)" }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        {title}
      </button>
      {open && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: "1px solid var(--el-border-subtle)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- Property row ---------- */

function Prop({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--el-text-muted)" }}>
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-right" style={{ color: "var(--el-text)" }}>
        {value}
      </span>
    </div>
  );
}

/* ---------- Animated number ---------- */

/** Smoothly interpolates between old and new numeric values using rAF + easing. */
function AnimNum({
  value,
  decimals = 1,
  duration = 600,
  suffix = "",
  prefix = "",
  style,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = to;
    if (from === to) return;

    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      setDisplay(from + (to - from) * ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className ?? ""}`} style={style}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

/* ---------- SVG: Circular gauge (percentage ring) ---------- */

function CircleGauge({ value, max, color, label, unit, size = 56 }: {
  value: number; max: number; color: string;
  label: string; unit: string; size?: number;
}) {
  const R = (size - 8) / 2;
  const CX = size / 2, CY = size / 2;
  const circumference = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="var(--el-border-subtle)" strokeWidth={3} />
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        <text x={CX} y={CY + 1} fontSize={size > 50 ? 11 : 9} fill="var(--el-text)"
          textAnchor="middle" dominantBaseline="middle" fontWeight="600">
          {value < 10 ? value.toFixed(1) : Math.round(value)}
        </text>
      </svg>
      <div className="text-[9px] text-center" style={{ color: "var(--el-text-muted)" }}>
        {label}
        <span className="block text-[8px]" style={{ color: "var(--el-text-faint)" }}>{unit}</span>
      </div>
    </div>
  );
}

/* ---------- SVG: Thermometer gauge ---------- */

function ThermometerGauge({ temp, min = -30, max = 45 }: { temp: number; min?: number; max?: number }) {
  const W = 28, H = 72;
  const BULB_R = 7, TUBE_W = 6;
  const tubeTop = 6, tubeBot = H - BULB_R - 4;
  const tubeH = tubeBot - tubeTop;
  const pct = Math.min(1, Math.max(0, (temp - min) / (max - min)));
  const fillTop = tubeBot - tubeH * pct;
  const col = temp <= 0 ? "var(--el-info)" : temp <= 15 ? "var(--el-success)" : temp <= 30 ? "var(--el-warning)" : "var(--el-danger)";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Tube background */}
        <rect x={(W - TUBE_W) / 2} y={tubeTop} width={TUBE_W} height={tubeH}
          rx={TUBE_W / 2} fill="var(--el-border-subtle)" />
        {/* Tube fill */}
        <rect x={(W - TUBE_W) / 2} y={fillTop} width={TUBE_W} height={tubeBot - fillTop}
          rx={TUBE_W / 2} fill={col}
          style={{ transition: "y 0.8s cubic-bezier(0.4,0,0.2,1), height 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
        {/* Bulb */}
        <circle cx={W / 2} cy={H - BULB_R - 2} r={BULB_R} fill={col} opacity={0.8} />
        <circle cx={W / 2} cy={H - BULB_R - 2} r={BULB_R - 2} fill={col} />
        {/* Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = tubeBot - tubeH * t;
          return <line key={t} x1={W / 2 + TUBE_W / 2 + 1} y1={y} x2={W / 2 + TUBE_W / 2 + 3} y2={y}
            stroke="var(--el-text-faint)" strokeWidth={0.5} />;
        })}
      </svg>
      <div className="text-[10px] font-bold tabular-nums text-center" style={{ color: col }}>
        {temp.toFixed(1)}{"\u00B0C"}
      </div>
    </div>
  );
}

/* ---------- SVG: Vertical bar chart ---------- */

function VertBarChart({ bars }: {
  bars: { label: string; value: number; max: number; color: string }[];
}) {
  const W = 260, H = 64;
  const PX = 6, PY = 4, LABEL_H = 14;
  const chartH = H - PY - LABEL_H;
  const gap = 8;
  const barW = Math.min(28, (W - PX * 2 - gap * (bars.length - 1)) / bars.length);

  const totalW = bars.length * barW + (bars.length - 1) * gap;
  const startX = (W - totalW) / 2;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 4 }}>
      {/* Baseline */}
      <line x1={PX} y1={PY + chartH} x2={W - PX} y2={PY + chartH}
        stroke="var(--el-border-subtle)" strokeWidth={0.5} />
      {bars.map((b, i) => {
        const pct = Math.min(1, Math.max(0, b.value / b.max));
        const bh = chartH * pct;
        const x = startX + i * (barW + gap);
        return (
          <g key={b.label}>
            {/* Bar background */}
            <rect x={x} y={PY} width={barW} height={chartH}
              rx={3} fill="var(--el-border-subtle)" opacity={0.3} />
            {/* Filled bar */}
            <rect x={x} y={PY + chartH - bh} width={barW} height={bh}
              rx={3} fill={b.color} opacity={0.8}>
              <animate attributeName="height" from="0" to={bh} dur="0.6s" fill="freeze" />
              <animate attributeName="y" from={PY + chartH} to={PY + chartH - bh} dur="0.6s" fill="freeze" />
            </rect>
            {/* Value text */}
            <text x={x + barW / 2} y={PY + chartH - bh - 3} fontSize={8}
              fill="var(--el-text)" textAnchor="middle" fontWeight="600">
              {b.value < 10 ? b.value.toFixed(1) : Math.round(b.value)}
            </text>
            {/* Label */}
            <text x={x + barW / 2} y={H - 1} fontSize={8}
              fill="var(--el-text-muted)" textAnchor="middle">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- SVG: Compass rose with speed rings ---------- */

function CompassRose({ direction, speed, gustSpeed, maxSpeed = 120 }: {
  direction: number; speed: number; gustSpeed?: number; maxSpeed?: number;
}) {
  const S = 120, CX = S / 2, CY = S / 2;
  const outerR = 48, innerR = 12;
  const dirs = ["N", "E", "S", "W"] as const;
  const speedPct = Math.min(1, speed / maxSpeed);
  const speedR = innerR + (outerR - innerR) * speedPct;

  // Track rotation for smooth transitions
  const prevDeg = useRef(direction);
  const [displayDeg, setDisplayDeg] = useState(direction);
  useEffect(() => {
    let diff = direction - prevDeg.current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    setDisplayDeg((prev) => prev + diff);
    prevDeg.current = direction;
  }, [direction]);

  return (
    <svg width="100%" viewBox={`0 0 ${S} ${S}`} className="block" style={{ maxWidth: S }}>
      {/* Speed rings at 25%, 50%, 75%, 100% */}
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <circle key={t} cx={CX} cy={CY} r={innerR + (outerR - innerR) * t}
          fill="none" stroke="var(--el-border-subtle)" strokeWidth={0.5}
          strokeDasharray={t === 1 ? "none" : "2,3"} />
      ))}
      {/* Cardinal labels */}
      {dirs.map((d, i) => {
        const a = (i * 90 - 90) * Math.PI / 180;
        const tx = CX + (outerR + 8) * Math.cos(a);
        const ty = CY + (outerR + 8) * Math.sin(a);
        return <text key={d} x={tx} y={ty + 3} fontSize={9}
          fill="var(--el-text-muted)" textAnchor="middle" fontWeight={d === "N" ? "bold" : "normal"}>{d}</text>;
      })}
      {/* Speed fill arc (circle whose radius = speed proportion) */}
      <circle cx={CX} cy={CY} r={speedR} fill="var(--el-info)" opacity={0.08}
        style={{ transition: "r 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      {/* Gust ring */}
      {gustSpeed != null && gustSpeed > speed && (
        <circle cx={CX} cy={CY}
          r={innerR + (outerR - innerR) * Math.min(1, gustSpeed / maxSpeed)}
          fill="none" stroke="var(--el-warning)" strokeWidth={1} strokeDasharray="3,3" opacity={0.5}
          style={{ transition: "r 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      )}
      {/* Direction arrow */}
      <g style={{
        transform: `rotate(${displayDeg}deg)`,
        transformOrigin: `${CX}px ${CY}px`,
        transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <line x1={CX} y1={CY + 10} x2={CX} y2={CY - outerR + 4}
          stroke="var(--el-info)" strokeWidth={2} strokeLinecap="round" />
        <polygon points={`${CX},${CY - outerR + 1} ${CX - 5},${CY - outerR + 9} ${CX + 5},${CY - outerR + 9}`}
          fill="var(--el-info)" />
      </g>
      {/* Center speed readout */}
      <circle cx={CX} cy={CY} r={innerR} fill="var(--el-bg-panel)" />
      <text x={CX} y={CY - 1} fontSize={12} fill="var(--el-text)"
        textAnchor="middle" dominantBaseline="middle" fontWeight="700">
        {speed.toFixed(0)}
      </text>
      <text x={CX} y={CY + 9} fontSize={7} fill="var(--el-text-faint)"
        textAnchor="middle">km/h</text>
    </svg>
  );
}

/* ---------- SVG: Inclination/Declination angle dial ---------- */

function AngleDial({ angle, label, range = 90, color }: {
  angle: number; label: string; range?: number; color: string;
}) {
  const S = 64, CX = S / 2, CY = S - 6;
  const R = 26;
  // Semi-circle: -range to +range mapped to 180° to 0° (left to right)
  const clampedAngle = Math.max(-range, Math.min(range, angle));
  const needleRad = Math.PI - (clampedAngle + range) / (2 * range) * Math.PI;
  const nx = CX + R * Math.cos(needleRad);
  const ny = CY - R * Math.abs(Math.sin(needleRad));

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={S} height={S * 0.65} viewBox={`0 0 ${S} ${S * 0.65}`}>
        {/* Semi-circle arc background */}
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none" stroke="var(--el-border-subtle)" strokeWidth={3} strokeLinecap="round" />
        {/* Center tick */}
        <line x1={CX} y1={CY - R - 2} x2={CX} y2={CY - R + 2}
          stroke="var(--el-text-faint)" strokeWidth={1} />
        {/* Needle */}
        <line x1={CX} y1={CY} x2={nx} y2={ny}
          stroke={color} strokeWidth={2} strokeLinecap="round"
          style={{ transition: "x2 0.8s, y2 0.8s" }} />
        <circle cx={CX} cy={CY} r={3} fill={color} />
        {/* Labels */}
        <text x={CX - R - 2} y={CY + 8} fontSize={7} fill="var(--el-text-faint)" textAnchor="middle">-{range}</text>
        <text x={CX + R + 2} y={CY + 8} fontSize={7} fill="var(--el-text-faint)" textAnchor="middle">+{range}</text>
      </svg>
      <div className="text-[9px] text-center" style={{ color: "var(--el-text-muted)" }}>
        {label} <span className="font-bold tabular-nums" style={{ color }}>{angle.toFixed(1)}{"\u00B0"}</span>
      </div>
    </div>
  );
}

/* ---------- SVG: Moon illumination disc ---------- */

function MoonDisc({ illuminationPct, phaseEmoji }: { illuminationPct: number; phaseEmoji?: string }) {
  const S = 44, CX = S / 2, CY = S / 2, R = 18;
  // Simple illumination: draw a circle with a clipping arc
  const ill = Math.min(100, Math.max(0, illuminationPct)) / 100;
  // Approximate: left half dark, right half lit (waxing), modulated by illumination
  const bulge = (ill - 0.5) * 2 * R; // -R to +R

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
      {/* Dark side */}
      <circle cx={CX} cy={CY} r={R} fill="var(--el-border-subtle)" />
      {/* Lit side — use an ellipse clip to simulate illumination */}
      <clipPath id="moon-lit">
        <ellipse cx={CX + bulge * 0.3} cy={CY} rx={R * Math.max(0.05, ill)} ry={R} />
      </clipPath>
      <circle cx={CX} cy={CY} r={R} fill="var(--el-text-muted)" clipPath="url(#moon-lit)" opacity={0.7} />
      {/* Subtle glow */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--el-text-faint)" strokeWidth={0.5} />
      {phaseEmoji && (
        <text x={CX} y={CY + 1} fontSize={16} textAnchor="middle" dominantBaseline="middle">{phaseEmoji}</text>
      )}
    </svg>
  );
}

/* ---------- Canvas: Real-time streaming line chart ---------- */

/** Convert a resolved CSS color (#hex or rgb()) to rgba with given alpha. */
function cssRgba(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    let h = color.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`;
  }
  const m = color.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return color;
}

function RealtimeChart({
  series,
  height = 72,
  gridLines = 3,
  unit = "",
}: {
  series: { label: string; data: number[]; color: string; dashed?: boolean }[];
  height?: number;
  gridLines?: number;
  unit?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Redraw canvas after every render (data-driven, no rAF loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;

    const dpr = window.devicePixelRatio || 1;
    const W = box.clientWidth || 260;
    const H = height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Resolve CSS custom properties to actual colors
    const cs = getComputedStyle(box);
    const resolve = (v: string) => {
      if (!v.startsWith("var(")) return v;
      return cs.getPropertyValue(v.slice(4, -1).trim()).trim() || "#888";
    };
    const textFaint = resolve("var(--el-text-faint)");
    const borderSubtle = resolve("var(--el-border-subtle)");
    const rs = series.map(s => ({ ...s, rc: resolve(s.color) }));

    const PL = 30, PR = 4, PT = 6;
    const PB = rs.length > 1 ? 16 : 4;
    const cW = W - PL - PR, cH = H - PT - PB;
    const allVals = rs.flatMap(s => s.data);

    // Empty state
    if (allVals.length < 2) {
      ctx.fillStyle = textFaint;
      ctx.font = "9px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("awaiting data\u2026", W / 2, H / 2);
      return;
    }

    // Y-axis auto-scale
    let yMin = Math.min(...allVals), yMax = Math.max(...allVals);
    const span = yMax - yMin;
    if (span === 0) { yMin -= 1; yMax += 1; } else { yMin -= span * 0.1; yMax += span * 0.1; }
    const yRange = yMax - yMin;
    const toY = (v: number) => PT + cH - ((v - yMin) / yRange) * cH;
    const toX = (i: number, len: number) => PL + (len <= 1 ? cW / 2 : (i / (len - 1)) * cW);

    // --- Grid lines + Y-axis labels ---
    ctx.font = "7px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    for (let g = 0; g <= gridLines; g++) {
      const val = yMin + (g / gridLines) * yRange;
      const y = toY(val);
      const lbl = Math.abs(val) >= 1000 ? (val / 1000).toFixed(1) + "k"
        : Math.abs(val) >= 100 ? Math.round(val).toString()
        : Math.abs(val) >= 10 ? val.toFixed(1) : val.toFixed(2);

      ctx.strokeStyle = borderSubtle;
      ctx.lineWidth = 0.5;
      ctx.setLineDash(g === 0 ? [] : [2, 3]);
      ctx.beginPath();
      ctx.moveTo(PL, y);
      ctx.lineTo(PL + cW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = "right";
      ctx.fillStyle = textFaint;
      ctx.fillText(lbl, PL - 3, y);
    }

    // Unit label (top-right of chart area)
    if (unit) {
      ctx.textAlign = "right";
      ctx.fillStyle = textFaint;
      ctx.fillText(unit, PL + cW, PT + 2);
    }

    // --- Data series ---
    rs.forEach((s) => {
      const d = s.data;
      if (d.length < 2) return;
      const pts = d.map((v, i) => ({ x: toX(i, d.length), y: toY(v) }));

      // Gradient area fill (solid lines only)
      if (!s.dashed) {
        const grad = ctx.createLinearGradient(0, PT, 0, PT + cH);
        grad.addColorStop(0, cssRgba(s.rc, 0.22));
        grad.addColorStop(1, cssRgba(s.rc, 0.01));
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[pts.length - 1].x, PT + cH);
        ctx.lineTo(pts[0].x, PT + cH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Glow line (wide, faint)
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = cssRgba(s.rc, 0.08);
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash([]);
      ctx.stroke();

      // Main line
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = s.rc;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash(s.dashed ? [4, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      // Live dot on latest point
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = cssRgba(s.rc, 0.18);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(last.x, last.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = s.rc;
      ctx.fill();
    });

    // --- Legend (multi-series) ---
    if (rs.length > 1) {
      ctx.font = "7px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      rs.forEach((s, i) => {
        const lx = PL + i * (cW / rs.length);
        ctx.strokeStyle = s.rc;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(s.dashed ? [3, 2] : []);
        ctx.beginPath();
        ctx.moveTo(lx, H - 3);
        ctx.lineTo(lx + 10, H - 3);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = textFaint;
        ctx.fillText(s.label, lx + 13, H - 2);
      });
    }
  });

  return (
    <div ref={boxRef} className="block" style={{ marginTop: 4, height }}>
      <canvas ref={canvasRef} style={{ width: "100%", height }} />
    </div>
  );
}

/* ---------- Earth science computations ---------- */

function computeEarthData(now: Date) {
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000);
  const hourFrac = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  // Solar declination (degrees) — varies ±23.44° over the year
  const declination = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);

  // Solar elevation for reference latitude (53°N — center of UK/Ireland)
  const refLat = 53;
  const latRad = (refLat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const hourAngle = ((hourFrac - 12) * 15 * Math.PI) / 180;
  const solarElevation =
    (Math.asin(Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle)) * 180) / Math.PI;

  // UV Index — rough estimate from solar elevation
  const uvIndex = solarElevation > 0 ? Math.max(0, Math.round(solarElevation / 10)) : 0;

  // Day length at reference latitude (hours)
  const cosHA = -Math.tan(latRad) * Math.tan(decRad);
  const dayLength = cosHA >= 1 ? 0 : cosHA <= -1 ? 24 : (2 * Math.acos(cosHA) * 12) / Math.PI;

  // Earth-Sun distance (km) — perihelion ~Jan 3, aphelion ~Jul 4
  const perihelionDay = 3;
  const distPhase = (2 * Math.PI * (dayOfYear - perihelionDay)) / 365;
  const earthSunDist = 149598023 * (1 + 0.0167 * Math.cos(distPhase)); // km

  // Orbital speed (km/s) — slightly faster at perihelion
  const orbitalSpeed = 29.78 * (1 + 0.0167 * Math.cos(distPhase));

  // Earth rotation speed at reference latitude (km/h)
  const rotationSpeed = 1674.4 * Math.cos(latRad);

  // Orbital position (degrees around the sun, 0° = vernal equinox ~Mar 20)
  const vernalEquinoxDay = 79;
  const orbitalPosition = ((dayOfYear - vernalEquinoxDay) / 365) * 360;

  return {
    solarElevation: Math.round(solarElevation * 10) / 10,
    solarDeclination: Math.round(declination * 10) / 10,
    uvIndex,
    dayLength: Math.round(dayLength * 10) / 10,
    earthSunDist: Math.round(earthSunDist / 1000), // thousands of km → millions
    orbitalSpeed: Math.round(orbitalSpeed * 100) / 100,
    rotationSpeed: Math.round(rotationSpeed),
    orbitalPosition: Math.round(((orbitalPosition % 360) + 360) % 360),
    isDaytime: solarElevation > 0,
  };
}

/* ---------- SVG: 24-hour Solar Elevation Curve ---------- */

function SolarCurve({ dayOfYear, hourFrac, elevation, isDaytime, lat = 53, idPrefix = "el-solar" }: {
  dayOfYear: number; hourFrac: number; elevation: number; isDaytime: boolean;
  lat?: number; idPrefix?: string;
}) {
  const W = 260, H = 82;
  const PX = 22, PY = 6, LABEL_H = 14;
  const pW = W - PX * 2;
  const pH = H - PY - LABEL_H;
  const horizonY = PY + pH * 0.55;

  const latRad = (lat * Math.PI) / 180;
  const dec = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  const decRad = (dec * Math.PI) / 180;

  const points: [number, number][] = [];
  for (let h = 0; h <= 24; h += 0.25) {
    const ha = ((h - 12) * 15 * Math.PI) / 180;
    const el = (Math.asin(
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(ha)
    ) * 180) / Math.PI;
    const x = PX + (h / 24) * pW;
    const y = horizonY - (el / 90) * (horizonY - PY);
    points.push([x, y]);
  }

  const cx = PX + (hourFrac / 24) * pW;
  const cy = horizonY - (elevation / 90) * (horizonY - PY);
  const polyPts = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillD = points.map(([x, y], i) =>
    `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
  ).join(" ") + ` L${PX + pW} ${horizonY} L${PX} ${horizonY} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 4 }}>
      <defs>
        <clipPath id={`${idPrefix}-clip`}>
          <rect x={PX} y={0} width={pW} height={horizonY} />
        </clipPath>
        <linearGradient id={`${idPrefix}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--el-warning)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--el-warning)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect x={PX} y={horizonY} width={pW} height={PY + pH - horizonY}
        fill="var(--el-info)" opacity={0.05} />
      <path d={fillD} fill={`url(#${idPrefix}-grad)`} clipPath={`url(#${idPrefix}-clip)`} />
      <line x1={PX} y1={horizonY} x2={PX + pW} y2={horizonY}
        stroke="var(--el-text-faint)" strokeWidth={0.5} strokeDasharray="4,3" />
      <polyline points={polyPts} fill="none"
        stroke="var(--el-warning)" strokeWidth={5} strokeLinejoin="round" opacity={0.08}>
        <animate attributeName="opacity" values="0.08;0.03;0.08" dur="3s" repeatCount="indefinite" />
      </polyline>
      <polyline points={polyPts} fill="none"
        stroke="var(--el-warning)" strokeWidth={1.5} strokeLinejoin="round" />
      <line x1={cx} y1={PY} x2={cx} y2={PY + pH}
        stroke="var(--el-text-faint)" strokeWidth={0.5} opacity={0.4} />
      <circle cx={cx} cy={cy} r={5}
        fill={isDaytime ? "var(--el-warning)" : "var(--el-info)"} opacity={0.15}>
        <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={2.5}
        fill={isDaytime ? "var(--el-warning)" : "var(--el-info)"} />
      <text x={PX} y={H - 1} fontSize={8} fill="var(--el-text-muted)">0h</text>
      <text x={PX + pW * 0.25} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">6h</text>
      <text x={PX + pW * 0.5} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">12h</text>
      <text x={PX + pW * 0.75} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">18h</text>
      <text x={PX + pW} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="end">24h</text>
      <text x={PX - 3} y={horizonY + 3} fontSize={8} fill="var(--el-text-muted)" textAnchor="end">0°</text>
    </svg>
  );
}

/* ---------- SVG: Atmosphere Composition Bar ---------- */

function AtmosphereChart() {
  const W = 260, H = 38;
  const BAR_Y = 6, BAR_H = 14, R = 4, PX = 4;
  const barW = W - PX * 2;
  const gases = [
    { name: "N₂", pct: 78.09, color: "var(--el-info)" },
    { name: "O₂", pct: 20.95, color: "var(--el-success)" },
    { name: "Ar", pct: 0.93, color: "var(--el-text-muted)" },
  ];
  let x = PX;
  const segs = gases.map((g) => {
    const w = Math.max(6, (g.pct / 100) * barW);
    const seg = { ...g, x, w };
    x += w;
    return seg;
  });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 4 }}>
      <defs>
        <clipPath id="el-atmo-clip">
          <rect x={PX} y={BAR_Y} width={barW} height={BAR_H} rx={R} />
        </clipPath>
      </defs>
      <rect x={PX} y={BAR_Y} width={barW} height={BAR_H} rx={R}
        fill="var(--el-border-subtle)" />
      <g clipPath="url(#el-atmo-clip)">
        {segs.map((s, i) => (
          <rect key={s.name} x={s.x} y={BAR_Y} width={s.w} height={BAR_H}
            fill={s.color} opacity={0.65}>
            <animate attributeName="opacity" values="0.65;0.45;0.65"
              dur={`${3 + i * 0.7}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </g>
      {segs.filter((s) => s.w > 18).map((s) => (
        <text key={s.name} x={s.x + s.w / 2} y={BAR_Y + BAR_H + 12}
          fontSize={9} fill="var(--el-text-muted)" textAnchor="middle">
          {s.name} {s.pct}%
        </text>
      ))}
    </svg>
  );
}

/* ---------- SVG: Orbital Position Diagram ---------- */

function OrbitalDiagram({ position }: { position: number }) {
  const S = 96;
  const CX = S / 2, CY = S / 2, R = 34;
  const rad = ((position - 90) * Math.PI) / 180;
  const ex = CX + R * Math.cos(rad);
  const ey = CY + R * Math.sin(rad);
  const seasons = [
    { deg: 0, label: "VE" },
    { deg: 90, label: "SS" },
    { deg: 180, label: "AE" },
    { deg: 270, label: "WS" },
  ];

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="var(--el-border-subtle)" strokeWidth={1} strokeDasharray="3,2" />
      {seasons.map((s) => {
        const a = ((s.deg - 90) * Math.PI) / 180;
        const tx = CX + (R + 11) * Math.cos(a);
        const ty = CY + (R + 11) * Math.sin(a);
        return (
          <text key={s.label} x={tx} y={ty + 3} fontSize={8}
            fill="var(--el-text-muted)" textAnchor="middle">{s.label}</text>
        );
      })}
      <circle cx={CX} cy={CY} r={8} fill="var(--el-warning)" opacity={0.15}>
        <animate attributeName="r" values="8;11;8" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.06;0.15" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx={CX} cy={CY} r={5} fill="var(--el-warning)" opacity={0.6} />
      <circle cx={ex} cy={ey} r={5} fill="var(--el-info)" opacity={0.2}>
        <animate attributeName="opacity" values="0.2;0.08;0.2" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={ex} cy={ey} r={3} fill="var(--el-info)" />
    </svg>
  );
}

/* ---------- SVG: Arc Gauge ---------- */

function ArcGauge({ cx, cy, r, value, max, color, label, unit }: {
  cx: number; cy: number; r: number;
  value: number; max: number; color: string;
  label: string; unit: string;
}) {
  const SWEEP = 240;
  const START = 210;

  // Animate value smoothly
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = to;
    if (from === to) return;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      setDisplay(from + (to - from) * ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const pct = Math.min(1, Math.max(0, display / max));

  const arcPoints = (sweep: number) => {
    const pts: string[] = [];
    const steps = Math.max(2, Math.round(40 * (sweep / SWEEP)));
    for (let i = 0; i <= steps; i++) {
      const deg = START - (i / steps) * sweep;
      const rad = (deg * Math.PI) / 180;
      pts.push(`${(cx + r * Math.cos(rad)).toFixed(1)},${(cy - r * Math.sin(rad)).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  const displayText = display < 10 ? display.toFixed(2) : display < 100 ? display.toFixed(1) : String(Math.round(display));

  return (
    <g>
      <polyline points={arcPoints(SWEEP)} fill="none"
        stroke="var(--el-border-subtle)" strokeWidth={3} strokeLinecap="round" />
      <polyline points={arcPoints(SWEEP * pct)} fill="none"
        stroke={color} strokeWidth={3} strokeLinecap="round" />
      <text x={cx} y={cy + 1} fontSize={10} fill="var(--el-text)"
        textAnchor="middle" fontWeight="600">
        {displayText}
      </text>
      <text x={cx} y={cy + 10} fontSize={7} fill="var(--el-text-muted)" textAnchor="middle">
        {unit}
      </text>
      <text x={cx} y={cy + 22} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

/* ---------- SVG: Geophysics Arc Gauges ---------- */

function GeophysicsGauges({ rotationSpeed, now }: { rotationSpeed: number; now: Date }) {
  const W = 260, H = 70;
  const gaugeR = 18;
  const t = now.getTime();
  const magField = Math.round((45 + Math.sin(t / 3000) * 3) * 10) / 10;
  const gravity = Math.round((9.807 + Math.sin(t / 7000) * 0.003) * 1000) / 1000;
  const gauges = [
    { value: gravity, max: 12, color: "var(--el-info)", label: "Gravity", unit: "m/s²" },
    { value: magField, max: 65, color: "var(--el-accent)", label: "Mag Field", unit: "µT" },
    { value: rotationSpeed, max: 1674, color: "var(--el-success)", label: "Rotation", unit: "km/h" },
  ];
  const spacing = W / gauges.length;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 2 }}>
      {gauges.map((g, i) => (
        <ArcGauge key={g.label}
          cx={spacing * i + spacing / 2} cy={28} r={gaugeR}
          value={g.value} max={g.max} color={g.color}
          label={g.label} unit={g.unit}
        />
      ))}
    </svg>
  );
}

/* ---------- SVG: Land/Water Stacked Bar ---------- */

function LandWaterBar() {
  const W = 260, H = 32;
  const BAR_Y = 6, BAR_H = 12, R = 4, PX = 4;
  const barW = W - PX * 2;
  const landW = barW * 0.292;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 4 }}>
      <defs>
        <clipPath id="el-planet-clip">
          <rect x={PX} y={BAR_Y} width={barW} height={BAR_H} rx={R} />
        </clipPath>
      </defs>
      <rect x={PX} y={BAR_Y} width={barW} height={BAR_H} rx={R}
        fill="var(--el-info)" opacity={0.4}>
        <animate attributeName="opacity" values="0.4;0.28;0.4" dur="5s" repeatCount="indefinite" />
      </rect>
      <g clipPath="url(#el-planet-clip)">
        <rect x={PX} y={BAR_Y} width={landW} height={BAR_H}
          fill="var(--el-success)" opacity={0.6}>
          <animate attributeName="opacity" values="0.6;0.45;0.6" dur="4s" repeatCount="indefinite" />
        </rect>
      </g>
      <text x={PX + landW / 2} y={BAR_Y + BAR_H + 10} fontSize={9}
        fill="var(--el-text-muted)" textAnchor="middle">Land 29.2%</text>
      <text x={PX + landW + (barW - landW) / 2} y={BAR_Y + BAR_H + 10} fontSize={9}
        fill="var(--el-text-muted)" textAnchor="middle">Water 70.8%</text>
    </svg>
  );
}

/* ---------- Earth Dashboard (Inspector empty state) ---------- */

function EarthDashboard() {
  const [now, setNow] = useState(() => new Date());
  const [orbital, setOrbital] = useState<OrbitalData | null>(null);
  const [solar, setSolar] = useState<SolarActivity | null>(null);

  useEffect(() => {
    // Fetch immediately
    client.getOrbital().then(setOrbital).catch(() => {});
    client.getSolarActivity().then(setSolar).catch(() => {});

    // Orbital: refresh every 10 seconds (changes slowly)
    const orbitalId = setInterval(() => {
      client.getOrbital().then(setOrbital).catch(() => {});
    }, 10_000);

    // Solar activity: refresh every 60 seconds
    const solarId = setInterval(() => {
      client.getSolarActivity().then(setSolar).catch(() => {});
    }, 60_000);

    // Clock: every second
    const clockId = setInterval(() => setNow(new Date()), 1000);

    return () => {
      clearInterval(orbitalId);
      clearInterval(solarId);
      clearInterval(clockId);
    };
  }, []);

  // Client-computed values for solar curve and geophysics gauges
  const earth = computeEarthData(now);
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000
  );
  const hourFrac =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  // Prefer server orbital data when available, fall back to client-computed
  const orbPos = orbital?.orbital_position_deg ?? earth.orbitalPosition;
  const orbDist = orbital ? orbital.earth_sun_distance_km / 1e6 : earth.earthSunDist / 1000;
  const orbSpeed = orbital?.orbital_speed_kms ?? earth.orbitalSpeed;
  const orbTilt = orbital?.axial_tilt_deg ?? 23.44;
  const orbSeason = orbital?.season ?? null;
  const orbSeasonProgress = orbital?.season_progress ?? null;
  const orbNextEvent = orbital?.next_event ?? null;
  const orbDaysToEvent = orbital?.days_to_next_event ?? null;

  // Kp color
  const kpColor = solar?.kp_index != null
    ? solar.kp_index < 2 ? "var(--el-success)"
    : solar.kp_index < 4 ? "var(--el-warning)"
    : solar.kp_index < 5 ? "var(--el-danger)"
    : "var(--el-danger)"
    : "var(--el-text-muted)";

  return (
    <>
      <CardSection title="Solar" icon={<Sun size={10} />}>
        <SolarCurve dayOfYear={dayOfYear} hourFrac={hourFrac}
          elevation={earth.solarElevation} isDaytime={earth.isDaytime} lat={53} idPrefix="el-solar-earth" />
        <div className="flex items-center justify-between mt-2 text-[10px]"
          style={{ color: "var(--el-text-muted)" }}>
          <span>Elev <AnimNum value={earth.solarElevation} suffix="°" duration={900}
            style={{ color: "var(--el-text)", fontWeight: 600 }} /></span>
          <span>UV <AnimNum value={earth.uvIndex} decimals={0} duration={900}
            style={{ color: earth.uvIndex >= 6 ? "var(--el-danger)" : "var(--el-text)", fontWeight: 600 }} /></span>
          <span>Day <AnimNum value={earth.dayLength} suffix="h" duration={900}
            style={{ color: "var(--el-text)", fontWeight: 600 }} /></span>
        </div>
      </CardSection>

      <CardSection title="Atmosphere" icon={<Waves size={10} />}>
        <AtmosphereChart />
        <div className="flex items-center justify-between mt-1 text-[10px]"
          style={{ color: "var(--el-text-muted)" }}>
          <span>CO₂ <b style={{ color: "var(--el-warning)" }}>425 ppm</b></span>
          <span>Pressure <b style={{ color: "var(--el-text)" }}>1013.25 hPa</b></span>
        </div>
      </CardSection>

      <CardSection title="Orbital" icon={<Orbit size={10} />}>
        <div className="flex items-center gap-3">
          <OrbitalDiagram position={orbPos} />
          <div className="flex-1 text-[10px] space-y-1.5" style={{ color: "var(--el-text-muted)" }}>
            <div>Distance <AnimNum value={orbDist} suffix="M km" duration={900}
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            <div>Speed <AnimNum value={orbSpeed} decimals={2} suffix=" km/s" duration={900}
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            <div>Position <AnimNum value={orbPos} decimals={0} suffix="°" duration={900}
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
            <div>Tilt <AnimNum value={orbTilt} decimals={2} suffix="°" duration={900}
              style={{ color: "var(--el-text)", fontWeight: 600 }} /></div>
          </div>
        </div>
        {orbSeason && (
          <div className="flex items-center justify-between mt-2 text-[10px]"
            style={{ color: "var(--el-text-muted)" }}>
            <span>Season <b style={{ color: "var(--el-text)" }}>{orbSeason}</b>
              {orbSeasonProgress != null && <span> ({Math.round(orbSeasonProgress * 100)}%)</span>}</span>
            {orbNextEvent && orbDaysToEvent != null && (
              <span>{orbNextEvent} in <b style={{ color: "var(--el-text)" }}>{Math.round(orbDaysToEvent)}d</b></span>
            )}
          </div>
        )}
      </CardSection>

      {solar && (
        <CardSection title="Space Weather" icon={<Zap size={10} />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]" style={{ color: "var(--el-text-muted)" }}>
            {solar.kp_index != null && (
              <div>Kp Index <b style={{ color: kpColor }}>{solar.kp_index}</b>
                <span className="ml-1 opacity-60">{solar.kp_category}</span></div>
            )}
            {solar.solar_wind_speed_kms != null && (
              <div>Solar Wind <b style={{ color: "var(--el-text)" }}>{solar.solar_wind_speed_kms}</b> km/s</div>
            )}
            {solar.solar_wind_density != null && (
              <div>Density <b style={{ color: "var(--el-text)" }}>{solar.solar_wind_density}</b> p/cm³</div>
            )}
            {solar.bt_nt != null && (
              <div>IMF Bt <b style={{ color: "var(--el-text)" }}>{solar.bt_nt}</b> nT</div>
            )}
            {solar.bz_gsm_nt != null && (
              <div>IMF Bz <b style={{ color: solar.bz_gsm_nt < 0 ? "var(--el-danger)" : "var(--el-success)" }}>
                {solar.bz_gsm_nt}</b> nT</div>
            )}
            {solar.xray_class != null && (
              <div>X-ray <b style={{ color: "var(--el-text)" }}>{solar.xray_class}</b>-class</div>
            )}
          </div>
        </CardSection>
      )}

      <CardSection title="Geophysics" icon={<Magnet size={10} />}>
        <GeophysicsGauges rotationSpeed={earth.rotationSpeed} now={now} />
      </CardSection>

      <CardSection title="Planet" icon={<Globe size={10} />}>
        <LandWaterBar />
        <div className="flex items-center justify-between mt-1 text-[10px]"
          style={{ color: "var(--el-text-muted)" }}>
          <span>Radius <b style={{ color: "var(--el-text)" }}>6,371 km</b></span>
          <span>Age <b style={{ color: "var(--el-text)" }}>4.54 Gyr</b></span>
        </div>
      </CardSection>
    </>
  );
}

/* ---------- Empty state ---------- */

function EmptyState() {
  const connected = useConnectionStore((s) => s.connected);

  if (!connected) return null;

  return <EarthDashboard />;
}

/* ---------- Loading state ---------- */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader size={20} className="animate-spin" style={{ color: "var(--el-text-faint)" }} />
      <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>Loading detail...</div>
    </div>
  );
}

/* ---------- Location detail ---------- */

/** Format elevation, hiding sentinel values like -9999. */
function formatElevation(m: number): string | null {
  if (m <= -9000) return null; // sentinel
  if (m < 0) return `${m}m (below sea level)`;
  return `${m}m`;
}

/** Convert wind degrees to compass direction. */
function degToCompass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

/** Format an ISO datetime string to a short time (HH:MM). */
function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

/* ---------- Location-specific solar & local time ---------- */

function LocationSolar({ lat, lng }: { lat: number; lng: number }) {
  const [now, setNow] = useState(() => new Date());
  const [elevHist, setElevHist] = useState<number[]>([]);

  useEffect(() => {
    setElevHist([]); // Reset on location change
    const id = setInterval(() => {
      const n = new Date();
      setNow(n);
      // Push solar elevation to streaming chart every tick
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

  // Local solar time from longitude
  const localOffset = lng / 15;
  const localHours = ((utcHours + localOffset) % 24 + 24) % 24;
  const localH = Math.floor(localHours);
  const localM = Math.floor((localHours - localH) * 60);
  const localS = Math.floor(((localHours - localH) * 3600) % 60);
  const localTimeStr = `${String(localH).padStart(2, "0")}:${String(localM).padStart(2, "0")}`;
  const localSecStr = String(localS).padStart(2, "0");

  // Solar elevation at this latitude
  const declination = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const hourAngle = ((localHours - 12) * 15 * Math.PI) / 180;
  const solarElevation = (Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle)
  ) * 180) / Math.PI;

  // Day length
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
      {/* Streaming solar elevation — new point every second */}
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

/* ---------- Wind section ---------- */

function beaufortColor(b: number): string {
  if (b <= 1) return "var(--el-text-faint)";
  if (b <= 3) return "var(--el-success)";
  if (b <= 5) return "var(--el-info)";
  if (b <= 7) return "var(--el-warning)";
  return "var(--el-danger)";
}

function WindSection({ wind }: { wind: WindData }) {
  const history = useSelectionStore(s => s.history);
  return (
    <CardSection title="Wind" icon={<Wind size={10} />}>
      {/* Speed & gust trend lines */}
      <RealtimeChart
        series={[
          { label: "Speed", data: history.windSpeed, color: "var(--el-info)" },
          { label: "Gusts", data: history.windGust, color: "var(--el-warning)", dashed: true },
        ]}
        unit="km/h" height={56} gridLines={2}
      />
      {/* Beaufort badge */}
      <div className="flex items-center gap-2 py-1">
        <span
          className="inline-flex items-center justify-center rounded text-[10px] font-bold tabular-nums"
          style={{
            width: 22, height: 22,
            background: beaufortColor(wind.beaufort),
            color: "var(--el-bg-panel)",
            opacity: 0.9,
          }}
        >
          {wind.beaufort}
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--el-text)" }}>
          {wind.beaufort_description}
        </span>
      </div>

      {/* Compass rose — direction + speed as radius */}
      {wind.speed_kmh != null && wind.direction_deg != null && (
        <div className="flex justify-center py-1">
          <CompassRose
            direction={wind.direction_deg}
            speed={wind.speed_kmh}
            gustSpeed={wind.gust_kmh ?? undefined}
          />
        </div>
      )}

      {/* Speed detail rows */}
      {wind.speed_kmh != null && (
        <Prop label={`Surface (10m)${wind.direction_deg != null ? ` ${degToCompass(wind.direction_deg)}` : ""}`}
          value={`${wind.speed_kmh.toFixed(1)} km/h`} />
      )}
      {wind.gust_kmh != null && wind.gust_kmh > 0 && (
        <Prop label="Gusts" value={
          <span style={{ color: wind.gust_kmh >= 50 ? "var(--el-danger)" : "var(--el-text)" }}>
            {wind.gust_kmh.toFixed(1)} km/h
          </span>
        } />
      )}
      {wind.speed_upper_kmh != null && (
        <Prop label={`Upper (${wind.upper_height_m ?? 80}m)`}
          value={`${wind.speed_upper_kmh.toFixed(1)} km/h`} />
      )}
      {wind.pressure_hpa != null && (
        <Prop icon={<GaugeIcon size={11} />} label="Pressure" value={`${wind.pressure_hpa.toFixed(1)} hPa`} />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
        {wind.terrain_modifier && (
          <span>Terrain: {wind.terrain_modifier}</span>
        )}
        {wind.is_interpolated && wind.interpolation_distance_km != null && (
          <span>Interpolated ({wind.interpolation_distance_km.toFixed(1)} km)</span>
        )}
        {!wind.is_interpolated && (
          <span>Station data</span>
        )}
      </div>
    </CardSection>
  );
}

/* ---------- Agents at this location ---------- */

function AgentsAtLocation({ locationId }: { locationId: number }) {
  const agents = useWorldStore((s) => s.agents);
  const here = agents.filter((a) => a.location_id === locationId);

  return (
    <CardSection title="Activity" icon={<Users size={10} />} defaultOpen={here.length > 0}>
      {here.length === 0 ? (
        <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
          No agents at this location. Activity will appear here as agents arrive.
        </div>
      ) : (
        <>
          <div className="text-[10px] mb-2" style={{ color: "var(--el-text-muted)" }}>
            {here.length} agent{here.length !== 1 ? "s" : ""} here
          </div>
          {here.slice(0, 6).map((a) => {
            const rawE = a.energy > 1 ? a.energy / 100 : a.energy;
            const e = Math.round(rawE * 100);
            return (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <Bot size={10} style={{ color: "var(--el-text-faint)" }} />
                <span className="text-[11px] truncate flex-1" style={{ color: "var(--el-text)" }}>
                  {a.name}
                </span>
                <span className="text-[9px]" style={{ color: "var(--el-text-faint)" }}>
                  {a.last_action.split(":")[0]}
                </span>
                <div className="el-energy-bar shrink-0" style={{ width: 32, height: 3 }}>
                  <div className="el-energy-bar-fill" style={{
                    width: `${e}%`,
                    background: e >= 70 ? "var(--el-success)" : e >= 40 ? "var(--el-warning)" : "var(--el-danger)",
                  }} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </CardSection>
  );
}

/* ---------- Temperature color ---------- */

function tempColor(c: number): string {
  if (c <= 0) return "var(--el-info)";
  if (c <= 15) return "var(--el-text)";
  if (c <= 30) return "var(--el-warning)";
  return "var(--el-danger)";
}

/* ---------- Location detail ---------- */

function LocationDetail({
  loc, weather, wind, astronomy, geophysics, atmosphere, nearby, onSelectLocation, onClose,
}: {
  loc: Location;
  weather: Weather | null;
  wind: WindData | null;
  astronomy: Astronomy | null;
  geophysics: GeophysicsData | null;
  atmosphere: AtmosphereData | null;
  nearby: NearbyLocation[];
  onSelectLocation: (id: number) => void;
  onClose: () => void;
}) {
  const history = useSelectionStore(s => s.history);
  const elevationStr = loc.elevation != null ? formatElevation(loc.elevation) : null;

  return (
    <>
      {/* Hero — with close button */}
      <div className="flex items-center gap-3 px-3 py-4">
        <div
          className="flex items-center justify-center shrink-0 rounded-lg"
          style={{
            width: 40,
            height: 40,
            background: "var(--el-accent-soft)",
            color: "var(--el-text-accent)",
          }}
        >
          <MapPin size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--el-text)" }}>
            {loc.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`el-badge ${loc.type === "capital" ? "el-badge-warning" : "el-badge-accent"}`}>
              {loc.type}
            </span>
            {loc.population != null && loc.population > 0 && (
              <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                {loc.population.toLocaleString()} pop.
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 flex items-center justify-center rounded p-1 cursor-default hover:opacity-80"
          style={{ color: "var(--el-text-muted)" }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Local time & solar curve — live */}
      <LocationSolar lat={loc.lat} lng={loc.lng} />

      {/* Geography */}
      <CardSection title="Geography" icon={<Compass size={10} />}>
        <Prop icon={<Navigation size={11} />} label="Coordinates" value={`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`} />
        {elevationStr && (
          <Prop icon={<Mountain size={11} />} label="Elevation" value={elevationStr} />
        )}
        {loc.terrain && <Prop label="Terrain" value={loc.terrain} />}
        {loc.admin_level_4 && <Prop label="District" value={loc.admin_level_4} />}
        {loc.admin_level_3 && <Prop label="Region" value={loc.admin_level_3} />}
        {loc.admin_level_2 && <Prop label="Country" value={loc.admin_level_2} />}
        {loc.admin_level_1 && loc.admin_level_1 !== loc.admin_level_2 && (
          <Prop label="Sovereign" value={loc.admin_level_1} />
        )}
        {nearby.length > 0 && (
          <Prop icon={<Link size={11} />} label="Connections" value={String(nearby.length)} />
        )}
      </CardSection>

      {/* Weather — mixed visuals */}
      {weather && (
        <CardSection title="Weather" icon={<Cloud size={10} />}>
          {weather.conditions && (
            <div className="text-xs font-medium py-1" style={{ color: "var(--el-text)" }}>
              {weather.conditions}
            </div>
          )}
          {/* Temperature trend line */}
          <RealtimeChart
            series={[{ label: "Temp", data: history.weatherTemp, color: "var(--el-warning)" }]}
            unit={"\u00B0C"} height={56} gridLines={2}
          />
          {/* Humidity & cloud cover trend */}
          <RealtimeChart
            series={[
              { label: "Humidity", data: history.weatherHumidity, color: "var(--el-info)" },
              { label: "Cloud", data: history.weatherCloud, color: "var(--el-text-muted)", dashed: true },
            ]}
            unit="%" height={56} gridLines={2}
          />
          {/* Top row: thermometer + circle gauges */}
          <div className="flex items-start justify-around py-2">
            {weather.temperature_c != null && (
              <ThermometerGauge temp={weather.temperature_c} />
            )}
            {weather.humidity_pct != null && (
              <CircleGauge value={weather.humidity_pct} max={100}
                color="var(--el-info)" label="Humidity" unit="%" />
            )}
            {weather.cloud_cover_pct != null && (
              <CircleGauge value={weather.cloud_cover_pct} max={100}
                color="var(--el-text-muted)" label="Cloud" unit="%" />
            )}
            {weather.pressure_hpa != null && (
              <CircleGauge value={weather.pressure_hpa} max={1050}
                color="var(--el-accent)" label="Pressure" unit="hPa" size={56} />
            )}
          </div>
          {/* Detail rows for remaining values */}
          {weather.visibility_km != null && (
            <Prop icon={<EyeIcon size={11} />} label="Visibility" value={`${weather.visibility_km.toFixed(1)} km`} />
          )}
          {weather.precipitation_mm != null && weather.precipitation_mm > 0 && (
            <Prop icon={<Droplets size={11} />} label="Precipitation" value={`${weather.precipitation_mm.toFixed(1)} mm`} />
          )}
        </CardSection>
      )}

      {/* Wind — dedicated section */}
      {wind && <WindSection wind={wind} />}

      {/* Astronomy — Sun */}
      {astronomy && (
        <CardSection title="Sun" icon={<Sun size={10} />}>
          {astronomy.civil_dawn && (
            <Prop label="Civil Dawn" value={fmtTime(astronomy.civil_dawn)} />
          )}
          {astronomy.sunrise && (
            <Prop icon={<Sunrise size={11} />} label="Sunrise" value={fmtTime(astronomy.sunrise)} />
          )}
          {astronomy.solar_noon && (
            <Prop label="Solar Noon" value={fmtTime(astronomy.solar_noon)} />
          )}
          {astronomy.sunset && (
            <Prop icon={<Sunset size={11} />} label="Sunset" value={fmtTime(astronomy.sunset)} />
          )}
          {astronomy.civil_dusk && (
            <Prop label="Civil Dusk" value={fmtTime(astronomy.civil_dusk)} />
          )}
          {astronomy.day_length_hours != null && (
            <Prop label="Day Length" value={
              <AnimNum value={astronomy.day_length_hours} suffix="h" />
            } />
          )}
          {astronomy.solar_elevation_deg != null && (
            <Prop label="Elevation" value={
              <AnimNum value={astronomy.solar_elevation_deg} suffix={"\u00B0"} />
            } />
          )}
          {astronomy.solar_azimuth_deg != null && (
            <Prop label="Azimuth" value={
              <span><AnimNum value={astronomy.solar_azimuth_deg} suffix={"\u00B0"} /> {degToCompass(astronomy.solar_azimuth_deg)}</span>
            } />
          )}
          {astronomy.nautical_dawn && astronomy.nautical_dusk && (
            <div className="text-[10px] pt-1" style={{ color: "var(--el-text-faint)" }}>
              Nautical twilight {fmtTime(astronomy.nautical_dawn)} {"\u2013"} {fmtTime(astronomy.nautical_dusk)}
            </div>
          )}
        </CardSection>
      )}

      {/* Astronomy — Moon */}
      {astronomy && astronomy.moon_phase != null && (
        <CardSection title="Moon" icon={<span style={{ fontSize: 10 }}>{astronomy.moon_phase_emoji || "\u{1F315}"}</span>}>
          <div className="flex items-center gap-3 py-1">
            <MoonDisc
              illuminationPct={astronomy.moon_illumination_pct ?? 50}
              phaseEmoji={astronomy.moon_phase_emoji ?? undefined}
            />
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: "var(--el-text)" }}>
                {astronomy.moon_phase_name}
              </div>
              {astronomy.moon_illumination_pct != null && (
                <div className="text-[10px]" style={{ color: "var(--el-text-muted)" }}>
                  {astronomy.moon_illumination_pct.toFixed(0)}% illuminated
                </div>
              )}
              {astronomy.moon_age_days != null && (
                <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                  Day {astronomy.moon_age_days.toFixed(1)} of cycle
                </div>
              )}
            </div>
          </div>
          {astronomy.moonrise && (
            <Prop icon={<Sunrise size={11} />} label="Moonrise" value={fmtTime(astronomy.moonrise)} />
          )}
          {astronomy.moonset && (
            <Prop icon={<Sunset size={11} />} label="Moonset" value={fmtTime(astronomy.moonset)} />
          )}
        </CardSection>
      )}

      {/* Geophysics — gauges + dials */}
      {geophysics && (
        <CardSection title="Geophysics" icon={<Magnet size={10} />}>
          {/* Tidal gravity variation trend (updates every 60 ticks) */}
          <RealtimeChart
            series={[{ label: "Tidal", data: history.geoTidal.map(v => v * 1e6), color: "var(--el-info)" }]}
            unit={"\u00B5m/s\u00B2"} height={48} gridLines={2}
          />
          {/* Arc gauges row: gravity, magnetic field, rotation */}
          <svg width="100%" viewBox="0 0 260 70" className="block" style={{ marginTop: 2 }}>
            <ArcGauge cx={43} cy={28} r={18}
              value={geophysics.gravity_ms2} max={12}
              color="var(--el-info)" label="Gravity" unit="m/s²" />
            <ArcGauge cx={130} cy={28} r={18}
              value={geophysics.magnetic_field_ut} max={65}
              color="var(--el-accent)" label="Mag Field" unit="µT" />
            <ArcGauge cx={217} cy={28} r={18}
              value={geophysics.rotation_speed_kmh} max={1674}
              color="var(--el-success)" label="Rotation" unit="km/h" />
          </svg>
          {/* Tidal variation annotation */}
          <div className="text-[10px] text-center py-0.5" style={{ color: "var(--el-text-faint)" }}>
            Tidal{" "}
            <span className="tabular-nums font-medium" style={{ color: geophysics.tidal_variation_ms2 >= 0 ? "var(--el-success)" : "var(--el-info)" }}>
              {geophysics.tidal_variation_ms2 >= 0 ? "+" : ""}{(geophysics.tidal_variation_ms2 * 1e6).toFixed(2)} {"\u00B5"}m/s{"\u00B2"}
            </span>
          </div>
          {/* Angle dials: inclination + declination */}
          <div className="flex items-start justify-around py-1">
            <AngleDial angle={geophysics.magnetic_inclination_deg} label="Inclination"
              range={90} color="var(--el-warning)" />
            <AngleDial angle={geophysics.magnetic_declination_deg} label="Declination"
              range={30} color="var(--el-accent)" />
          </div>
        </CardSection>
      )}

      {/* Atmosphere — charts + gauges */}
      {atmosphere && (
        <CardSection title="Atmosphere" icon={<Waves size={10} />}>
          {/* AQI badge */}
          {atmosphere.european_aqi != null && (
            <div className="flex items-center gap-2 py-1">
              <span className="el-badge text-[10px] font-bold"
                style={{
                  background: atmosphere.european_aqi <= 1 ? "var(--el-success)"
                    : atmosphere.european_aqi <= 2 ? "var(--el-warning)"
                    : atmosphere.european_aqi <= 3 ? "var(--el-accent)"
                    : atmosphere.european_aqi <= 4 ? "var(--el-danger)" : "#7B2D8E",
                  color: "#fff",
                }}>
                AQI {atmosphere.european_aqi}
              </span>
              <span className="text-[10px]" style={{ color: "var(--el-text-muted)" }}>
                {atmosphere.european_aqi_label}
                {atmosphere.us_aqi != null && ` (US: ${atmosphere.us_aqi})`}
              </span>
            </div>
          )}

          {/* PM2.5 & PM10 particulate trend */}
          <RealtimeChart
            series={[
              { label: "PM2.5", data: history.atmPM25, color: "var(--el-warning)" },
              { label: "PM10", data: history.atmPM10, color: "var(--el-accent)", dashed: true },
            ]}
            unit={"\u00B5g/m\u00B3"} height={56} gridLines={2}
          />
          {/* Pollutant vertical bar chart */}
          {(() => {
            const pollutants: { label: string; value: number; max: number; color: string }[] = [];
            if (atmosphere.pm2_5 != null) pollutants.push({ label: "PM2.5", value: atmosphere.pm2_5, max: 75, color: atmosphere.pm2_5 > 25 ? "var(--el-danger)" : "var(--el-success)" });
            if (atmosphere.pm10 != null) pollutants.push({ label: "PM10", value: atmosphere.pm10, max: 150, color: atmosphere.pm10 > 50 ? "var(--el-danger)" : "var(--el-success)" });
            if (atmosphere.ozone != null) pollutants.push({ label: "O\u2083", value: atmosphere.ozone, max: 180, color: "var(--el-info)" });
            if (atmosphere.nitrogen_dioxide != null) pollutants.push({ label: "NO\u2082", value: atmosphere.nitrogen_dioxide, max: 200, color: "var(--el-accent)" });
            if (atmosphere.carbon_monoxide != null) pollutants.push({ label: "CO", value: atmosphere.carbon_monoxide, max: 10000, color: "var(--el-warning)" });
            return pollutants.length > 0 ? <VertBarChart bars={pollutants} /> : null;
          })()}

          {/* Circle gauges row: UV, feels-like, dew point */}
          <div className="flex items-start justify-around py-2">
            {atmosphere.uv_index != null && (
              <CircleGauge value={atmosphere.uv_index} max={11}
                color={atmosphere.uv_index >= 8 ? "var(--el-danger)" : atmosphere.uv_index >= 6 ? "var(--el-warning)" : "var(--el-success)"}
                label="UV" unit="index" size={50} />
            )}
            {atmosphere.feels_like_c != null && (
              <CircleGauge value={atmosphere.feels_like_c} max={45}
                color={tempColor(atmosphere.feels_like_c)}
                label="Feels" unit={"\u00B0C"} size={50} />
            )}
            {atmosphere.dew_point_c != null && (
              <CircleGauge value={atmosphere.dew_point_c} max={30}
                color="var(--el-info)"
                label="Dew Pt" unit={"\u00B0C"} size={50} />
            )}
            {atmosphere.air_density_kgm3 != null && (
              <CircleGauge value={atmosphere.air_density_kgm3} max={1.5}
                color="var(--el-text-muted)"
                label="Density" unit="kg/m³" size={50} />
            )}
          </div>
        </CardSection>
      )}

      {/* Nearby locations */}
      {nearby.length > 0 && (
        <CardSection title="Nearby" icon={<Link size={10} />} defaultOpen={false}>
          {nearby.slice(0, 8).map((n) => {
            const conn = n.connection;
            const meta = [conn.connection_type, conn.direction].filter(Boolean).join(" \u00b7 ");
            return (
              <button
                key={n.connection.to_id === loc.id ? n.connection.from_id : n.connection.to_id}
                onClick={() => onSelectLocation(n.location.id)}
                className="flex items-center justify-between w-full py-1.5 cursor-default group"
              >
                <span className="flex items-center gap-1.5 text-xs truncate" style={{ color: "var(--el-text-muted)" }}>
                  <ArrowRight size={10} className="shrink-0" />
                  <span className="truncate group-hover:underline">{n.location.name}</span>
                  {meta && (
                    <span className="text-[9px] shrink-0" style={{ color: "var(--el-text-faint)" }}>{meta}</span>
                  )}
                </span>
                <span className="text-[10px] shrink-0 ml-2" style={{ color: "var(--el-text-faint)" }}>
                  {conn.distance_km.toFixed(1)} km
                </span>
              </button>
            );
          })}
        </CardSection>
      )}

      {/* Agent activity — wired, shows agents here or placeholder */}
      <AgentsAtLocation locationId={loc.id} />

      {/* Events — placeholder */}
      <CardSection title="Events" icon={<Zap size={10} />} defaultOpen={false}>
        <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
          Location events will appear here as world mechanics develop.
        </div>
      </CardSection>
    </>
  );
}

/* ---------- Viewport quick actions ---------- */

function ViewportActions({ agentId, agentName }: { agentId: string; agentName: string }) {
  const openTab = useViewportStore((s) => s.openTab);

  const actions = [
    { kind: "analytics" as const, icon: <BarChart3 size={11} />, label: "Analytics" },
    { kind: "decisions" as const, icon: <ListChecks size={11} />, label: "Decisions" },
    { kind: "traces" as const, icon: <FileText size={11} />, label: "Traces" },
  ];

  return (
    <div className="flex items-center gap-1.5 px-3 pb-3">
      {actions.map((a) => (
        <button
          key={a.kind}
          onClick={() => openTab(a.kind, agentId, agentName)}
          className="el-action-btn text-[10px]"
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Agent detail ---------- */

function AgentDetailView({
  agent,
  onAsk,
  askLoading,
  lastAnswer,
  onClose,
}: {
  agent: AgentDetail;
  onAsk: (q: string) => void;
  askLoading: boolean;
  lastAnswer: AgentAnswer | null;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const rawEnergy = agent.energy > 1 ? agent.energy / 100 : agent.energy;
  const energy = Math.round(rawEnergy * 100);

  function energyColor(e: number): string {
    if (e >= 70) return "var(--el-success)";
    if (e >= 40) return "var(--el-warning)";
    return "var(--el-danger)";
  }

  const handleAsk = () => {
    if (question.trim()) {
      onAsk(question.trim());
      setQuestion("");
    }
  };

  return (
    <>
      {/* Hero */}
      <div className="flex items-center gap-3 px-3 py-4">
        <div
          className="flex items-center justify-center shrink-0 rounded-full"
          style={{
            width: 40,
            height: 40,
            background: "var(--el-accent-soft)",
            color: "var(--el-text-accent)",
          }}
        >
          <Bot size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--el-text)" }}>
            {agent.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="el-badge el-badge-accent">{agent.last_action.split(":")[0]}</span>
            <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
              {agent.location_name || `Loc ${agent.location_id}`}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 flex items-center justify-center rounded p-1 cursor-default hover:opacity-80"
          style={{ color: "var(--el-text-muted)" }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Energy bar */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium" style={{ color: "var(--el-text-muted)" }}>Energy</span>
          <span className="text-[10px] font-mono" style={{ color: energyColor(energy) }}>{energy}%</span>
        </div>
        <div className="el-energy-bar" style={{ height: 4 }}>
          <div
            className="el-energy-bar-fill"
            style={{ width: `${energy}%`, background: energyColor(energy) }}
          />
        </div>
      </div>

      {/* Quick actions — open views in the center viewport */}
      <ViewportActions agentId={agent.id} agentName={agent.name} />

      {/* Ask agent input */}
      <div className="px-3 pb-3">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
          style={{
            background: "var(--el-bg-input)",
            border: "1px solid var(--el-border-card)",
          }}
        >
          <MessageCircle size={12} style={{ color: "var(--el-text-faint)" }} />
          <input
            type="text"
            placeholder="Ask this agent a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: "var(--el-text)" }}
            disabled={askLoading}
          />
          <button
            onClick={handleAsk}
            disabled={askLoading || !question.trim()}
            className="flex items-center justify-center rounded p-0.5 transition-colors cursor-default disabled:opacity-40"
            style={{ color: "var(--el-text-accent)" }}
          >
            {askLoading ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>

      {/* Agent answer */}
      {lastAnswer && (
        <div className="mx-3 mb-2">
          <div className="el-card px-3 py-2.5">
            <div className="text-[10px] font-semibold mb-1" style={{ color: "var(--el-text-muted)" }}>
              Answer ({lastAnswer.answer_certainty}, {Math.round(lastAnswer.answer_confidence * 100)}% conf.)
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--el-text)" }}>
              {lastAnswer.answer}
            </div>
            {lastAnswer.supporting_facts.length > 0 && (
              <div className="mt-2 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                Based on {lastAnswer.supporting_facts.length} supporting fact(s)
              </div>
            )}
          </div>
        </div>
      )}

      <CardSection title="Status" icon={<BarChart3 size={10} />}>
        <Prop label="ID" value={agent.id} />
        <Prop label="Policy" value={agent.policy} />
        <Prop label="Last Action" value={agent.last_action.split(":")[0]} />
        <Prop label="Last Reward" value={agent.last_reward >= 0 ? `+${agent.last_reward.toFixed(2)}` : agent.last_reward.toFixed(2)} />
        <Prop label="Knowledge Score" value={agent.knowledge_score.toFixed(1)} />
        <Prop label="Visited Places" value={String(agent.visited_locations)} />
      </CardSection>

      {agent.goal && (
        <CardSection title="Current Goal" icon={<Target size={10} />}>
          <Prop label="Kind" value={String(agent.goal.kind ?? "unknown")} />
          {agent.goal.target_location_name != null && (
            <Prop label="Target" value={String(agent.goal.target_location_name as string)} />
          )}
          {agent.goal.priority != null && (
            <Prop label="Priority" value={String(agent.goal.priority)} />
          )}
        </CardSection>
      )}

      {agent.top_locations.length > 0 && (
        <CardSection title="Top Locations" icon={<Navigation size={10} />} defaultOpen={false}>
          {agent.top_locations.slice(0, 5).map((tl) => (
            <Prop
              key={tl.location_id}
              label={tl.location_name ?? `Loc ${tl.location_id}`}
              value={`${tl.score.toFixed(1)} (${tl.visits} visits)`}
            />
          ))}
        </CardSection>
      )}

      <CardSection title="Knowledge" icon={<Brain size={10} />} defaultOpen={false}>
        <Prop label="Known Conditions" value={String(Object.keys(agent.known_conditions).length)} />
        <Prop label="Visited Places" value={String(agent.visited_places.length)} />
      </CardSection>

      {/* ----- New research sections ----- */}
      <AgentUtilitySection agentId={agent.id} />
      <AgentExplorationSection agent={agent} />
      <AgentBeliefSection />
      <AgentReadinessSection />
    </>
  );
}

/* ---------- Utility section (real-time from history) ---------- */

function AgentUtilitySection({ agentId }: { agentId: string }) {
  const history = useAgentHistoryStore((s) => s.histories[agentId]);
  const snaps = history?.snapshots ?? [];

  if (snaps.length === 0) {
    return (
      <CardSection title="Utility" icon={<Gauge size={10} />} defaultOpen={false}>
        <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
          Awaiting tick data...
        </div>
      </CardSection>
    );
  }

  const latest = snaps[snaps.length - 1];
  const cumReward = snaps.reduce((s, x) => s + x.reward, 0);
  const avgReward = cumReward / snaps.length;

  return (
    <CardSection title="Utility" icon={<Gauge size={10} />}>
      <Prop label="Last Reward" value={latest.reward >= 0 ? `+${latest.reward.toFixed(2)}` : latest.reward.toFixed(2)} />
      <Prop label="Cumulative" value={cumReward.toFixed(2)} />
      <Prop label="Avg / tick" value={avgReward.toFixed(3)} />
      <Prop label="Q-Value" value={latest.qValue.toFixed(3)} />
      <div className="mt-1">
        <Sparkline data={snaps.map((s) => s.reward)} width={200} height={28} color="var(--el-success)" />
      </div>
    </CardSection>
  );
}

/* ---------- Exploration progress ---------- */

function AgentExplorationSection({ agent }: { agent: AgentDetail }) {
  const totalLocations = agent.visited_places.length;
  // Exploration breadth (unique places) — we don't know total world locations from agent detail
  // but we can show raw count and the exploration pattern
  const topScores = agent.top_locations.slice(0, 5).map((tl) => tl.score);

  return (
    <CardSection title="Exploration" icon={<Route size={10} />}>
      <Prop label="Unique Places" value={String(totalLocations)} />
      <Prop label="Top-5 Rated" value={topScores.length > 0 ? topScores.map((s) => s.toFixed(1)).join(", ") : "—"} />
      {topScores.length >= 2 && (
        <div className="mt-1">
          <Sparkline data={topScores} width={200} height={24} color="var(--el-warning)" />
        </div>
      )}
    </CardSection>
  );
}

/* ---------- Belief confidence (placeholder) ---------- */

function AgentBeliefSection() {
  return (
    <CardSection title="Belief Confidence" icon={<Shield size={10} />} defaultOpen={false}>
      <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
        Belief confidence tracking is pending server-side support. This section will show per-location belief strength, confidence intervals, and staleness indicators.
      </div>
    </CardSection>
  );
}

/* ---------- Readiness metrics (placeholder) ---------- */

function AgentReadinessSection() {
  return (
    <CardSection title="Readiness" icon={<Gauge size={10} />} defaultOpen={false}>
      <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
        Readiness metrics are pending server-side support. This section will show archetype classification, task readiness score, and resource sufficiency indicators.
      </div>
    </CardSection>
  );
}

/* ---------- Main Inspector ---------- */

export default function Inspector() {
  const { kind, locationDetail, locationWeather, locationWind, locationNearby, locationAstronomy, locationGeophysics, locationAtmosphere, agentDetail, askLoading, lastAnswer, askAgent, clearSelection, selectLocation } =
    useSelectionStore();

  return (
    <div className="el-panel el-no-select">
      <div className="el-panel-header">
        <Eye size={12} />
        Inspector
      </div>

      <div className="flex-1 overflow-y-auto">
        {kind === null && <EmptyState />}

        {kind === "location" && !locationDetail && <LoadingState />}
        {kind === "location" && locationDetail && (
          <LocationDetail loc={locationDetail} weather={locationWeather} wind={locationWind} astronomy={locationAstronomy} geophysics={locationGeophysics} atmosphere={locationAtmosphere} nearby={locationNearby} onSelectLocation={selectLocation} onClose={clearSelection} />
        )}

        {kind === "agent" && !agentDetail && <LoadingState />}
        {kind === "agent" && agentDetail && (
          <AgentDetailView
            agent={agentDetail}
            onAsk={askAgent}
            askLoading={askLoading}
            lastAnswer={lastAnswer}
            onClose={clearSelection}
          />
        )}
      </div>
    </div>
  );
}
