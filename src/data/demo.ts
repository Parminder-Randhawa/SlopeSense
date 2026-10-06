import { trailsByResort } from "./trails";
import { simulateRun } from "../engine/telemetry";
import type { Activity, AppState, Persona, Profile } from "../types/rider";

export const allTrails = Object.values(trailsByResort).flat();
export const demoProfile: Profile = {
  name: "Alex",
  sport: "snowboard",
  experience: "intermediate",
  ceiling: "blue",
  preferences: ["groomed", "long", "avoid-firm"],
  goal: "improve",
};
export function seedActivities(): Activity[] {
  const entries: [string, string, Persona][] = [
    ["cypress-crazy-raven", "2026-01-04T10:10:00", "cautious"],
    ["grouse-paradise", "2026-01-06T11:30:00", "developing"],
    ["seymour-manning", "2026-01-08T10:00:00", "developing"],
    ["cypress-crazy-raven", "2026-01-10T10:10:00", "developing"],
    ["cypress-panorama", "2026-01-13T10:00:00", "smooth"],
    ["cypress-crazy-raven", "2026-01-13T11:10:00", "smooth"],
    ["grouse-teddy-bear-lane", "2025-11-30T10:30:00", "cautious"],
    ["grouse-paradise", "2025-12-06T11:15:00", "cautious"],
    ["cypress-windjammer", "2025-12-13T09:40:00", "developing"],
    ["cypress-panorama", "2025-12-13T10:45:00", "developing"],
    ["seymour-goldie-meadows", "2025-12-20T10:00:00", "cautious"],
    ["seymour-manning", "2025-12-20T11:20:00", "developing"],
    ["grouse-the-cut", "2025-12-27T10:15:00", "developing"],
    ["cypress-horizon", "2026-01-02T10:00:00", "developing"],
    ["grouse-paradise", "2026-01-11T09:30:00", "smooth"],
    ["grouse-the-cut", "2026-01-11T11:00:00", "smooth"],
    ["seymour-manning", "2026-01-15T09:45:00", "smooth"],
    ["seymour-northlands", "2026-01-15T11:15:00", "smooth"],
  ];
  return entries.map(([trailId, date, persona], i) => {
    const trail = allTrails.find((t) => t.id === trailId)!;
    return {
      id: `seed-${i}`,
      trailId,
      resortId: trail.resortId,
      date,
      persona,
      feeling: persona === "smooth" ? "easy" : "right",
      surface:
        i < 6
          ? "unknown"
          : i % 4 === 0
            ? "variable"
            : i % 3 === 0
              ? "soft"
              : "normal",
      telemetry: simulateRun(trail, persona),
      simulated: true,
    };
  });
}
export function initialState(): AppState {
  return {
    version: 2,
    onboarded: false,
    profile: { ...demoProfile, preferences: [...demoProfile.preferences] },
    activities: seedActivities(),
  };
}
