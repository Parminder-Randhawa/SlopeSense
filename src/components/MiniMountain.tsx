import type { ResortId } from "../types/resort";
export function MiniMountain({ resortId }: { resortId: ResortId }) {
  return <div className={`mini-mountain ${resortId}`} aria-hidden="true" />;
}
