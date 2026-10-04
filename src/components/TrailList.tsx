import { difficultyLabel } from "../lib/difficulty";
import { formatDistance } from "../lib/geoUtils";
import type { SkiRun } from "../types/trail";
import { DifficultyBadge } from "./DifficultyBadge";

type TrailListProps = {
  trails: SkiRun[];
  selectedTrailId: string | null;
  onSelect: (trail: SkiRun) => void;
};

export function TrailList({
  trails,
  selectedTrailId,
  onSelect,
}: TrailListProps) {
  return (
    <section className="trail-list-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mapped runs</p>
          <h3>{trails.length} local trails</h3>
        </div>
        <span className="local-badge">Local data</span>
      </div>

      <div className="trail-list" role="list">
        {trails.map((trail) => {
          const selected = trail.id === selectedTrailId;
          return (
            <button
              className="trail-list__item"
              data-selected={selected}
              type="button"
              role="listitem"
              aria-pressed={selected}
              onClick={() => onSelect(trail)}
              key={trail.id}
            >
              <DifficultyBadge difficulty={trail.difficulty} compact />
              <span className="trail-list__name">
                <strong>{trail.name}</strong>
                <small>{difficultyLabel[trail.difficulty]}</small>
              </span>
              <span className="trail-list__distance">
                {formatDistance(trail.lengthMeters) ?? "—"}
              </span>
              <span className="trail-list__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
