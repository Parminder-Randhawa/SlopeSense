import type { GeoJSON } from "geojson";
import type { ResortId } from "./resort";

export type Difficulty =
  "green" | "blue" | "black" | "double-black" | "unknown";

export type Grooming = "groomed" | "moguls" | "backcountry" | "unknown";

export type SkiRun = {
  id: string;
  name: string;
  resortId: ResortId;
  difficulty: Difficulty;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  lengthMeters?: number;
  verticalMeters?: number;
  grooming?: Grooming;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type RoutePoint = {
  lat: number;
  lng: number;
};
