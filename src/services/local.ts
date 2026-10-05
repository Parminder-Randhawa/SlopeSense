import { demoProfile, seedActivities } from "../data/demo";
import type { Activity, Profile } from "../types/rider";
import type { GpsFix } from "../types/live";
export type Draft = {
  id: string;
  startedAt: string;
  sport: Profile["sport"];
  trailId: string | null;
  mode: "auto" | "manual";
  simulated: boolean;
  fixes: GpsFix[];
  elapsedMs: number;
  activeSince: number | null;
  demoCursor: number;
};
export const defaultProfile: Profile = {
  name: "Rider",
  sport: "snowboard",
  experience: "beginner",
  ceiling: "green",
  preferences: [],
  goal: "explore",
};
let connection: Promise<IDBDatabase> | undefined;
function db() {
  return (connection ??= new Promise((resolve, reject) => {
    const r = indexedDB.open("slopesense-local", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("activities", { keyPath: "id" });
      r.result.createObjectStore("drafts");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(new Error("Close other SlopeSense tabs and reload."));
  }));
}
async function read<T>(store: string, key?: string): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readonly");
    const s = tx.objectStore(store),
      r = key ? s.get(key) : s.getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export const loadActivities = () => read<Activity[]>("activities");
export const loadDraft = () => read<Draft | undefined>("drafts", "active");
export async function writeDraft(draft: Draft | null) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction("drafts", "readwrite");
    if (draft) tx.objectStore("drafts").put(draft, "active");
    else tx.objectStore("drafts").delete("active");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function saveActivity(activity: Activity, finish = false) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(["activities", "drafts"], "readwrite");
    tx.objectStore("activities").put(activity);
    if (finish) tx.objectStore("drafts").delete("active");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export type Preferences = {
  profile: Profile;
  demo: boolean;
  liveProfile: Profile;
  demoProfile: Profile;
};
function validProfile(p: any): p is Profile {
  return (
    p &&
    typeof p.name === "string" &&
    ["ski", "snowboard"].includes(p.sport) &&
    ["beginner", "intermediate", "advanced", "expert"].includes(p.experience) &&
    ["green", "blue", "black", "double-black"].includes(p.ceiling) &&
    ["relax", "explore", "improve", "challenge"].includes(p.goal) &&
    Array.isArray(p.preferences)
  );
}
export function loadPreferences(): Preferences {
  let raw: any;
  try {
    raw = JSON.parse(
      localStorage.getItem("slopesense:preferences:v3") || "null",
    );
  } catch {}
  const liveProfile = validProfile(raw?.liveProfile)
    ? raw.liveProfile
    : !raw?.demo && validProfile(raw?.profile)
      ? raw.profile
      : structuredClone(defaultProfile);
  const sampleProfile = validProfile(raw?.demoProfile)
    ? raw.demoProfile
    : structuredClone(demoProfile);
  const demo = raw?.demo === true;
  return {
    profile: demo ? sampleProfile : liveProfile,
    demo,
    liveProfile,
    demoProfile: sampleProfile,
  };
}
export function savePreferences(preferences: Preferences) {
  localStorage.setItem(
    "slopesense:preferences:v3",
    JSON.stringify(preferences),
  );
}
export async function ensureDemoActivities() {
  const list = await loadActivities();
  const missing = seedActivities().filter(
    (a) => !list.some((x) => x.id === a.id),
  );
  for (const a of missing)
    await saveActivity({ ...a, sport: "snowboard", selectionMode: "manual" });
  return loadActivities();
}
export function download(
  name: string,
  contents: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([contents], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportGpx(a: Activity) {
  const name = a.simulated ? "SlopeSense demo" : "SlopeSense activity";
  let segments = "<trkseg>";
  a.telemetry.forEach((p, i) => {
    if (i && p.breakBefore) segments += "</trkseg><trkseg>";
    segments += `<trkpt lat="${p.lat}" lon="${p.lng}">${p.elevationKnown === false ? "" : `<ele>${p.elevation}</ele>`}<time>${p.timestamp || new Date(Date.parse(a.date) + p.time * 1000).toISOString()}</time></trkpt>`;
  });
  segments += "</trkseg>";
  download(
    `slopesense-${a.id}.gpx`,
    `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SlopeSense" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name>${segments}</trk></gpx>`,
    "application/gpx+xml",
  );
}
