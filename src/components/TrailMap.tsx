import type { Resort } from "../types/resort";
import type { SkiRun } from "../types/trail";
import type { Sample } from "../types/rider";
import { RunMap } from "./RunMap";
export function TrailMap(props: {
  resort: Resort;
  trails: SkiRun[];
  selectedTrail: SkiRun | null;
  onSelectTrail: (t: SkiRun) => void;
  recommendedId?: string;
  rider?: Sample;
  compact?: boolean;
}) {
  return <RunMap {...props} />;
}
