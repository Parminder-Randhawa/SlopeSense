import { useState } from "react";
import type { Activity, Profile } from "../types/rider";
import type { ResortId } from "../types/resort";
import type { Fit } from "../engine/recommendations";
import { rankMountains } from "../engine/recommendations";
import { conditions, firmRisk } from "../data/conditions";
import { resortById } from "../data/resorts";
import { allTrails } from "../data/demo";
import { Icon } from "../components/Icon";
import { Match, DifficultyPill, dateLabel } from "../components/Shared";
import { analyze, durationLabel } from "../engine/telemetry";
import { goalLabels } from "../components/ProfileForm";

type Props = {
  profile: Profile;
  activities: Activity[];
  fits: Fit[];
  openMountain: (id: ResortId) => void;
  openTrail: (fit: Fit) => void;
  openActivity: (a: Activity) => void;
  onAsk: (request: string) => string;
  onNavigate: (page: string) => void;
};
export function Home({
  profile,
  activities,
  fits,
  openMountain,
  openTrail,
  openActivity,
  onAsk,
  onNavigate,
}: Props) {
  const [ranked, setRanked] = useState(false);
  const [request, setRequest] = useState("");
  const [answer, setAnswer] = useState("");
  const mountains = rankMountains(fits),
    best = mountains[0];
  const latest = [...activities]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);
  const top = best.top;
  return (
    <div className="home-page page-enter">
      <section className="hero">
        <div className="hero-image" />
        <div className="hero-topline">
          <span>
            <Icon name="location" size={15} /> NORTH SHORE, BC
          </span>
          <span className="hero-date">SATURDAY, JAN 17</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">YOUR MOUNTAIN. YOUR PACE.</p>
          <h1>
            Good morning, {profile.name}.<br />
            <span>Find your next feeling.</span>
          </h1>
          <p>
            Three mountains. A day of possibilities.
            <br />A little insight to make it yours.
          </p>
          <button
            className="primary hero-cta"
            onClick={() => {
              setRanked(true);
              setTimeout(
                () =>
                  document
                    .getElementById("mountain-picks")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                50,
              );
            }}
          >
            <Icon name="compass" />
            Where should I ride today?
            <Icon name="arrow" />
          </button>
        </div>
        <div className="hero-foot">
          <span>
            <span className="status-dot" /> DEMO REPLAY
          </span>
          <span>Historical winter scenario · simulated weather</span>
          <span className="hero-art-label">Illustrative scenery</span>
        </div>
      </section>
      <section id="mountain-picks" className="mountain-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">A LITTLE CLOSER TO YOUR KIND OF DAY</p>
            <h2>
              {ranked
                ? "Your mountains, ranked."
                : "The North Shore is calling."}
            </h2>
          </div>
          <span className="subtle-tag">
            {profile.ceiling.replace("-", " ")} ceiling{" "}
            <Icon name="check" size={13} />
          </span>
        </div>
        {ranked && (
          <div className="recommendation-reveal" role="status">
            <Icon name="star" size={24} />
            <div>
              <strong>
                {resortById[best.id].shortName} is your best fit today.
              </strong>
              <p>{best.reason}</p>
              <small>
                Mountain fit = 55% best run + 35% average of its top 3 + 10%
                suitable-terrain breadth. These are match scores, not safety
                probabilities.
              </small>
            </div>
          </div>
        )}
        <div className="mountain-grid">
          {mountains.map((m, i) => {
            const c = conditions[m.id];
            return (
              <button
                key={m.id}
                className={`mountain-card ${m.id}`}
                onClick={() => openMountain(m.id)}
                aria-label={`Explore ${resortById[m.id].shortName}`}
                style={
                  {
                    "--snow-brightness": `${0.65 + c.snowfall / 40}`,
                  } as React.CSSProperties
                }
              >
                <div className="mountain-card-art" />
                <div className={`mountain-fog ${c.visibility}`} />
                <div className="mountain-card-top">
                  <span
                    className={i === 0 ? "recommended-tag" : "mountain-index"}
                  >
                    {i === 0 ? (
                      <>
                        <Icon name="star" size={12} /> BEST FIT FOR YOU
                      </>
                    ) : (
                      `0${i + 1} / NORTH SHORE`
                    )}
                  </span>
                  <Match score={m.score} />
                </div>
                <div className="mountain-card-bottom">
                  <span className="mountain-place">
                    {resortById[m.id].location}
                  </span>
                  <h3>
                    {resortById[m.id].shortName}
                    <Icon name="arrow" size={22} />
                  </h3>
                  <div className="mountain-weather">
                    <span>
                      <Icon
                        name={c.visibility === "good" ? "sun" : "cloud"}
                        size={17}
                      />
                      {c.temperature}°
                    </span>
                    <span>
                      <Icon name="snow" size={15} />
                      {c.snowfall} cm <small>24h</small>
                    </span>
                    <span>
                      {c.visibility === "good"
                        ? "Clear breaks"
                        : c.visibility === "mixed"
                          ? "Light snow"
                          : "Low visibility"}
                    </span>
                  </div>
                  <div className="mountain-suitability">
                    <span>
                      <span className="status-dot" />
                      {m.suitable} runs fit your profile
                    </span>
                    <span>
                      {firmRisk(c) ? "Thaw/freeze risk" : "Winter scenario"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="data-note">
          <Icon name="info" size={13} /> Jan 17 demo: all weather is simulated.
          Resort operations and actual trail surfaces are unverified.
        </p>
      </section>
      <div className="home-lower">
        <section className="next-pick panel">
          <div className="section-title">
            <p className="eyebrow">
              <Icon name="target" size={15} /> A RUN WITH YOUR NAME ON IT
            </p>
            <span className="small-pill">{goalLabels[profile.goal]}</span>
          </div>
          {top ? (
            <>
              <div className="next-pick-main">
                <div>
                  <DifficultyPill difficulty={top.trail.difficulty} />
                  <h2>{top.trail.name}</h2>
                  <p>
                    {resortById[top.trail.resortId].name} ·{" "}
                    {((top.trail.lengthMeters ?? 0) / 1000).toFixed(2)} km
                    mapped
                  </p>
                </div>
                <Match score={top.score} large />
              </div>
              <p className="pick-reason">
                {top.reasons.find((r) => r.startsWith("A longer")) ??
                  top.reasons[0]}
              </p>
              <button className="secondary" onClick={() => openTrail(top)}>
                Meet your next run
                <Icon name="arrow" size={17} />
              </button>
            </>
          ) : (
            <p>
              No suitable runs yet. Adjust your profile to explore the mapped
              terrain.
            </p>
          )}
        </section>
        <section className="recent-section">
          <div className="section-title">
            <h3>Your last tracks</h3>
            <button
              className="text-button"
              onClick={() => onNavigate("activity")}
            >
              View all
              <Icon name="arrow" size={15} />
            </button>
          </div>
          {latest.length ? (
            latest.map((a) => {
              const trail = allTrails.find((t) => t.id === a.trailId)!;
              const s = analyze(a.telemetry);
              return (
                <button
                  className="recent-row"
                  key={a.id}
                  onClick={() => openActivity(a)}
                >
                  <div className={`trail-thumb ${trail.difficulty}`}>
                    <Icon name="mountain" size={30} />
                  </div>
                  <div>
                    <strong>{trail.name}</strong>
                    <span>
                      {resortById[a.resortId].shortName} · {dateLabel(a.date)}
                    </span>
                  </div>
                  <div className="recent-stat">
                    <strong>
                      {Math.round(s.vertical)} <small>m</small>
                    </strong>
                    <span>{durationLabel(s.duration)} · replay</span>
                  </div>
                  <Icon name="chevron" size={16} />
                </button>
              );
            })
          ) : (
            <div className="empty-inline">
              Your story starts with a run. Try a replay to add your first
              activity.
            </div>
          )}
        </section>
      </div>
      <section className="ask-strip">
        <div className="ask-label">
          <Icon name="compass" />
          <div>
            <strong>A different kind of day?</strong>
            <span>Tell SlopeSense what you're looking for.</span>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAnswer(onAsk(request));
          }}
        >
          <input
            aria-label="Ask SlopeSense"
            placeholder="I'd like an easy blue…"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            maxLength={200}
          />
          <button aria-label="Apply request" type="submit">
            <Icon name="arrow" />
          </button>
        </form>
        {answer && (
          <p className="ask-answer" role="status">
            {answer}
          </p>
        )}
      </section>
    </div>
  );
}
