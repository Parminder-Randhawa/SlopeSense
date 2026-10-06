import type { SkiRun } from "../types/trail";
export type Point = { lng: number; lat: number };
export function meters(a: Point, b: Point) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r,
    dLng = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function length(points: Point[]) {
  return points.slice(1).reduce((sum, p, i) => sum + meters(points[i], p), 0);
}

// Join only shared endpoints. Never animate a jump between disjoint OSM ways.
// Without elevation observations, source direction is retained and is not navigation guidance.
export function routeFor(trail: SkiRun) {
  const lines = (
    trail.geometry.type === "LineString"
      ? [trail.geometry.coordinates]
      : trail.geometry.coordinates
  ).map((line) => line.map(([lng, lat]) => ({ lng, lat })));
  const chains: Point[][] = [];
  while (lines.length) {
    let chain = lines.shift()!;
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < lines.length; i++) {
        const candidate = lines[i];
        if (meters(chain.at(-1)!, candidate[0]) < 3)
          chain = [...chain, ...candidate.slice(1)];
        else if (meters(chain.at(-1)!, candidate.at(-1)!) < 3)
          chain = [...chain, ...candidate.slice(0, -1).reverse()];
        else if (meters(chain[0], candidate.at(-1)!) < 3)
          chain = [...candidate.slice(0, -1), ...chain];
        else if (meters(chain[0], candidate[0]) < 3)
          chain = [...candidate.slice(1).reverse(), ...chain];
        else continue;
        lines.splice(i, 1);
        changed = true;
        break;
      }
    }
    chains.push(chain);
  }
  const points = chains.sort((a, b) => length(b) - length(a))[0];
  const cumulative = [0];
  points
    .slice(1)
    .forEach((p, i) => cumulative.push(cumulative[i] + meters(points[i], p)));
  return {
    points,
    chains,
    cumulative,
    length: cumulative.at(-1)!,
    partial: chains.length > 1,
  };
}
export function pointAt(
  route: ReturnType<typeof routeFor>,
  distance: number,
): Point {
  const d = Math.max(0, Math.min(distance, route.length));
  const i = Math.max(
    1,
    route.cumulative.findIndex((x) => x >= d),
  );
  const prev = route.points[i - 1],
    next = route.points[i];
  const ratio =
    (d - route.cumulative[i - 1]) /
    (route.cumulative[i] - route.cumulative[i - 1] || 1);
  return {
    lng: prev.lng + (next.lng - prev.lng) * ratio,
    lat: prev.lat + (next.lat - prev.lat) * ratio,
  };
}
