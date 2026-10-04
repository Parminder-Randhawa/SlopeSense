import { difficultyLabel } from "../lib/difficulty";
import { formatDistance, getRoutePoints } from "../lib/geoUtils";
import type { Resort } from "../types/resort";
import type { SkiRun } from "../types/trail";
import { DifficultyBadge } from "./DifficultyBadge";

type TrailDetailsProps = {
  resort: Resort;
  trail: SkiRun | null;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function TrailDetails({ resort, trail }: TrailDetailsProps) {
  if (!trail) {
    return (
      <section
        className="trail-details trail-details--empty"
        aria-live="polite"
      >
        <div className="empty-state__illustration" aria-hidden="true">
          <span className="empty-state__pin" />
          <span className="empty-state__trail empty-state__trail--one" />
          <span className="empty-state__trail empty-state__trail--two" />
        </div>
        <p className="eyebrow">Trail details</p>
        <h2>Pick a line on the mountain</h2>
        <p>
          Select a coloured run on the map or choose one from the list below to
          inspect its local trail data.
        </p>
      </section>
    );
  }

  const distance = formatDistance(trail.lengthMeters);
  const pointCount = getRoutePoints(trail).length;
  const grooming =
    trail.grooming && trail.grooming !== "unknown"
      ? trail.grooming.charAt(0).toUpperCase() + trail.grooming.slice(1)
      : null;

  return (
    <section className="trail-details" aria-live="polite">
      <div className="trail-details__heading">
        <div>
          <p className="eyebrow">Selected trail</p>
          <h2>{trail.name}</h2>
          <p className="trail-details__resort">{resort.name}</p>
        </div>
        <DifficultyBadge difficulty={trail.difficulty} compact />
      </div>

      <dl className="detail-grid">
        <DetailRow
          label="Difficulty"
          value={difficultyLabel[trail.difficulty]}
        />
        {distance && <DetailRow label="Mapped length" value={distance} />}
        {trail.verticalMeters && (
          <DetailRow
            label="Vertical drop"
            value={`${Math.round(trail.verticalMeters)} m`}
          />
        )}
        {grooming && <DetailRow label="Grooming" value={grooming} />}
        <DetailRow label="Route points" value={pointCount.toLocaleString()} />
        {trail.source && <DetailRow label="Source" value={trail.source} />}
      </dl>

      <div className="phase-two-callout">
        <button type="button" disabled>
          <span aria-hidden="true">▶</span>
          Replay run
        </button>
        <div>
          <strong>Coming in Phase 2</strong>
          <span>Telemetry playback will follow this route.</span>
        </div>
      </div>
    </section>
  );
}
