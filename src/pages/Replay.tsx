import { useEffect, useMemo, useRef, useState } from "react";
import type { SkiRun } from "../types/trail";
import type {
  Activity,
  Feeling,
  Persona,
  Profile,
  Surface,
} from "../types/rider";
import type { Fit } from "../engine/recommendations";
import {
  analyze,
  durationLabel,
  sampleAt,
  sectionLabels,
  simulateRun,
} from "../engine/telemetry";
import { usePlayback } from "../hooks/usePlayback";
import { TrailMap } from "../components/TrailMap";
import { TelemetryChart } from "../components/TelemetryChart";
import { DifficultyPill, Match, Metric, Notice } from "../components/Shared";
import { Icon } from "../components/Icon";
import { trailsByResort } from "../data/trails";
import { resortById } from "../data/resorts";
import { buildRiderModel, dimensionNames } from "../engine/riderModel";
import { allTrails } from "../data/demo";
import { routeFor } from "../engine/route";

export function Replay({
  trail,
  auto,
  activities,
  fits,
  onSave,
  onExit,
  onNext,
  profile,
}: {
  trail: SkiRun;
  auto: boolean;
  activities: Activity[];
  fits: Fit[];
  profile: Profile;
  onSave: (a: Activity) => void;
  onExit: () => void;
  onNext: (fit: Fit) => void;
}) {
  const [persona, setPersona] = useState<Persona>("developing");
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [surface, setSurface] = useState<Surface>("unknown");
  const [saved, setSaved] = useState(false);
  const before = useRef(buildRiderModel(activities, allTrails));
  const sessionId = useRef(crypto.randomUUID());
  const samples = useMemo(() => simulateRun(trail, persona), [trail, persona]);
  const analysis = useMemo(() => analyze(samples), [samples]);
  const playback = usePlayback(analysis.duration);
  const { time, playing, rate, setRate, setPlaying, seek, restart } = playback;
  useEffect(() => {
    if (auto) setPlaying(true);
  }, []);
  const current = sampleAt(samples, time);
  const finished = time >= analysis.duration;
  const model = useMemo(
    () => buildRiderModel(activities, allTrails),
    [activities],
  );
  const next =
    fits.find(
      (f) => f.trail.resortId === trail.resortId && f.trail.id !== trail.id,
    ) ?? fits.find((f) => f.trail.id !== trail.id);
  const events = analysis.events
    .filter((e) => e.time <= time)
    .slice(-3)
    .reverse();
  const changed = Object.keys(model).filter(
    (k) =>
      model[k as keyof typeof model].count >
      before.current[k as keyof typeof model].count,
  ) as (keyof typeof model)[];
  const save = () => {
    if (!feeling || saved) return;
    const activity: Activity = {
      id: sessionId.current,
      trailId: trail.id,
      resortId: trail.resortId,
      date: new Date(
        Date.UTC(2026, 0, 17, 12, activities.length),
      ).toISOString(),
      persona,
      feeling,
      surface,
      telemetry: samples,
      simulated: true,
    };
    onSave(activity);
    setSaved(true);
  };
  return (
    <div className="replay-page page-enter">
      <div className="replay-heading">
        <button
          className="icon-button"
          onClick={onExit}
          aria-label="Back to mountain"
        >
          <Icon name="back" />
        </button>
        <div>
          <p className="eyebrow">
            {resortById[trail.resortId].shortName} · SYNTHETIC TELEMETRY
          </p>
          <h1>
            {trail.name}
            <DifficultyPill difficulty={trail.difficulty} />
          </h1>
        </div>
        <span className={`replay-status ${playing ? "is-playing" : ""}`}>
          <span className="status-dot" />
          {saved
            ? "SAVED"
            : finished
              ? "COMPLETE"
              : playing
                ? "REPLAYING"
                : "READY"}
        </span>
      </div>
      <div className="replay-layout">
        <section className="replay-map-section">
          <TrailMap
            key={trail.id}
            resort={resortById[trail.resortId]}
            trails={trailsByResort[trail.resortId]}
            selectedTrail={trail}
            onSelectTrail={() => {}}
            rider={current}
            compact
          />
          <div className="section-indicator">
            <Icon name="layers" size={17} />
            <span>
              SECTION {current.section + 1} / 3
              <strong>{sectionLabels[current.section]}</strong>
            </span>
            <span>Simulated terrain profile</span>
          </div>
        </section>
        <section className="playback-panel">
          <div className="section-title">
            <h3>Your run, in motion.</h3>
            <Icon name="activity" size={20} />
          </div>
          <label className="field-label" htmlFor="replay-persona">
            Replay rider
          </label>
          <select
            id="replay-persona"
            disabled={saved}
            value={persona}
            onChange={(e) => {
              restart();
              setPersona(e.target.value as Persona);
              setFeeling(null);
            }}
          >
            <option value="smooth">
              Strong intermediate · consistent movement
            </option>
            <option value="developing">
              Developing intermediate · two pauses
            </option>
            <option value="cautious">
              Cautious intermediate · three pauses
            </option>
          </select>
          <div className="live-metrics">
            <Metric
              value={current.speed.toFixed(1)}
              unit="km/h"
              label="Current speed"
            />
            <Metric value={durationLabel(time)} label="Elapsed time" />
            <Metric
              value={(current.distance / 1000).toFixed(2)}
              unit="km"
              label="Distance"
            />
            <Metric
              value={Math.round(samples[0].elevation - current.elevation)}
              unit="m"
              label="Vertical descended"
            />
            <Metric
              value={Math.round(current.elevation)}
              unit="m"
              label="Simulated elevation"
            />
            <Metric
              value={Math.round(current.gradient)}
              unit="%"
              label="Simulated gradient"
            />
          </div>
          <TelemetryChart
            samples={samples}
            time={time}
            onScrub={saved ? undefined : seek}
          />
          <div className="scrub-labels">
            <span>{durationLabel(time)}</span>
            <span>{durationLabel(analysis.duration)}</span>
          </div>
          <input
            className="scrubber"
            aria-label="Replay position"
            type="range"
            min="0"
            max={analysis.duration}
            step="0.1"
            value={time}
            disabled={saved}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <div className="playback-controls">
            <button
              className="icon-button"
              aria-label="Restart replay"
              disabled={saved}
              onClick={() => {
                restart();
                setFeeling(null);
              }}
            >
              <Icon name="reset" />
            </button>
            <button
              className="play-toggle"
              aria-label={playing ? "Pause replay" : "Play replay"}
              disabled={saved}
              onClick={() => {
                if (finished) seek(0);
                setPlaying(!playing);
              }}
            >
              <Icon name={playing ? "pause" : "play"} size={22} />
            </button>
            <div className="playback-rates">
              {[1, 2, 4].map((r) => (
                <button
                  key={r}
                  className={rate === r ? "active" : ""}
                  aria-pressed={rate === r}
                  onClick={() => setRate(r)}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>
          {!finished && (
            <button
              className="text-button finish-demo"
              onClick={() => {
                seek(analysis.duration);
                setPlaying(false);
              }}
            >
              Jump to completed replay <Icon name="arrow" size={15} />
            </button>
          )}
          <div className="live-events" aria-label="Telemetry observations">
            <p className="eyebrow">ON THIS RUN</p>
            {events.length ? (
              events.map((e) => (
                <div className="telemetry-event" key={`${e.type}-${e.time}`}>
                  <Icon
                    name={
                      e.type === "stop"
                        ? "pause"
                        : e.type === "gradient"
                          ? "mountain"
                          : "activity"
                    }
                    size={16}
                  />
                  <div>
                    <strong>{e.title}</strong>
                    <span>
                      {e.type === "stop" && time < e.time + analysis.longestStop
                        ? "Stationary samples detected; duration available at completion."
                        : e.detail}
                    </span>
                  </div>
                  <time>{durationLabel(e.time)}</time>
                </div>
              ))
            ) : (
              <p className="muted">
                {time < 1
                  ? "Press play to follow the rider and uncover the run."
                  : "Tracking movement. Insights appear as events are detected."}
              </p>
            )}
          </div>
        </section>
      </div>
      {finished && (
        <section className="run-summary panel" aria-label="Run complete">
          <div className="summary-heading">
            <span className="complete-check">
              <Icon name="check" size={24} />
            </span>
            <div>
              <p className="eyebrow">
                ANOTHER RUN. A LITTLE MORE UNDERSTANDING.
              </p>
              <h2>
                {saved ? "Your next chapter starts here." : "That’s a wrap."}
              </h2>
              <p>
                {trail.name} ·{" "}
                {routeFor(trail).partial
                  ? "Connected trail segment"
                  : "Connected mapped route"}{" "}
                · simulated activity
              </p>
            </div>
          </div>
          <div className="summary-metrics">
            <Metric
              value={(analysis.distance / 1000).toFixed(2)}
              unit="km"
              label="Distance"
            />
            <Metric
              value={Math.round(analysis.vertical)}
              unit="m"
              label="Demo vertical"
            />
            <Metric
              value={durationLabel(analysis.duration)}
              label="Completion time"
            />
            <Metric value={analysis.stops} label="Stops" />
            <Metric
              value={Math.round(analysis.longestStop)}
              unit="s"
              label="Longest stop"
            />
            <Metric
              value={analysis.averageSpeed.toFixed(1)}
              unit="km/h"
              label="Average speed"
            />
          </div>
          <div className="summary-columns">
            <div>
              <h3>What the run tells us</h3>
              <ul className="reasons">
                {analysis.observations.map((o) => (
                  <li key={o}>
                    <Icon name="activity" size={15} />
                    {o}
                  </li>
                ))}
              </ul>
              <p className="fine-print">
                These are observations of synthetic movement. Higher speed is
                never treated as greater skill.
              </p>
            </div>
            {!saved ? (
              <div className="feedback">
                <h3>How did that feel?</h3>
                <div className="choice-row">
                  {(
                    [
                      ["easy", "Easy"],
                      ["right", "Just right"],
                      ["hard", "Hard"],
                    ] as [Feeling, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      className={`choice ${feeling === v ? "selected" : ""}`}
                      aria-pressed={feeling === v}
                      onClick={() => setFeeling(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="field-label" htmlFor="surface">
                  Surface in this scenario{" "}
                  <small>Optional · rider report</small>
                </label>
                <select
                  id="surface"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value as Surface)}
                >
                  <option value="unknown">Not sure / skip</option>
                  <option value="soft">Soft</option>
                  <option value="normal">Normal</option>
                  <option value="firm">Firm</option>
                  <option value="variable">Variable</option>
                </select>
                <button className="primary" disabled={!feeling} onClick={save}>
                  Save & find my next run
                  <Icon name="arrow" />
                </button>
              </div>
            ) : (
              <div className="learning-update" role="status">
                <p className="eyebrow">
                  <Icon name="check" size={15} /> RIDER MODEL UPDATED
                </p>
                {changed.slice(0, 4).map((d) => (
                  <div className="model-change" key={d}>
                    <span>
                      {dimensionNames[d]}
                      <small>
                        {before.current[d].label} · {before.current[d].count}{" "}
                        runs
                      </small>
                    </span>
                    <Icon name="arrow" size={14} />
                    <strong>
                      {model[d].label}
                      <small>{model[d].count} evidence runs</small>
                    </strong>
                  </div>
                ))}
                <p className="fine-print">
                  Only supported dimensions gain evidence. Unobserved grooming
                  and surfaces stay unknown. The model above is entirely
                  simulated.
                </p>
              </div>
            )}
          </div>
          {saved && next && (
            <div className="after-next">
              <div>
                <p className="eyebrow">
                  NEXT UP · RERANKED FROM YOUR NEW EVIDENCE
                </p>
                <h2>
                  {next.trail.name}
                  <DifficultyPill difficulty={next.trail.difficulty} />
                </h2>
                <p>
                  {next.reasons.find((r) => r.startsWith("A longer")) ??
                    `A different ${next.trail.difficulty} route within your ${profile.ceiling} ceiling. Your latest activity and feedback now inform the ranking.`}
                </p>
              </div>
              <Match score={next.score} large />
              <button className="primary" onClick={() => onNext(next)}>
                Explore next run
                <Icon name="arrow" />
              </button>
            </div>
          )}
        </section>
      )}
      <Notice>
        Real mapped coordinates; synthetic speed, elevation, pitch and pauses.
        The demo uses a connected OSM route, not verified downhill navigation.
        Your saved replay remains clearly labelled simulated.
      </Notice>
    </div>
  );
}
