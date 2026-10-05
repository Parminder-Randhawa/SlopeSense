import type { Activity, Profile } from "../types/rider";
import { allTrails } from "../data/demo";
import { buildRiderModel, dimensionNames } from "../engine/riderModel";
import { analyze, durationLabel } from "../engine/telemetry";
import { Metric, PageHeading, DifficultyPill } from "../components/Shared";
export function Progress({
  activities,
  profile,
  onActivity,
}: {
  activities: Activity[];
  profile: Profile;
  onActivity: (a: Activity) => void;
}) {
  const model = buildRiderModel(activities, allTrails),
    stats = activities.map((a) => analyze(a.telemetry)),
    demo = activities.length > 0 && activities.every((a) => a.simulated);
  const now = demo
    ? new Date(Math.max(...activities.map((a) => Date.parse(a.date))))
    : new Date();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - ((7 - now.getDay()) % 7) - (7 - i) * 7 + 7);
    const start = new Date(end.getTime() - 7 * 86400000);
    return {
      end,
      distance: activities.reduce((n, a) => {
        const d = Date.parse(a.date);
        return d > start.getTime() && d <= end.getTime()
          ? n + analyze(a.telemetry).distance
          : n;
      }, 0),
    };
  });
  const max = Math.max(1000, ...weeks.map((w) => w.distance));
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow={`${profile.name.toUpperCase()}'S RIDING`}
        title="See your progress."
        subtitle="Distance and experience, built from your saved rides."
      />
      <div className="activity-overview">
        <Metric
          value={activities.length}
          label={demo ? "Demo rides" : "Saved rides"}
        />
        <Metric
          value={(stats.reduce((s, a) => s + a.distance, 0) / 1000).toFixed(2)}
          unit="km"
          label="Total distance"
        />
        <Metric
          value={durationLabel(stats.reduce((s, a) => s + a.duration, 0))}
          label="Tracked time"
        />
      </div>
      <section className="panel">
        <div className="section-title">
          <h2>Weekly distance</h2>
          <span className="muted">
            {demo ? "Demo timeline" : "Past 8 weeks"}
          </span>
        </div>
        <div
          className="weekly-chart"
          role="img"
          aria-label={`Weekly recorded distance: ${weeks.map((w) => (w.distance / 1000).toFixed(1) + " km").join(", ")}`}
        >
          {weeks.map((w) => (
            <div key={w.end.toISOString()}>
              <strong>
                {(w.distance / 1000).toFixed(1)}
                <small> km</small>
              </strong>
              <i
                style={{ height: `${Math.max(2, (w.distance / max) * 125)}px` }}
              />
              <span>
                {w.end.toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      </section>
      <div className="progress-grid">
        <section className="panel">
          <h2>Terrain experience</h2>
          <div className="terrain-experience">
            {(["green", "blue", "black", "double-black"] as const).map((d) => {
              const count = activities.filter(
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
                        width: `${activities.length ? (count / activities.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span>{count} rides</span>
                </div>
              );
            })}
          </div>
          <p className="fine-print">
            Only rides assigned to a mapped run contribute. Your terrain limit
            remains {profile.ceiling}.
          </p>
        </section>
        <section className="panel">
          <h2>Riding patterns</h2>
          <div className="dimension-list">
            {Object.entries(model)
              .filter(([key]) => demo || key !== "steep")
              .map(([key, value]) => (
                <div className="dimension-row" key={key}>
                  <div>
                    <strong>
                      {dimensionNames[key as keyof typeof dimensionNames]}
                    </strong>
                    <span>{value.count} supporting rides</span>
                  </div>
                  <span className="evidence-label">
                    {value.count < 3 ? "Limited data" : value.label}
                  </span>
                </div>
              ))}
          </div>
          <p className="fine-print">
            Experimental patterns from pace variation, pauses and your feedback.
            These are not validated skill ratings.
          </p>
        </section>
      </div>
      {activities.length > 0 && (
        <section className="panel">
          <h2>Recent rides</h2>
          {[...activities]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 4)
            .map((a) => (
              <button
                key={a.id}
                className="progress-recent"
                onClick={() => onActivity(a)}
              >
                <strong>
                  {allTrails.find((t) => t.id === a.trailId)?.name ||
                    "Mountain activity"}
                </strong>
                <span>{new Date(a.date).toLocaleDateString()} ↗</span>
              </button>
            ))}
        </section>
      )}
    </div>
  );
}
