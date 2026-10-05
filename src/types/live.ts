import type { Sample } from "./rider";
export type GpsFix = {
  seq: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  speed: number | null;
  heading: number | null;
  breakBefore?: boolean;
};
export type LiveWeather = {
  snowing: boolean;
  temperature: number | null;
  snowfall: number | null;
  wind: number | null;
  visibility: "good" | "mixed" | "low" | "unknown";
  daytimeHigh: number | null;
  overnightLow: number | null;
  description: string;
  simulated: boolean;
  available: boolean;
  stale: boolean;
  observedAt: string | null;
  fetchedAt: string | null;
  source: string;
  sourceUrl: string;
  modelled: boolean;
};
export type RecordingStats = {
  samples: Sample[];
  accepted: GpsFix[];
  rejected: number;
  matchedTrailId: string | null;
  confidence: number;
};
