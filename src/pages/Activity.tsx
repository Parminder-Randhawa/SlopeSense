import { useState } from "react";
import type { Activity } from "../types/rider";
import { allTrails } from "../data/demo";
import { resorts, resortById } from "../data/resorts";
import { analyze, durationLabel } from "../engine/telemetry";
import {
  Metric,
  PageHeading,
  Empty,
  DifficultyPill,
  dateLabel,
} from "../components/Shared";
import { ReplayPlayer } from "../components/ReplayPlayer";
import { Icon } from "../components/Icon";
import { exportGpx } from "../services/local";
export function ActivityPage({
  activities,
  selected,
  onSelect,
  onExplore,
  onBack,
  backLabel,
}: {
  activities: Activity[];
  selected: Activity | null;
  onSelect: (a: Activity | null) => void;
  onExplore: () => void;
  onBack: () => void;
  backLabel: string;
}) {
  const [compareId, setCompareId] = useState("");
  if (selected) {
    const trail = allTrails.find((t) => t.id === selected.trailId),
      resort = selected.resortId ? resortById[selected.resortId] : resorts[0],
      summary = analyze(selected.telemetry),
      repeats = activities.filter(
        (a) =>
          a.trailId && a.trailId === selected.trailId && a.id !== selected.id,
      ),
      compare = repeats.find((a) => a.id === compareId);
    return (
      <div className="page-enter">
        <button className="back-link" onClick={() => onSelect(null)}>
          <Icon name="back" size={17} />
          All activities
        </button>
        <PageHeading
          eyebrow={`${dateLabel(selected.date)} · ${selected.simulated ? "SIMULATED" : "GPS RECORDING"}`}
          title={trail?.name || "Mountain activity"}
          subtitle={
            selected.resortId ? resort.name : "No confident mapped run match"
          }
        />
        <div className="activity-detail panel">
          <div className="summary-metrics">
            <Metric
              value={(summary.distance / 1000).toFixed(2)}
              unit="km"
              label="Distance"
            />
            <Metric
              value={durationLabel(summary.duration)}
              label="Tracked time"
            />
            <Metric
              value={
                summary.elevationAvailable ? Math.round(summary.vertical) : "—"
              }
              unit={summary.elevationAvailable ? "m" : undefined}
              label={
                selected.simulated
                  ? "Simulated descent"
                  : "GPS descent estimate"
              }
            />
            <Metric
              value={summary.averageSpeed.toFixed(1)}
              unit="km/h"
              label="Average speed"
            />
            <Metric value={summary.stops} label="Detected stops" />
          </div>
          {selected.telemetry.length > 1 && (
            <ReplayPlayer
              key={selected.id}
              activity={selected}
              comparison={compare}
            />
          )}
          <p className="fine-print">
            {selected.simulated
              ? "This ride uses simulated GPS fixes and elevation."
              : "Speed and distance are estimated from accepted GPS fixes. Gaps and paused intervals are excluded. Elevation is shown only when altitude accuracy is available."}
          </p>
          {repeats.length > 0 && (
            <label className="compare-picker">
              Compare this run
              <select
                aria-label="Compare with activity"
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              >
                <option value="">No comparison</option>
                {repeats.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.date).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="feedback-record">
            <span>
              Feeling:{" "}
              <strong>
                {selected.feeling === "unreported"
                  ? "Not reported"
                  : selected.feeling === "right"
                    ? "Just right"
                    : selected.feeling}
              </strong>
            </span>
            <span>
              Surface:{" "}
              <strong>
                {selected.surface === "unknown"
                  ? "Not reported"
                  : selected.surface}
              </strong>
            </span>
          </div>
          <ul className="reasons">
            {summary.observations.map((o) => (
              <li key={o}>
                <Icon name="activity" size={15} />
                {o}
              </li>
            ))}
          </ul>
          <button className="secondary" onClick={() => exportGpx(selected)}>
            Export GPX
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="page-enter">
      <button className="back-link" onClick={onBack}>
        <Icon name="back" size={17} />
        Back to {backLabel}
      </button>
      <PageHeading
        eyebrow="SAVED ON THIS DEVICE"
        title="Rides & replays."
        subtitle="Tap a ride for its replay, route, and stats."
      />
      <div className="activity-list">
        {[...activities]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((a) => {
            const trail = allTrails.find((t) => t.id === a.trailId),
              s = analyze(a.telemetry);
            return (
              <button
                className="activity-row"
                key={a.id}
                onClick={() => onSelect(a)}
              >
                <div className="activity-art">
                  <Icon name="mountain" size={35} />
                </div>
                <div className="activity-row-main">
                  <span className="eyebrow">
                    {dateLabel(a.date)} · {a.simulated ? "DEMO" : "GPS"}
                  </span>
                  <h3>{trail?.name || "Mountain activity"}</h3>
                  {trail ? (
                    <DifficultyPill difficulty={trail.difficulty} />
                  ) : (
                    <span className="muted">Unmatched run</span>
                  )}
                </div>
                <div className="activity-row-stats">
                  <Metric
                    value={(s.distance / 1000).toFixed(2)}
                    unit="km"
                    label="Distance"
                  />
                  <Metric
                    value={durationLabel(s.duration)}
                    label="Tracked time"
                  />
                </div>
                <span className="ride-replay-action">
                  <Icon name="play" size={17} />
                  Replay
                </span>
              </button>
            );
          })}
      </div>
      {!activities.length && (
        <Empty title="Your first ride starts here.">
          <button className="primary" onClick={onExplore}>
            Start recording
            <Icon name="play" />
          </button>
        </Empty>
      )}
    </div>
  );
}
