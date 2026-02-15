/**
 * Shared map constants and lookup tables used by both Map2D and Map3D
 * via the useEarthMap hook.
 */

// Default view — will be overridden once locations are loaded
export const DEFAULT_CENTER: [number, number] = [0, 20];

// OpenFreeMap style (free, no key needed)
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Module-level location coordinate lookup.
 * Built once when locations GeoJSON is loaded, used to plot agents.
 */
export const locationLookup = new Map<number, [number, number]>();

/**
 * Module-level location name lookup.
 * Built alongside locationLookup so agent features can include location names.
 */
export const locationNameLookup = new Map<number, string>();

/**
 * Call this after loading the locations GeoJSON to populate the lookups.
 */
export function buildLocationLookup(geojson: GeoJSON.FeatureCollection): void {
  locationLookup.clear();
  locationNameLookup.clear();
  for (const feat of geojson.features) {
    if (feat.geometry.type === "Point" && feat.properties?.id != null) {
      locationLookup.set(
        Number(feat.properties.id),
        feat.geometry.coordinates as [number, number],
      );
      if (feat.properties.name) {
        locationNameLookup.set(Number(feat.properties.id), String(feat.properties.name));
      }
    }
  }
}
