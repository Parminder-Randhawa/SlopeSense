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
      surface: "unknown",
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
