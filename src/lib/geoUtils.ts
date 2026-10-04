import type { LngLatBoundsLike } from "maplibre-gl";
import type { RoutePoint, SkiRun } from "../types/trail";

type Position = [number, number] | number[];

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

export function isUsableGeometry(
  geometry: unknown,
): geometry is SkiRun["geometry"] {
  if (!geometry || typeof geometry !== "object" || !("type" in geometry))
    return false;
  if (!("coordinates" in geometry)) return false;

  const candidate = geometry as SkiRun["geometry"];
  if (candidate.type === "LineString") {
    return (
      candidate.coordinates.length >= 2 &&
      candidate.coordinates.every(isPosition)
    );
  }

  if (candidate.type === "MultiLineString") {
    return (
      candidate.coordinates.length > 0 &&
      candidate.coordinates.every(
        (line) => line.length >= 2 && line.every(isPosition),
      )
    );
  }

  return false;
}

export function getRoutePoints(trail: SkiRun): RoutePoint[] {
  const lines =
    trail.geometry.type === "LineString"
      ? [trail.geometry.coordinates]
      : trail.geometry.coordinates;

  return lines.flatMap((line) => line.map(([lng, lat]) => ({ lat, lng })));
}

export function getTrailBounds(trail: SkiRun): LngLatBoundsLike | null {
  const points = getRoutePoints(trail);
  if (points.length === 0) return null;

  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;

  points.forEach(({ lat, lng }) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function formatDistance(meters?: number): string | null {
  if (!meters || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
}
