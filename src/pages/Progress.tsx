import { useMemo } from "react";
import type { Activity, Profile } from "../types/rider";
import { allTrails } from "../data/demo";
import { buildRiderModel, dimensionNames } from "../engine/riderModel";
import { analyze } from "../engine/telemetry";
import {
  DifficultyPill,
  Empty,
  Notice,
  PageHeading,
} from "../components/Shared";
import { Icon } from "../components/Icon";
export function Progress({
  activities,
  profile,
  onActivity,
}: {
  activities: Activity[];
  profile: Profile;
  onActivity: (a: Activity) => void;
}) {
  const model = useMemo(
    () => buildRiderModel(activities, allTrails),
    [activities],
  );
  const ordered = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  const repeated = allTrails
    .map((t) => ({ trail: t, runs: ordered.filter((a) => a.trailId === t.id) }))
    .filter((x) => x.runs.length > 1)
    .sort((a, b) => b.runs.length - a.runs.length)[0];
  const early = repeated ? analyze(repeated.runs[0].telemetry) : null,
    late = repeated ? analyze(repeated.runs.at(-1)!.telemetry) : null;
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="LESS ABOUT FAST. MORE ABOUT YOU."
        title="Small steps. Better riding."
        subtitle="A rider profile built from evidence, one run at a time."
      />
      <div className="progress-intro">
        <div className="progress-orbit">
          <Icon name="mountain" size={50} />
          <span>{activities.length} RUNS</span>
        </div>
        <div>
          <p className="eyebrow">{profile.name.toUpperCase()}'S RIDING STORY</p>
          <h2>
            {activities.length
              ? "Finding your rhythm."
              : "A fresh set of tracks."}
          </h2>
          <p>
            {repeated && early && late
              ? `Across ${repeated.runs.length} replays of ${repeated.trail.name}, stops changed from ${early.stops} to ${late.stops}, and moving-speed variation from ${Math.round(early.speedCV * 100)}% to ${Math.round(late.speedCV * 100)}%.`
              : "Complete a few replays to discover how your movement changes across runs."}
          </p>
          <span className="small-pill">
            Demo evidence · not an assessment of a real rider
          </span>
        </div>
      </div>
      <div className="progress-grid">
        <section className="panel">
          <p className="eyebrow">WHERE YOU'VE BEEN</p>
          <h2>Terrain experience</h2>
          <div className="terrain-experience">
            {(["green", "blue", "black", "double-black"] as const).map((d) => {
              const n = activities.filter(
                (a) =>
                  allTrails.find((t) => t.id === a.trailId)?.difficulty === d,
              ).length;
              return (
                <div key={d}>
                  <DifficultyPill difficulty={d} />
                  <div className="experience-track">
                    <i
                      className={d}
                      style={{
                        width: `${activities.length ? (n / activities.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span>
                    {n} {n === 1 ? "run" : "runs"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="fine-print">
            Bars show the share of completed replays at each mapped difficulty.
            They are not ability percentages.
          </p>
          <div className="ceiling-reminder">
            <Icon name="target" />
            <div>
              Your maximum terrain
              <strong>{profile.ceiling.replace("-", " ")}</strong>
            </div>
            <Icon name="check" />
          </div>
        </section>
        <section className="panel">
          <p className="eyebrow">WHAT THE EVIDENCE SUPPORTS</p>
          <h2>Your terrain profile</h2>
          <div className="dimension-list">
            {Object.entries(model).map(([key, evidence]) => (
              <div className="dimension-row" key={key}>
                <div>
                  <strong>
                    {dimensionNames[key as keyof typeof dimensionNames]}
                  </strong>
                  <span>
                    {evidence.count} supporting{" "}
                    {evidence.count === 1 ? "run" : "runs"}
                    {key === "steep"
                      ? " · simulated pitch"
                      : key === "firm"
                        ? " · rider-reported surface"
                        : ""}
                  </span>
                </div>
                <span
                  className={`evidence-label ${evidence.count >= 3 ? "supported" : ""}`}
                >
                  {evidence.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {repeated ? (
        <section className="progress-story">
          <div>
            <p className="eyebrow">A FAMILIAR RUN. A NEW PERSPECTIVE.</p>
            <h2>{repeated.trail.name}, revisited.</h2>
            <p>
              Same mapped trail. {repeated.runs.length} synthetic movement
              patterns.
              <br />
              Compare pauses and pace, without turning speed into a skill score.
            </p>
          </div>
          <div className="mini-trend" aria-label="Stop count per replay">
            {repeated.runs.map((a) => {
              const stops = analyze(a.telemetry).stops;
              return (
                <button
                  key={a.id}
                  onClick={() => onActivity(a)}
                  aria-label={`Open ${repeated.trail.name} from ${a.date.slice(0, 10)}`}
                >
                  <strong>{stops}</strong>
                  <div style={{ height: `${22 + stops * 23}px` }} />
                  <span>
                    {new Date(a.date).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <small>stops</small>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <Empty title="Patterns take a few runs.">
          Replay the same trail more than once to compare your movement.
        </Empty>
      )}
      <details className="methodology panel">
        <summary>
          <Icon name="info" />
          How SlopeSense learns
          <Icon name="plus" />
        </summary>
        <p>
          Each supported dimension combines moving-speed consistency and
          stationary-time share (80%) with your feedback (20%). Three supporting
          runs are required before a comfort label replaces “Limited data”. No
          skill label uses maximum speed.
        </p>
        <p>
          Groomed evidence requires an OSM grooming tag. Long-run evidence
          requires at least 1 km of recorded route. Firm-surface evidence
          requires your explicit surface report. Weather never establishes a
          trail surface. The steep-section demo dimension uses synthetic pitch
          and is labelled accordingly.
        </p>
        <p>
          “Strong evidence” describes repeated patterns in these replays, not
          validated sporting ability. These thresholds are transparent hackathon
          heuristics, not a trained or clinically validated model.
        </p>
      </details>
      <Notice>
        Your self-selected terrain ceiling always overrides recommendations.
        Unknown dimensions remain unknown, regardless of how easy a run felt.
      </Notice>
    </div>
  );
}
