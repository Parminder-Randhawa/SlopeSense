import type { FeatureCollection, LineString, Polygon } from "geojson";
import type { ResortId } from "../types/resort";
export type ContextKind =
  "connector" | "lift" | "water" | "stream" | "building" | "wood" | "path";
export type MapContext = FeatureCollection<
  LineString | Polygon,
  { kind: ContextKind; name: string; osmWayId: string }
>;
export const emptyContext: MapContext = {
  type: "FeatureCollection",
  features: [],
};
const sources = {
  cypress: () => import("./cypress-context.geojson?raw"),
  grouse: () => import("./grouse-context.geojson?raw"),
  seymour: () => import("./seymour-context.geojson?raw"),
};
const cache = new Map<ResortId, Promise<MapContext>>();
export function loadMapContext(id: ResortId) {
  let value = cache.get(id);
  if (!value) {
    value = sources[id]().then(
      (module) => JSON.parse(module.default) as MapContext,
    );
    cache.set(id, value);
  }
  return value;
}
