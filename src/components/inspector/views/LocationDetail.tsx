/**
 * LocationDetail — full location detail panel with all data sections.
 */

import {
  MapPin, X, Navigation, Cloud, Sun, Sunrise, Sunset, Compass,
  Mountain, Magnet, Waves, Droplets, Eye as EyeIcon, Link, ArrowRight, Zap,
} from "lucide-react";
import { useSelectionStore } from "../../../store/selectionStore";
import type {
  Astronomy, AtmosphereData, GeophysicsData, Location,
  NearbyLocation, Weather, WindData,
} from "../../../api/types";
import { CardSection, Prop } from "../CardSection";
import AnimNum from "../AnimNum";
import { formatElevation, degToCompass, fmtTime, tempColor } from "../helpers";
import CircleGauge from "../gauges/CircleGauge";
import ThermometerGauge from "../gauges/ThermometerGauge";
import ArcGauge from "../gauges/ArcGauge";
import AngleDial from "../gauges/AngleDial";
import MoonDisc from "../viz/MoonDisc";
import RealtimeChart from "../charts/RealtimeChart";
import VertBarChart from "../charts/VertBarChart";
import LocationSolar from "./LocationSolar";
import WindSection from "./WindSection";
import AgentsAtLocation from "./AgentsAtLocation";

export default function LocationDetail({
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
      {/* Hero */}
      <div className="flex items-center gap-3 px-3 py-4">
        <div
          className="flex items-center justify-center shrink-0 rounded-lg"
          style={{ width: 40, height: 40, background: "var(--el-accent-soft)", color: "var(--el-text-accent)" }}
        >
          <MapPin size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--el-text)" }}>{loc.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`el-badge ${loc.type === "capital" ? "el-badge-warning" : "el-badge-accent"}`}>{loc.type}</span>
            {loc.population != null && loc.population > 0 && (
              <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>{loc.population.toLocaleString()} pop.</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 flex items-center justify-center rounded p-1 cursor-default hover:opacity-80"
          style={{ color: "var(--el-text-muted)" }} title="Close">
          <X size={14} />
        </button>
      </div>

      <LocationSolar lat={loc.lat} lng={loc.lng} />

      {/* Geography */}
      <CardSection title="Geography" icon={<Compass size={10} />}>
        <Prop icon={<Navigation size={11} />} label="Coordinates" value={`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`} />
        {elevationStr && <Prop icon={<Mountain size={11} />} label="Elevation" value={elevationStr} />}
        {loc.terrain && <Prop label="Terrain" value={loc.terrain} />}
        {loc.admin_level_4 && <Prop label="District" value={loc.admin_level_4} />}
        {loc.admin_level_3 && <Prop label="Region" value={loc.admin_level_3} />}
        {loc.admin_level_2 && <Prop label="State / Province" value={loc.admin_level_2} />}
        {loc.admin_level_1 && <Prop label="Country" value={loc.admin_level_1} />}
        {nearby.length > 0 && <Prop icon={<Link size={11} />} label="Connections" value={String(nearby.length)} />}
      </CardSection>

      {/* Weather */}
      {weather && (
        <CardSection title="Weather" icon={<Cloud size={10} />}>
          {weather.conditions && (
            <div className="text-xs font-medium py-1" style={{ color: "var(--el-text)" }}>{weather.conditions}</div>
          )}
          <RealtimeChart
            series={[{ label: "Temp", data: history.weatherTemp, color: "var(--el-warning)" }]}
            unit={"\u00B0C"} height={56} gridLines={2}
          />
          <RealtimeChart
            series={[
              { label: "Humidity", data: history.weatherHumidity, color: "var(--el-info)" },
              { label: "Cloud", data: history.weatherCloud, color: "var(--el-text-muted)", dashed: true },
            ]}
            unit="%" height={56} gridLines={2}
          />
          <div className="flex items-start justify-around py-2">
            {weather.temperature_c != null && <ThermometerGauge temp={weather.temperature_c} />}
            {weather.humidity_pct != null && <CircleGauge value={weather.humidity_pct} max={100} color="var(--el-info)" label="Humidity" unit="%" />}
            {weather.cloud_cover_pct != null && <CircleGauge value={weather.cloud_cover_pct} max={100} color="var(--el-text-muted)" label="Cloud" unit="%" />}
            {weather.pressure_hpa != null && <CircleGauge value={weather.pressure_hpa} max={1050} color="var(--el-accent)" label="Pressure" unit="hPa" size={56} />}
          </div>
          {weather.visibility_km != null && <Prop icon={<EyeIcon size={11} />} label="Visibility" value={`${weather.visibility_km.toFixed(1)} km`} />}
          {weather.precipitation_mm != null && weather.precipitation_mm > 0 && <Prop icon={<Droplets size={11} />} label="Precipitation" value={`${weather.precipitation_mm.toFixed(1)} mm`} />}
        </CardSection>
      )}

      {wind && <WindSection wind={wind} />}

      {/* Sun */}
      {astronomy && (
        <CardSection title="Sun" icon={<Sun size={10} />}>
          {astronomy.civil_dawn && <Prop label="Civil Dawn" value={fmtTime(astronomy.civil_dawn)} />}
          {astronomy.sunrise && <Prop icon={<Sunrise size={11} />} label="Sunrise" value={fmtTime(astronomy.sunrise)} />}
          {astronomy.solar_noon && <Prop label="Solar Noon" value={fmtTime(astronomy.solar_noon)} />}
          {astronomy.sunset && <Prop icon={<Sunset size={11} />} label="Sunset" value={fmtTime(astronomy.sunset)} />}
          {astronomy.civil_dusk && <Prop label="Civil Dusk" value={fmtTime(astronomy.civil_dusk)} />}
          {astronomy.day_length_hours != null && <Prop label="Day Length" value={<AnimNum value={astronomy.day_length_hours} suffix="h" />} />}
          {astronomy.solar_elevation_deg != null && <Prop label="Elevation" value={<AnimNum value={astronomy.solar_elevation_deg} suffix={"\u00B0"} />} />}
          {astronomy.solar_azimuth_deg != null && (
            <Prop label="Azimuth" value={<span><AnimNum value={astronomy.solar_azimuth_deg} suffix={"\u00B0"} /> {degToCompass(astronomy.solar_azimuth_deg)}</span>} />
          )}
          {astronomy.nautical_dawn && astronomy.nautical_dusk && (
            <div className="text-[10px] pt-1" style={{ color: "var(--el-text-faint)" }}>
              Nautical twilight {fmtTime(astronomy.nautical_dawn)} {"\u2013"} {fmtTime(astronomy.nautical_dusk)}
            </div>
          )}
        </CardSection>
      )}

      {/* Moon */}
      {astronomy && astronomy.moon_phase != null && (
        <CardSection title="Moon" icon={<span style={{ fontSize: 10 }}>{astronomy.moon_phase_emoji || "\u{1F315}"}</span>}>
          <div className="flex items-center gap-3 py-1">
            <MoonDisc illuminationPct={astronomy.moon_illumination_pct ?? 50} phaseEmoji={astronomy.moon_phase_emoji ?? undefined} />
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: "var(--el-text)" }}>{astronomy.moon_phase_name}</div>
              {astronomy.moon_illumination_pct != null && (
                <div className="text-[10px]" style={{ color: "var(--el-text-muted)" }}>{astronomy.moon_illumination_pct.toFixed(0)}% illuminated</div>
              )}
              {astronomy.moon_age_days != null && (
                <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>Day {astronomy.moon_age_days.toFixed(1)} of cycle</div>
              )}
            </div>
          </div>
          {astronomy.moonrise && <Prop icon={<Sunrise size={11} />} label="Moonrise" value={fmtTime(astronomy.moonrise)} />}
          {astronomy.moonset && <Prop icon={<Sunset size={11} />} label="Moonset" value={fmtTime(astronomy.moonset)} />}
        </CardSection>
      )}

      {/* Geophysics */}
      {geophysics && (
        <CardSection title="Geophysics" icon={<Magnet size={10} />}>
          <RealtimeChart
            series={[{ label: "Tidal", data: history.geoTidal.map(v => v * 1e6), color: "var(--el-info)" }]}
            unit={"\u00B5m/s\u00B2"} height={48} gridLines={2}
          />
          <svg width="100%" viewBox="0 0 260 70" className="block" style={{ marginTop: 2 }}>
            <ArcGauge cx={43} cy={28} r={18} value={geophysics.gravity_ms2} max={12} color="var(--el-info)" label="Gravity" unit="m/s²" />
            <ArcGauge cx={130} cy={28} r={18} value={geophysics.magnetic_field_ut} max={65} color="var(--el-accent)" label="Mag Field" unit="µT" />
            <ArcGauge cx={217} cy={28} r={18} value={geophysics.rotation_speed_kmh} max={1674} color="var(--el-success)" label="Rotation" unit="km/h" />
          </svg>
          <div className="text-[10px] text-center py-0.5" style={{ color: "var(--el-text-faint)" }}>
            Tidal{" "}
            <span className="tabular-nums font-medium" style={{ color: geophysics.tidal_variation_ms2 >= 0 ? "var(--el-success)" : "var(--el-info)" }}>
              {geophysics.tidal_variation_ms2 >= 0 ? "+" : ""}{(geophysics.tidal_variation_ms2 * 1e6).toFixed(2)} {"\u00B5"}m/s{"\u00B2"}
            </span>
          </div>
          <div className="flex items-start justify-around py-1">
            <AngleDial angle={geophysics.magnetic_inclination_deg} label="Inclination" range={90} color="var(--el-warning)" />
            <AngleDial angle={geophysics.magnetic_declination_deg} label="Declination" range={30} color="var(--el-accent)" />
          </div>
        </CardSection>
      )}

      {/* Atmosphere */}
      {atmosphere && (
        <CardSection title="Atmosphere" icon={<Waves size={10} />}>
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
          <RealtimeChart
            series={[
              { label: "PM2.5", data: history.atmPM25, color: "var(--el-warning)" },
              { label: "PM10", data: history.atmPM10, color: "var(--el-accent)", dashed: true },
            ]}
            unit={"\u00B5g/m\u00B3"} height={56} gridLines={2}
          />
          {(() => {
            const pollutants: { label: string; value: number; max: number; color: string }[] = [];
            if (atmosphere.pm2_5 != null) pollutants.push({ label: "PM2.5", value: atmosphere.pm2_5, max: 75, color: atmosphere.pm2_5 > 25 ? "var(--el-danger)" : "var(--el-success)" });
            if (atmosphere.pm10 != null) pollutants.push({ label: "PM10", value: atmosphere.pm10, max: 150, color: atmosphere.pm10 > 50 ? "var(--el-danger)" : "var(--el-success)" });
            if (atmosphere.ozone != null) pollutants.push({ label: "O\u2083", value: atmosphere.ozone, max: 180, color: "var(--el-info)" });
            if (atmosphere.nitrogen_dioxide != null) pollutants.push({ label: "NO\u2082", value: atmosphere.nitrogen_dioxide, max: 200, color: "var(--el-accent)" });
            if (atmosphere.carbon_monoxide != null) pollutants.push({ label: "CO", value: atmosphere.carbon_monoxide, max: 10000, color: "var(--el-warning)" });
            return pollutants.length > 0 ? <VertBarChart bars={pollutants} /> : null;
          })()}
          <div className="flex items-start justify-around py-2">
            {atmosphere.uv_index != null && (
              <CircleGauge value={atmosphere.uv_index} max={11}
                color={atmosphere.uv_index >= 8 ? "var(--el-danger)" : atmosphere.uv_index >= 6 ? "var(--el-warning)" : "var(--el-success)"}
                label="UV" unit="index" size={50} />
            )}
            {atmosphere.feels_like_c != null && (
              <CircleGauge value={atmosphere.feels_like_c} max={45} color={tempColor(atmosphere.feels_like_c)} label="Feels" unit={"\u00B0C"} size={50} />
            )}
            {atmosphere.dew_point_c != null && (
              <CircleGauge value={atmosphere.dew_point_c} max={30} color="var(--el-info)" label="Dew Pt" unit={"\u00B0C"} size={50} />
            )}
            {atmosphere.air_density_kgm3 != null && (
              <CircleGauge value={atmosphere.air_density_kgm3} max={1.5} color="var(--el-text-muted)" label="Density" unit="kg/m³" size={50} />
            )}
          </div>
        </CardSection>
      )}

      {/* Nearby */}
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
                  {meta && <span className="text-[9px] shrink-0" style={{ color: "var(--el-text-faint)" }}>{meta}</span>}
                </span>
                <span className="text-[10px] shrink-0 ml-2" style={{ color: "var(--el-text-faint)" }}>
                  {conn.distance_km.toFixed(1)} km
                </span>
              </button>
            );
          })}
        </CardSection>
      )}

      <AgentsAtLocation locationId={loc.id} />

      {/* Events placeholder */}
      <CardSection title="Events" icon={<Zap size={10} />} defaultOpen={false}>
        <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
          Location events will appear here as world mechanics develop.
        </div>
      </CardSection>
    </>
  );
}
