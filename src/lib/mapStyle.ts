import type { StyleSpecification } from "maplibre-gl";
import dark from "../data/basemap-dark.json";
/** Bundled style allows local trail overlays to load even if map detail is unavailable. */
export function mapStyle(): StyleSpecification {
  return structuredClone(dark) as StyleSpecification;
}
