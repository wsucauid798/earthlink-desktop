/**
 * WindSection — wind detail with trend charts, Beaufort badge, and CompassRose.
 */

import { Wind } from "lucide-react";
import { Gauge as GaugeIcon } from "lucide-react";
import { useSelectionStore } from "../../../store/selectionStore";
import type { WindData } from "../../../api/types";
import { CardSection, Prop } from "../CardSection";
import { beaufortColor, degToCompass } from "../helpers";
import CompassRose from "../viz/CompassRose";
import RealtimeChart from "../charts/RealtimeChart";

export default function WindSection({ wind }: { wind: WindData }) {
  const history = useSelectionStore(s => s.history);
  return (
    <CardSection title="Wind" icon={<Wind size={10} />}>
      <RealtimeChart
        series={[
          { label: "Speed", data: history.windSpeed, color: "var(--el-info)" },
          { label: "Gusts", data: history.windGust, color: "var(--el-warning)", dashed: true },
        ]}
        unit="km/h" height={56} gridLines={2}
      />
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

      {wind.speed_kmh != null && wind.direction_deg != null && (
        <div className="flex justify-center py-1">
          <CompassRose
            direction={wind.direction_deg}
            speed={wind.speed_kmh}
            gustSpeed={wind.gust_kmh ?? undefined}
          />
        </div>
      )}

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
