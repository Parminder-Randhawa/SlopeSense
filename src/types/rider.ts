import type { Difficulty } from "./trail";
import type { ResortId } from "./resort";

export type Ceiling = Exclude<Difficulty, "unknown">;
export type Preference =
  | "groomed"
  | "long"
  | "short"
  | "gentle"
  | "steep"
  | "trees"
  | "open"
  | "park"
  | "avoid-firm"
  | "avoid-visibility";
export type Goal = "relax" | "explore" | "improve" | "challenge";
export type Profile = {
  name: string;
  sport: "snowboard" | "ski";
  experience: "beginner" | "intermediate" | "advanced" | "expert";
  ceiling: Ceiling;
  preferences: Preference[];
  goal: Goal;
};
export type Persona = "smooth" | "developing" | "cautious";
export type Feeling = "easy" | "right" | "hard" | "unreported";
export type Surface = "soft" | "normal" | "firm" | "variable" | "unknown";
export type Sample = {
  time: number;
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
  speed: number;
  gradient: number;
  acceleration: number;
  section: number;
  elevationKnown?: boolean;
  accuracy?: number;
  timestamp?: string;
  breakBefore?: boolean;
};
export type TelemetryEvent = {
  time: number;
  type: "stop" | "accelerate" | "slowdown" | "gradient";
  title: string;
  detail: string;
};
export type Analysis = {
  elevationAvailable?: boolean;
  duration: number;
  distance: number;
  vertical: number;
  averageSpeed: number;
  movingAverage: number;
  maxSpeed: number;
  stops: number;
  stopSeconds: number;
  longestStop: number;
  consistency: number;
  speedCV: number;
  events: TelemetryEvent[];
  observations: string[];
  sections: {
    label: string;
    averageSpeed: number;
    gradient: number;
    stops: number;
  }[];
};
export type Activity = {
  id: string;
  trailId: string;
  resortId: ResortId | null;
  date: string;
  persona: Persona | "recorded";
  feeling: Feeling;
  surface: Surface;
  telemetry: Sample[];
  simulated: boolean;
  sport?: Profile["sport"];
  selectionMode?: "auto" | "manual";
  matchingConfidence?: number;
};
export type Dimension =
  | "difficulty"
  | "groomed"
  | "steep"
  | "long"
  | "firm"
  | "ungroomed"
  | "consistency";
export type Evidence = { count: number; value: number; label: string };
export type RiderModel = Record<Dimension, Evidence>;
export type Conditions = {
  temperature: number | null;
  snowfall: number | null;
  wind: number | null;
  visibility: "good" | "mixed" | "low" | "unknown";
  daytimeHigh: number | null;
  overnightLow: number | null;
  description: string;
  simulated: boolean;
};
export type AppState = {
  version: 2;
  onboarded: boolean;
  profile: Profile;
  activities: Activity[];
};
