import type { Activity, Profile } from "../types/rider";
import type { SkiRun } from "../types/trail";
import { analyze } from "./telemetry";
import { nearestTrail } from "./gps";
import { eligible } from "./recommendations";
const levels = [
  { xp: 0, name: "First tracks" },
  { xp: 300, name: "Finding flow" },
  { xp: 700, name: "Trail regular" },
  { xp: 1200, name: "Mountain explorer" },
  { xp: 2400, name: "Season regular" },
  { xp: 4000, name: "All-season rider" },
  { xp: 6500, name: "North Shore explorer" },
];
/** Experience rewards are game progress, never a validated skill assessment.
 * Completed accepted tracks count; speed and harder terrain earn no bonus. */
export function ridingProgress(
  activities: Activity[],
  trails: SkiRun[],
  profile: Profile,
) {
  const seen = new Set<string>();
  const completed = activities.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    const trail = trails.find((t) => t.id === a.trailId);
    if (!trail || !eligible(trail, { ...profile, ceiling: "double-black" }))
      return false;
    if (!a.simulated) {
      if ((a.matchingConfidence ?? 0) < 0.5) return false;
      const moving = a.telemetry.filter((p) => p.speed > 1);
      const onRoute = moving.filter((p) =>
        nearestTrail(
          {
            seq: 0,
            timestamp: p.timestamp || a.date,
            latitude: p.lat,
            longitude: p.lng,
            accuracy: p.accuracy ?? 25,
            altitude: null,
            altitudeAccuracy: null,
            speed: null,
            heading: null,
          },
          [trail],
        ),
      );
      if (!moving.length || onRoute.length / moving.length < 0.5) return false;
    }
    const stats = analyze(a.telemetry);
    return stats.distance >= 150 && stats.duration >= 30;
  });
  const routes = new Set(completed.map((a) => a.trailId));
  const xp = completed.length * 100 + routes.size * 50;
  const index = Math.max(
    0,
    levels.filter((level) => xp >= level.xp).length - 1,
  );
  const level = levels[index],
    next = levels[index + 1];
  return {
    xp,
    level: index + 1,
    name: level.name,
    next,
    fraction: next ? (xp - level.xp) / (next.xp - level.xp) : 1,
    completed: completed.length,
    unique: routes.size,
    nextRuns: trails
      .filter(
        (t) =>
          eligible(t, profile) &&
          !routes.has(t.id) &&
          (t.lengthMeters || 0) >= 150,
      )
      .slice(0, 3),
    badges: [
      { name: "First ride", goal: 1, count: completed.length },
      { name: "Three lines", goal: 3, count: routes.size },
      { name: "Trail regular", goal: 10, count: completed.length },
    ],
  };
}
