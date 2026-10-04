import type { AppState } from "../types/rider";
import { initialState } from "../data/demo";
export const STORAGE_KEY = "slopesense:v2";
export function readState(): { state: AppState; warning: string | null } {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return { state: initialState(), warning: null };
    const s = JSON.parse(text);
    const valid =
      s?.version === 2 &&
      typeof s.onboarded === "boolean" &&
      typeof s.profile?.name === "string" &&
      ["ski", "snowboard"].includes(s.profile.sport) &&
      ["beginner", "intermediate", "advanced", "expert"].includes(
        s.profile.experience,
      ) &&
      ["green", "blue", "black", "double-black"].includes(s.profile.ceiling) &&
      ["relax", "explore", "improve", "challenge"].includes(s.profile.goal) &&
      Array.isArray(s.profile.preferences) &&
      s.profile.preferences.every((p: unknown) =>
        [
          "groomed",
          "long",
          "short",
          "gentle",
          "steep",
          "trees",
          "open",
          "park",
          "avoid-firm",
          "avoid-visibility",
        ].includes(String(p)),
      ) &&
      Array.isArray(s.activities) &&
      s.activities.length <= 100;
    if (!valid) throw Error("Invalid save");
    for (const a of s.activities) {
      if (
        typeof a.id !== "string" ||
        typeof a.trailId !== "string" ||
        !["cypress", "seymour", "grouse"].includes(a.resortId) ||
        typeof a.date !== "string" ||
        !Number.isFinite(Date.parse(a.date)) ||
        !["smooth", "developing", "cautious"].includes(a.persona) ||
        !["easy", "right", "hard"].includes(a.feeling) ||
        !["soft", "normal", "firm", "variable", "unknown"].includes(
          a.surface,
        ) ||
        a.simulated !== true ||
        !Array.isArray(a.telemetry) ||
        a.telemetry.length < 2 ||
        a.telemetry.length > 3600
      )
        throw Error("Invalid activity");
      for (let i = 0; i < a.telemetry.length; i++) {
        const p = a.telemetry[i];
        if (
          ![
            "time",
            "lat",
            "lng",
            "elevation",
            "distance",
            "speed",
            "gradient",
            "acceleration",
            "section",
          ].every((k) => typeof p[k] === "number" && Number.isFinite(p[k])) ||
          p.speed < 0 ||
          p.distance < 0 ||
          ![0, 1, 2].includes(p.section) ||
          (i > 0 &&
            (p.time <= a.telemetry[i - 1].time ||
              p.distance < a.telemetry[i - 1].distance))
        )
          throw Error("Invalid telemetry");
      }
    }
    return { state: s, warning: null };
  } catch {
    return {
      state: initialState(),
      warning:
        "Saved data could not be read. A fresh local demo has been loaded.",
    };
  }
}
export function saveState(state: AppState): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return "Browser storage is unavailable or full. Your session still works, but changes may not survive a reload.";
  }
}
