import type { Activity, Profile } from "../types/rider";
import { allTrails } from "../data/demo";
import { ridingProgress } from "../engine/progression";
import type { SkiRun } from "../types/trail";
import { Icon } from "../components/Icon";
import { dateLabel } from "../components/Shared";
import { analyze, durationLabel } from "../engine/telemetry";
import { Metric, PageHeading, DifficultyPill } from "../components/Shared";
export function Progress({
  activities,
  profile,
  onActivity,
  onTrail,
}: {
  activities: Activity[];
  profile: Profile;
  onActivity: (a: Activity) => void;
  onTrail: (trail: SkiRun) => void;
}) {
  const progress = ridingProgress(activities, allTrails, profile),
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
    <div className="progress-page page-enter">
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
        <section className="panel rider-level" aria-label="Rider level">
          <div className="section-title">
            <h2>Your riding level</h2>
            <span className="level-badge">Level {progress.level}</span>
          </div>
          <h3>{progress.name}</h3>
          <p className="level-xp">
            {progress.xp} XP{" "}
            <span>
              {progress.next
                ? `· ${progress.next.xp - progress.xp} to ${progress.next.name}`
                : "· All levels unlocked"}
            </span>
          </p>
          <progress
            max={1}
            value={progress.fraction}
            aria-label="Progress to next riding level"
          />
          <div className="ride-badges">
            {progress.badges.map((b) => (
              <div key={b.name} className={b.count >= b.goal ? "earned" : ""}>
                <Icon
                  name={b.count >= b.goal ? "check" : "mountain"}
                  size={18}
                />
                <strong>{b.name}</strong>
                <span>
                  {Math.min(b.goal, b.count)} / {b.goal}
                </span>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Complete mapped rides to earn XP. Levels track experience, not a
            validated skill rating.
          </p>
          <details className="xp-rules">
            <summary>How XP works</summary>
            <p>
              Earn 100 XP for a mapped ride of at least 150 m and 30 seconds,
              plus 50 XP for each new run. Speed and harder terrain earn no
              bonus. Your self-rated skill is {profile.experience}; your{" "}
              {profile.ceiling} terrain limit stays under your control.
            </p>
          </details>
          {progress.nextRuns.length > 0 && (
            <div className="level-challenges">
              <h4>Try a new line · +50 XP</h4>
              {progress.nextRuns.map((t) => (
                <button key={t.id} onClick={() => onTrail(t)}>
                  <DifficultyPill difficulty={t.difficulty} />
                  <span>{t.name}</span>
                  <Icon name="chevron" size={16} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      {activities.length > 0 && (
        <details className="panel recent-rides-menu">
          <summary>
            <span>
              <strong>Recent rides & replays</strong>
              <small>{activities.length} saved rides · tap to browse</small>
            </span>
            <Icon name="down" size={18} />
          </summary>
          <div className="recent-rides-list">
            {[...activities]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((a) => {
                const trail = allTrails.find((t) => t.id === a.trailId),
                  stats = analyze(a.telemetry);
                return (
                  <button
                    key={a.id}
                    className="progress-recent"
                    onClick={() => onActivity(a)}
                  >
                    <Icon name="play" size={18} />
                    <span>
                      <strong>{trail?.name || "Mountain activity"}</strong>
                      <small>
                        {dateLabel(a.date)} ·{" "}
                        {(stats.distance / 1000).toFixed(2)} km ·{" "}
                        {durationLabel(stats.duration)}
                      </small>
                    </span>
                    <Icon name="chevron" size={16} />
                  </button>
                );
              })}
          </div>
        </details>
      )}
    </div>
  );
}
