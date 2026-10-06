import type { GpsFix, RecordingStats } from "../types/live";
import type { SkiRun } from "../types/trail";
import type { Sample } from "../types/rider";
import { meters } from "./route";
function segmentDistance(
  p: { lat: number; lng: number },
  a: number[],
  b: number[],
) {
  const cos = Math.cos((p.lat * Math.PI) / 180),
    scale = 111320;
  const ax = (a[0] - p.lng) * cos * scale,
    ay = (a[1] - p.lat) * scale,
    bx = (b[0] - p.lng) * cos * scale,
    by = (b[1] - p.lat) * scale;
  const dx = bx - ax,
    dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(ax + t * dx, ay + t * dy);
}
const matchCache = new WeakMap<
  GpsFix,
  {
    trails: SkiRun[];
    result: { trailId: string; distance: number; confidence: number } | null;
  }
>();
export function nearestTrail(fix: GpsFix, trails: SkiRun[]) {
  const cached = matchCache.get(fix);
  if (cached?.trails === trails) return cached.result;
  const result = findNearestTrail(fix, trails);
  matchCache.set(fix, { trails, result });
  return result;
}
function findNearestTrail(fix: GpsFix, trails: SkiRun[]) {
  const ranked = trails
    .map((trail) => {
      const lines =
        trail.geometry.type === "LineString"
          ? [trail.geometry.coordinates]
          : trail.geometry.coordinates;
      const distance = Math.min(
        ...lines.flatMap((line) =>
          line
            .slice(1)
            .map((p, i) =>
              segmentDistance(
                { lat: fix.latitude, lng: fix.longitude },
                line[i],
                p,
              ),
            ),
        ),
      );
      return { trailId: trail.id, distance };
    })
    .sort((a, b) => a.distance - b.distance);
  const first = ranked[0],
    second = ranked[1];
  if (
    !first ||
    fix.accuracy > 40 ||
    first.distance > Math.max(18, Math.min(35, fix.accuracy * 1.2))
  )
    return null;
  if (second && second.distance - first.distance < 7) return null;
  return { ...first, confidence: Math.max(0.3, 1 - first.distance / 50) };
}
export function processGps(fixes: GpsFix[], trails: SkiRun[]): RecordingStats {
  const accepted: GpsFix[] = [],
    samples: Sample[] = [],
    votes = new Map<string, number>();
  let rejected = 0,
    distance = 0,
    elevation = 0,
    pendingBreak = false;
  for (const fix of [...fixes].sort((a, b) => a.seq - b.seq)) {
    pendingBreak ||= Boolean(fix.breakBefore);
    const timestamp = Date.parse(fix.timestamp);
    if (
      !Number.isFinite(timestamp) ||
      !Number.isFinite(fix.latitude) ||
      !Number.isFinite(fix.longitude) ||
      Math.abs(fix.latitude) > 90 ||
      Math.abs(fix.longitude) > 180 ||
      !Number.isFinite(fix.accuracy) ||
      fix.accuracy > 50 ||
      fix.accuracy < 0
    ) {
      rejected++;
      continue;
    }
    const previous = accepted.at(-1),
      last = samples.at(-1);
    const dt = previous
      ? (timestamp - Date.parse(previous.timestamp)) / 1000
      : 0;
    if (previous && dt <= 0) {
      rejected++;
      continue;
    }
    const gap = pendingBreak || dt > 20;
    let delta = previous
      ? meters(
          { lat: previous.latitude, lng: previous.longitude },
          { lat: fix.latitude, lng: fix.longitude },
        )
      : 0;
    if (!gap && dt > 0 && delta / dt > 55) {
      rejected++;
      continue;
    }
    if (
      gap ||
      delta <
        Math.max(
          2,
          Math.min(fix.accuracy, previous?.accuracy ?? fix.accuracy) * 0.25,
        )
    )
      delta = 0;
    distance += delta;
    const known =
      fix.altitude !== null &&
      Number.isFinite(fix.altitude) &&
      fix.altitudeAccuracy !== null &&
      fix.altitudeAccuracy >= 0 &&
      fix.altitudeAccuracy <= 25;
    const oldElevation = elevation;
    if (known)
      elevation =
        last?.elevationKnown && !gap
          ? elevation * 0.7 + fix.altitude! * 0.3
          : fix.altitude!;
    const gradient =
      known && last?.elevationKnown && delta >= 5 && !gap
        ? ((oldElevation - elevation) / delta) * 100
        : 0;
    const speed = dt > 0 && !gap ? (delta / dt) * 3.6 : 0;
    const match = nearestTrail(fix, trails);
    if (match && delta > 0)
      votes.set(match.trailId, (votes.get(match.trailId) || 0) + 1);
    pendingBreak = false;
    accepted.push(fix);
    samples.push({
      time: (timestamp - Date.parse(accepted[0].timestamp)) / 1000,
      lat: fix.latitude,
      lng: fix.longitude,
      elevation: known ? elevation : 0,
      distance,
      speed,
      gradient,
      acceleration: last && dt && !gap ? (speed - last.speed) / 3.6 / dt : 0,
      section: 0,
      elevationKnown: known,
      accuracy: fix.accuracy,
      timestamp: fix.timestamp,
      breakBefore: gap,
    });
  }
  const sorted = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  const winner = sorted[0];
  const matched =
    winner &&
    winner[1] >= 3 &&
    distance >= 30 &&
    winner[1] / Math.max(1, samples.filter((p) => p.speed > 0).length) >= 0.6
      ? winner[0]
      : null;
  return {
    samples,
    accepted,
    rejected,
    matchedTrailId: matched,
    confidence: matched
      ? winner[1] / Math.max(1, samples.filter((p) => p.speed > 0).length)
      : 0,
  };
}
