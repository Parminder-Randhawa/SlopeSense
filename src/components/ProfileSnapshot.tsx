import type { Activity } from "../types/rider";
import { analyze, durationLabel } from "../engine/telemetry";
import { allTrails } from "../data/demo";
import { resorts } from "../data/resorts";
import { Icon } from "./Icon";
export function ProfileSnapshot({
  activities,
  demo,
  onActivity,
}: {
  activities: Activity[];
  demo: boolean;
  onActivity: (a: Activity) => void;
}) {
  const summaries = activities.map((a) => analyze(a.telemetry));
  const days = new Set(activities.map((a) => a.date.slice(0, 10))).size;
  const visited = resorts.filter((r) =>
    activities.some((a) => a.resortId === r.id),
  );
  const recent = [...activities]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <section className="panel profile-snapshot" aria-label="Riding overview">
      <div className="section-title">
        <h2>Your riding</h2>
        <span className="muted">{demo ? "Sample season" : "All time"}</span>
      </div>
      <div className="profile-stat-grid">
        <div>
          <strong>
            {(summaries.reduce((n, s) => n + s.distance, 0) / 1000).toFixed(1)}
            <small> km</small>
          </strong>
          <span>Distance</span>
        </div>
        <div>
          <strong>
            {durationLabel(summaries.reduce((n, s) => n + s.duration, 0))}
          </strong>
          <span>Tracked time</span>
        </div>
        <div>
          <strong>{days}</strong>
          <span>Days on snow</span>
        </div>
        <div>
          <strong>
            {visited.length}
            <small> / 3</small>
          </strong>
          <span>Mountains explored</span>
        </div>
      </div>
      <h3>Where you ride</h3>
      <div className="profile-mountains">
        {resorts.map((r) => {
          const rides = activities.filter((a) => a.resortId === r.id);
          return (
            <div key={r.id}>
              <Icon name="mountain" size={18} />
              <span>{r.shortName}</span>
              <strong>{rides.length} rides</strong>
            </div>
          );
        })}
      </div>
      {recent.length > 0 ? (
        <>
          <h3>Recent rides & replays</h3>
          <div className="profile-recent">
            {recent.map((a) => (
              <button key={a.id} onClick={() => onActivity(a)}>
                <Icon name="play" size={17} />
                <span>
                  <strong>
                    {allTrails.find((t) => t.id === a.trailId)?.name ||
                      "Mountain activity"}
                  </strong>
                  <small>
                    {new Date(a.date).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {(analyze(a.telemetry).distance / 1000).toFixed(2)} km
                  </small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="fine-print">
          Save your first ride to build your overview and replay your route.
        </p>
      )}
      {demo && (
        <p className="fine-print">
          Sample rides include repeated runs for replay comparisons. All metrics
          here come from simulated routes.
        </p>
      )}
    </section>
  );
}
