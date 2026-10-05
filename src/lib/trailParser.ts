import { routeFor } from "../engine/route";
import type { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import { isDifficulty } from "./difficulty";
import { isUsableGeometry } from "./geoUtils";
import type { ResortId } from "../types/resort";
import type { Grooming, SkiRun } from "../types/trail";

const GROOMING_VALUES: Grooming[] = [
  "groomed",
  "moguls",
  "backcountry",
  "unknown",
];

function warn(message: string) {
  if (import.meta.env.DEV) console.warn(`[SlopeSense data] ${message}`);
}

function isGrooming(value: unknown): value is Grooming {
  return (
    typeof value === "string" && GROOMING_VALUES.includes(value as Grooming)
  );
}

export function parseTrailData(
  raw: unknown,
  expectedResortId: ResortId,
): SkiRun[] {
  if (!raw || typeof raw !== "object" || !("features" in raw)) {
    warn(`${expectedResortId}: invalid FeatureCollection`);
    return [];
  }

  const seen = new Set<string>();
  const features = (raw as FeatureCollection).features ?? [];

  return features.flatMap((feature, index): SkiRun[] => {
    const properties = feature.properties as GeoJsonProperties;
    const label = `${expectedResortId} feature ${index + 1}`;

    if (!properties || typeof properties !== "object") {
      warn(`${label}: missing properties`);
      return [];
    }

    const {
      id,
      name,
      resortId,
      difficulty,
      lengthMeters,
      verticalMeters,
      grooming,
    } = properties;

    if (typeof id !== "string" || !id.trim()) {
      warn(`${label}: missing id`);
      return [];
    }
    if (seen.has(id)) {
      warn(`${label}: duplicate id '${id}' ignored`);
      return [];
    }
    if (typeof name !== "string" || !name.trim()) {
      warn(`${label}: unnamed trail ignored`);
      return [];
    }
    if (resortId !== expectedResortId) {
      warn(`${label}: resortId '${String(resortId)}' does not match`);
      return [];
    }
    if (!isDifficulty(difficulty)) {
      warn(`${label}: invalid normalized difficulty`);
      return [];
    }
    if (!isUsableGeometry(feature.geometry)) {
      warn(`${label}: broken or unsupported geometry ignored`);
      return [];
    }

    seen.add(id);
    return [
      {
        id,
        name,
        resortId,
        difficulty,
        geometry: feature.geometry,
        lengthMeters:
          typeof lengthMeters === "number" && lengthMeters > 0
            ? lengthMeters
            : undefined,
        verticalMeters:
          typeof verticalMeters === "number" && verticalMeters > 0
            ? verticalMeters
            : undefined,
        grooming: isGrooming(grooming) ? grooming : undefined,
        source:
          typeof properties.source === "string" ? properties.source : undefined,
        metadata:
          properties.metadata && typeof properties.metadata === "object"
            ? (properties.metadata as Record<string, unknown>)
            : undefined,
      },
    ];
  });
}

export function trailsToFeatureCollection(trails: SkiRun[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: trails.map((trail): Feature => ({
      type: "Feature",
      id: trail.id,
      geometry: {
        type: "MultiLineString",
        coordinates: routeFor(trail).chains.map((line) =>
          line.map((p) => [p.lng, p.lat]),
        ),
      },
      properties: {
        id: trail.id,
        name: trail.name,
        resortId: trail.resortId,
        difficulty: trail.difficulty,
      },
    })),
  };
}
