import cypressRaw from "./cypress.geojson?raw";
import grouseRaw from "./grouse.geojson?raw";
import seymourRaw from "./seymour.geojson?raw";
import { parseTrailData } from "../lib/trailParser";
import type { ResortId } from "../types/resort";
import type { SkiRun } from "../types/trail";

const sourceFiles: Record<ResortId, string> = {
  cypress: cypressRaw,
  grouse: grouseRaw,
  seymour: seymourRaw,
};

export const trailsByResort = Object.fromEntries(
  (Object.entries(sourceFiles) as [ResortId, string][]).map(
    ([resortId, raw]) => [
      resortId,
      parseTrailData(JSON.parse(raw) as unknown, resortId),
    ],
  ),
) as Record<ResortId, SkiRun[]>;
