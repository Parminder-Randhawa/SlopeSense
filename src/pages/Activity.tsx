import { useMemo, useState } from "react";
import type { Activity as RunActivity } from "../types/rider";
import { allTrails } from "../data/demo";
import { resortById } from "../data/resorts";
import { analyze, durationLabel } from "../engine/telemetry";
import { TelemetryChart } from "../components/TelemetryChart";
import {
  DifficultyPill,
  Empty,
  Metric,
  PageHeading,
  dateLabel,
  Notice,
} from "../components/Shared";
import { Icon } from "../components/Icon";
export function ActivityPage({
  activities,
  selected,
  onSelect,
  onExplore,
}: {
  activities: RunActivity[];
  selected: RunActivity | null;
  onSelect: (a: RunActivity | null) => void;
  onExplore: () => void;
}) {
  const ordered = useMemo(
    () => [...activities].sort((a, b) => b.date.localeCompare(a.date)),
    [activities],
  );
  const [filter, setFilter] = useState("all");
  const [compareId, setCompareId] = useState("");
  const totals = useMemo(
    () => activities.map((a) => analyze(a.telemetry)),
    [activities],
  );
  if (selected) {
    const trail = allTrails.find((t) => t.id === selected.trailId);
    if (!trail)
      return (
        <Empty title="Trail not found">
          This saved trail is no longer in the local dataset.
        </Empty>
      );
    const summary = analyze(selected.telemetry);
    const repeats = ordered.filter(
      (a) => a.trailId === selected.trailId && a.id !== selected.id,
    );
    const compared = repeats.find((a) => a.id === compareId) ?? repeats[0];
    const other = compared ? analyze(compared.telemetry) : null;
    return (
      <div className="page-enter">
        <button className="text-button" onClick={() => onSelect(null)}>
          <Icon name="back" size={16} />
          All activity
        </button>
        <PageHeading
          eyebrow={`${resortById[trail.resortId].name} · ${dateLabel(selected.date)} · SIMULATED`}
          title={trail.name}
          action={<DifficultyPill difficulty={trail.difficulty} />}
        />
        <section className="panel activity-detail">
          <div className="summary-metrics">
            <Metric
              value={(summary.distance / 1000).toFixed(2)}
              unit="km"
              label="Distance"
            />
            <Metric
              value={Math.round(summary.vertical)}
              unit="m"
              label="Demo vertical"
            />
            <Metric value={durationLabel(summary.duration)} label="Time" />
            <Metric value={summary.stops} label="Stops" />
            <Metric
              value={Math.round(summary.longestStop)}
              unit="s"
              label="Longest stop"
            />
            <Metric
              value={summary.averageSpeed.toFixed(1)}
              unit="km/h"
              label="Average speed"
            />
          </div>
          <TelemetryChart
            samples={selected.telemetry}
            comparison={compared?.telemetry}
          />
          <div className="chart-key">
            <span>— Selected replay</span>
            {compared && <span>┄ {dateLabel(compared.date)} comparison</span>}
          </div>
          <div className="summary-columns">
            <div>
              <h3>What happened on this run</h3>
              <ul className="reasons">
                {summary.observations.map((o) => (
                  <li key={o}>
                    <Icon name="activity" size={15} />
                    {o}
                  </li>
                ))}
              </ul>
              <div className="feedback-record">
                <span>
                  Felt:{" "}
                  <strong>
                    {selected.feeling === "right"
                      ? "Just right"
                      : selected.feeling}
                  </strong>
                </span>
                <span>
                  Surface report: <strong>{selected.surface}</strong>
                </span>
              </div>
            </div>
            <div>
              <h3>Section by section</h3>
              {summary.sections.map((s) => (
                <div className="section-analysis" key={s.label}>
                  <span>
                    {s.label}
                    <small>
                      {Math.round(s.gradient)}% simulated average pitch
                    </small>
                  </span>
                  <strong>
                    {s.averageSpeed.toFixed(1)} <small>km/h</small>
                  </strong>
                  <span>{s.stops} stops</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        {compared && other && (
          <section className="comparison-section panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">THE SAME LINE. A DIFFERENT RIDE.</p>
                <h2>Compare your tracks.</h2>
              </div>
              <select
                aria-label="Compare with activity"
                value={compared.id}
                onChange={(e) => setCompareId(e.target.value)}
              >
                {repeats.map((a) => (
                  <option value={a.id} key={a.id}>
                    {dateLabel(a.date)} · {a.persona}
                  </option>
                ))}
              </select>
            </div>
            <div className="comparison-table">
              <div>
                <span>Observation</span>
                <strong>{dateLabel(compared.date)}</strong>
                <strong>{dateLabel(selected.date)}</strong>
              </div>
              <div>
                <span>Completion time</span>
                <strong>{durationLabel(other.duration)}</strong>
                <strong>{durationLabel(summary.duration)}</strong>
              </div>
              <div>
                <span>Stops</span>
                <strong>{other.stops}</strong>
                <strong>{summary.stops}</strong>
              </div>
              <div>
                <span>Moving-speed variation</span>
                <strong>{Math.round(other.speedCV * 100)}%</strong>
                <strong>{Math.round(summary.speedCV * 100)}%</strong>
              </div>
              <div>
                <span>Longest stop</span>
                <strong>{Math.round(other.longestStop)} s</strong>
                <strong>{Math.round(summary.longestStop)} s</strong>
              </div>
            </div>
            <Notice>
              {summary.stops === other.stops
                ? "The stop count was unchanged."
                : `The selected replay has ${Math.abs(summary.stops - other.stops)} ${summary.stops < other.stops ? "fewer" : "more"} stops.`}{" "}
              {Math.round(summary.speedCV * 100) ===
              Math.round(other.speedCV * 100)
                ? "Moving-speed variation is similar."
                : `Moving-speed variation is ${summary.speedCV < other.speedCV ? "lower" : "higher"}.`}{" "}
              Different synthetic profiles explain these changes; completion
              speed alone is not a skill measure.
            </Notice>
          </section>
        )}
      </div>
    );
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="YOUR DAYS ON THE MOUNTAIN"
        title="Every run leaves a trace."
        subtitle="The moments, patterns and small steps that add up."
      />
      <div className="activity-overview">
        <Metric value={activities.length} label="Recorded replays" />
        <Metric
          value={(totals.reduce((s, a) => s + a.vertical, 0) / 1000).toFixed(2)}
          unit="km"
          label="Simulated vertical"
        />
        <Metric
          value={new Set(activities.map((a) => a.resortId)).size}
          label="Mountains explored"
        />
      </div>
      <div className="section-title">
        <h2>Recent activity</h2>
        <select
          aria-label="Filter activity mountain"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All mountains</option>
          {Object.values(resortById).map((r) => (
            <option value={r.id} key={r.id}>
              {r.shortName}
            </option>
          ))}
        </select>
      </div>
      <div className="activity-list">
        {ordered
          .filter((a) => filter === "all" || a.resortId === filter)
          .map((a) => {
            const t = allTrails.find((t) => t.id === a.trailId);
            if (!t) return null;
            const s = analyze(a.telemetry);
            return (
              <button
                className="activity-row"
                key={a.id}
                onClick={() => onSelect(a)}
              >
                <div className={`activity-art ${a.resortId}`}>
                  <Icon name="mountain" size={40} />
                </div>
                <div className="activity-row-main">
                  <span className="eyebrow">
                    {dateLabel(a.date)} · {resortById[a.resortId].shortName}
                  </span>
                  <h3>{t.name}</h3>
                  <DifficultyPill difficulty={t.difficulty} />
                  <span className="simulated-label">Simulated</span>
                </div>
                <div className="activity-row-stats">
                  <Metric value={durationLabel(s.duration)} label="Duration" />
                  <Metric
                    value={Math.round(s.vertical)}
                    unit="m"
                    label="Vertical"
                  />
                  <Metric value={s.stops} label="Stops" />
                </div>
                <Icon name="chevron" />
              </button>
            );
          })}
      </div>
      {!ordered.filter((a) => filter === "all" || a.resortId === filter)
        .length && (
        <Empty title="Your first tracks are waiting.">
          <button className="primary" onClick={onExplore}>
            Explore a mountain
            <Icon name="arrow" />
          </button>
        </Empty>
      )}
      <p className="data-note">
        Every activity here is simulated. Replays and rider-reported feedback
        are stored on this device.
      </p>
    </div>
  );
}
