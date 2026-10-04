import type { SkiRun } from "../types/trail";
import type { Activity, Conditions, Profile } from "../types/rider";
import type { ResortId } from "../types/resort";
import { analyze } from "./telemetry";
import { buildRiderModel } from "./riderModel";
import { firmRisk } from "../data/conditions";

export const difficultyLevel = {
  green: 1,
  blue: 2,
  black: 3,
  "double-black": 4,
  unknown: 99,
};
export const weights = {
  ability: 30,
  terrain: 15,
  conditions: 20,
  progression: 25,
  evidence: 10,
};
export type Fit = {
  trail: SkiRun;
  score: number;
  parts: Record<keyof typeof weights, number>;
  reasons: string[];
  uncertainty: string[];
  recentlyRidden: boolean;
};
const clamp = (v: number) => Math.max(0, Math.min(100, v));
export function eligible(trail: SkiRun, profile: Profile) {
  return (
    difficultyLevel[trail.difficulty] <= difficultyLevel[profile.ceiling] &&
    trail.grooming !== "backcountry" &&
    trail.metadata?.closed !== true
  );
}
export function rankTrails(
  trails: SkiRun[],
  profile: Profile,
  activities: Activity[],
  weather: Record<ResortId, Conditions>,
): Fit[] {
  const model = buildRiderModel(activities, trails);
  const ability = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }[
    profile.experience
  ];
  const targetLevel = Math.min(ability, difficultyLevel[profile.ceiling]);
  const recent = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const lastComparable = recent.find((a) => {
    const t = trails.find((t) => t.id === a.trailId);
    return t && difficultyLevel[t.difficulty] === targetLevel;
  });
  const lastAnalysis = lastComparable
    ? analyze(lastComparable.telemetry)
    : null;
  const ready =
    lastComparable?.feeling !== "hard" && (lastAnalysis?.consistency ?? 0) > 65;
  const multiplier =
    profile.goal === "relax"
      ? 0.85
      : profile.goal === "challenge" && ready
        ? 1.6
        : profile.goal === "improve" && ready
          ? 1.4
          : 1;
  const targetLength = (lastAnalysis?.distance || 700) * multiplier;
  return trails
    .filter((t) => eligible(t, profile))
    .map((trail) => {
      const c = weather[trail.resortId],
        level = difficultyLevel[trail.difficulty];
      const reasons = [
        `Within your ${profile.ceiling.replace("-", " ")} terrain ceiling.`,
      ];
      const uncertainty = [
        "Opening status is unverified; check resort notices.",
      ];
      const matches: number[] = [];
      if (profile.preferences.includes("long"))
        matches.push(clamp(45 + (trail.lengthMeters ?? 500) / 24));
      if (profile.preferences.includes("short"))
        matches.push(clamp(100 - (trail.lengthMeters ?? 700) / 25));
      if (profile.preferences.includes("groomed")) {
        matches.push(
          trail.grooming === "groomed"
            ? 95
            : trail.grooming === "moguls"
              ? 20
              : 55,
        );
      }
      if (profile.preferences.includes("gentle"))
        matches.push(level === 1 ? 95 : level === 2 ? 75 : 30);
      if (profile.preferences.includes("steep"))
        matches.push(level >= 3 ? 90 : 60);
      if (profile.preferences.some((p) => ["gentle", "steep"].includes(p)))
        uncertainty.push(
          "Gentle and steep preferences use mapped difficulty as a rough proxy; surveyed pitch is unknown.",
        );
      if (
        profile.preferences.some((p) => ["trees", "open", "park"].includes(p))
      )
        uncertainty.push(
          "Tree, open-terrain and park preferences are saved; this dataset cannot score them.",
        );
      if (trail.grooming === "unknown" || !trail.grooming)
        uncertainty.push(
          "Grooming is unknown; no groomed-terrain bonus applied.",
        );
      else if (trail.grooming === "groomed")
        reasons.push(
          "Mapped as groomed in OpenStreetMap; daily grooming is unverified.",
        );
      const terrain = matches.length
        ? matches.reduce((s, n) => s + n, 0) / matches.length
        : 65;
      let conditionScore =
        78 + Math.min(c.snowfall, 20) * 0.65 - Math.max(0, c.wind - 15) * 0.5;
      conditionScore -=
        c.visibility === "low" ? 17 : c.visibility === "mixed" ? 6 : 0;
      if (firmRisk(c))
        conditionScore -= profile.preferences.includes("avoid-firm") ? 19 : 7;
      if (
        profile.preferences.includes("avoid-visibility") &&
        c.visibility !== "good"
      )
        conditionScore -= 10;
      if (!firmRisk(c))
        reasons.push("No freeze–thaw flag in the simulated weather scenario.");
      else
        uncertainty.push(
          "Estimated firm-surface risk from simulated thaw/freeze; actual surface unknown.",
        );
      const progression = clamp(
        100 -
          (Math.abs((trail.lengthMeters ?? targetLength) - targetLength) /
            Math.max(targetLength, 1)) *
            110,
      );
      if (
        lastAnalysis &&
        (trail.lengthMeters ?? 0) > lastAnalysis.distance &&
        progression > 60
      )
        reasons.push(
          `A longer ${trail.difficulty} route than your last comparable run, aligned with your ${profile.goal} goal.`,
        );
      if (
        profile.preferences.includes("long") &&
        (trail.lengthMeters ?? 0) > 1000
      )
        reasons.push(
          "Its mapped length matches your preference for longer runs.",
        );
      const parts = {
        ability: clamp(98 - Math.abs(level - targetLevel) * 23),
        terrain: Math.round(terrain),
        conditions: Math.round(clamp(conditionScore)),
        progression: Math.round(progression),
        evidence: Math.round(
          model.difficulty.count >= 3 ? model.difficulty.value : 60,
        ),
      };
      const recentlyRidden = recent[0]?.trailId === trail.id;
      const recencyPenalty = recentlyRidden
        ? 15
        : recent.slice(1, 3).some((a) => a.trailId === trail.id)
          ? 5
          : 0;
      const score = Math.round(
        clamp(
          Object.entries(parts).reduce(
            (s, [key, val]) =>
              s + (val * weights[key as keyof typeof weights]) / 100,
            0,
          ) - recencyPenalty,
        ),
      );
      if (recentlyRidden)
        reasons.push(
          "Variety adjustment: −15 because this was your most recent run.",
        );
      return { trail, score, parts, reasons, uncertainty, recentlyRidden };
    })
    .sort((a, b) => b.score - a.score || a.trail.id.localeCompare(b.trail.id));
}
export function rankMountains(fits: Fit[]) {
  return (["cypress", "seymour", "grouse"] as ResortId[])
    .map((id) => {
      const options = fits.filter((f) => f.trail.resortId === id);
      const top = options.slice(0, 3);
      const quality = top.length
        ? top.reduce((s, f) => s + f.score, 0) / top.length
        : 0;
      const breadth = Math.min(options.length / 8, 1) * 100;
      return {
        id,
        score: options.length
          ? Math.round(options[0].score * 0.55 + quality * 0.35 + breadth * 0.1)
          : 0,
        suitable: options.length,
        top: options[0],
        reason: options.length
          ? `${options.length} mapped runs fit your ceiling. ${options[0].trail.name} leads on terrain, winter-scenario conditions and your recent activity.`
          : "No mapped runs meet your selected terrain ceiling.",
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
