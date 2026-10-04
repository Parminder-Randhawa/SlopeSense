import type { Activity, Dimension, Evidence, RiderModel } from "../types/rider";
import type { SkiRun } from "../types/trail";
import { analyze } from "./telemetry";

export const dimensionNames: Record<Dimension, string> = {
  difficulty: "Difficulty comfort",
  groomed: "Groomed terrain",
  steep: "Steeper sections",
  long: "Long runs",
  firm: "Firm conditions",
  ungroomed: "Ungroomed terrain",
  consistency: "Pace consistency",
};
export function buildRiderModel(
  activities: Activity[],
  trails: SkiRun[],
): RiderModel {
  const buckets = Object.fromEntries(
    Object.keys(dimensionNames).map((key) => [key, [] as number[]]),
  ) as Record<Dimension, number[]>;
  activities.forEach((activity) => {
    const trail = trails.find((t) => t.id === activity.trailId);
    if (!trail || activity.telemetry.length < 2) return;
    const a = analyze(activity.telemetry);
    // Speed magnitude is deliberately absent. Feedback contributes only 20%.
    const objective = Math.max(
      0,
      a.consistency * 0.75 + (1 - a.stopSeconds / Math.max(a.duration, 1)) * 25,
    );
    const evidence =
      objective * 0.8 +
      { easy: 95, right: 75, hard: 35 }[activity.feeling] * 0.2;
    buckets.difficulty.push(evidence);
    buckets.consistency.push(a.consistency);
    if (trail.grooming === "groomed") buckets.groomed.push(evidence);
    if (trail.grooming === "moguls") buckets.ungroomed.push(evidence);
    if (a.distance >= 1000) buckets.long.push(evidence);
    // Demo pitch supports only a demo model; all activity and model UI is labelled synthetic.
    if (
      activity.telemetry.filter((p) => p.gradient >= 20 && p.speed > 1)
        .length >= 10
    ) {
      const mid = a.sections[1];
      const stopPenalty = mid.stops * 7;
      buckets.steep.push(Math.max(0, evidence - stopPenalty));
    }
    // Weather NEVER establishes the surface of a specific trail.
    if (activity.surface === "firm") buckets.firm.push(evidence);
  });
  return Object.fromEntries(
    Object.entries(buckets).map(([key, values]) => {
      const value = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;
      const label =
        values.length === 0
          ? "Not enough data yet"
          : values.length < 3
            ? "Limited data"
            : value >= 84
              ? "Strong evidence"
              : value >= 70
                ? "Comfortable"
                : "Developing";
      return [key, { count: values.length, value, label } satisfies Evidence];
    }),
  ) as RiderModel;
}
