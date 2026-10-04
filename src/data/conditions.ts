import type { Conditions } from "../types/rider";
import type { ResortId } from "../types/resort";

// A reproducible winter scenario, NOT archived weather observations or current conditions.
export const DEMO_DATE = "2026-01-17";
export const conditions: Record<ResortId, Conditions> = {
  cypress: {
    temperature: -4,
    snowfall: 18,
    wind: 12,
    visibility: "good",
    daytimeHigh: -1,
    overnightLow: -6,
    description: "Fresh snow · clear breaks",
    simulated: true,
  },
  seymour: {
    temperature: -2,
    snowfall: 12,
    wind: 18,
    visibility: "mixed",
    daytimeHigh: 1,
    overnightLow: -4,
    description: "Light snow · passing cloud",
    simulated: true,
  },
  grouse: {
    temperature: -1,
    snowfall: 7,
    wind: 25,
    visibility: "low",
    daytimeHigh: 3,
    overnightLow: -3,
    description: "Cloudy · reduced visibility",
    simulated: true,
  },
};
export function firmRisk(c: Conditions) {
  return c.daytimeHigh > 0 && c.overnightLow < 0;
}
