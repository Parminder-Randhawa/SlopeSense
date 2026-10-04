import { useState } from "react";
import type { SkiRun } from "../types/trail";
import type { ResortId } from "../types/resort";
import type { Profile } from "../types/rider";
import type { Fit } from "../engine/recommendations";
import { weights } from "../engine/recommendations";
import { resorts, resortById } from "../data/resorts";
import { trailsByResort } from "../data/trails";
import { conditions, firmRisk } from "../data/conditions";
import { TrailMap } from "../components/TrailMap";
import { DifficultyPill, Match, Notice } from "../components/Shared";
import { Icon } from "../components/Icon";
import { routeFor } from "../engine/route";

type Props = {
  resortId: ResortId;
  selected: SkiRun | null;
  fits: Fit[];
  profile: Profile;
  onResort: (id: ResortId) => void;
  onSelect: (trail: SkiRun) => void;
  onReplay: (trail: SkiRun, auto: boolean) => void;
};
const partNames = {
  ability: "Ability fit",
  terrain: "Terrain preferences",
  conditions: "Scenario conditions",
  progression: "Progression fit",
  evidence: "Riding evidence",
};
export function Mountain({
  resortId,
  selected,
  fits,
  profile,
  onResort,
  onSelect,
  onReplay,
}: Props) {
  const [filter, setFilter] = useState("all");
  const resort = resortById[resortId],
    c = conditions[resortId],
    trails = trailsByResort[resortId];
  const ranked = fits.filter((f) => f.trail.resortId === resortId),
    top = ranked[0];
  const fit = selected ? ranked.find((f) => f.trail.id === selected.id) : null;
  const shown = trails.filter(
    (t) =>
      filter === "all" ||
      (filter === "for-you"
        ? ranked.some((f) => f.trail.id === t.id)
        : t.difficulty === filter),
  );
  return (
    <div className="mountain-page page-enter">
      <div className="resort-switch" aria-label="Choose mountain">
        {resorts.map((r) => (
          <button
            key={r.id}
            className={resortId === r.id ? "active" : ""}
            onClick={() => {
              setFilter("all");
              onResort(r.id);
            }}
          >
            <Icon name="mountain" size={17} />
            {r.shortName}
          </button>
        ))}
      </div>
      <div className="mountain-heading">
        <div>
          <p className="eyebrow">{resort.location} · DEMO WINTER DAY</p>
          <h1>{resort.name}</h1>
        </div>
        <div className="condition-brief">
          <Icon name={c.visibility === "good" ? "sun" : "cloud"} size={30} />
          <strong>{c.temperature}°</strong>
          <span>
            {c.snowfall} cm new snow<small>Simulated · 24 hours</small>
          </span>
        </div>
      </div>
      <div className="explore-layout">
        <section className="map-area">
          <TrailMap
            key={resortId}
            resort={resort}
            trails={trails}
            selectedTrail={selected}
            onSelectTrail={onSelect}
            recommendedId={top?.trail.id}
          />
          <div className="map-underbar">
            <span>
              <Icon name="location" size={14} />
              {trails.length} real mapped trails
            </span>
            <span>
              <Icon name="star" size={14} />
              {ranked.length} within your ceiling
            </span>
            <span>Drag · pinch · tap a run</span>
          </div>
          <details className="conditions-details">
            <summary>
              <Icon name="cloud" size={16} /> Winter scenario details{" "}
              <Icon name="chevron" size={15} />
            </summary>
            <div className="conditions-body">
              <span>Wind: {c.wind} km/h</span>
              <span>Visibility: {c.visibility}</span>
              <span>Daytime high: {c.daytimeHigh}°C</span>
              <span>Overnight low: {c.overnightLow}°C</span>
              <p>
                {firmRisk(c)
                  ? "A simulated thaw followed by freezing raises estimated firm-surface risk. It does not establish the surface of this trail."
                  : "No freeze–thaw flag in this scenario. This does not establish the surface of any trail."}
              </p>
              <small>
                Fictional weather inputs for Jan 17, 2026. These are not
                historical observations or current ski conditions.
              </small>
            </div>
          </details>
        </section>
        <aside className="trail-panel">
          {selected ? (
            <>
              <div className="sheet-handle" />
              <div className="trail-detail-title">
                <div>
                  <p className="eyebrow">
                    {selected.id === top?.trail.id
                      ? "★ YOUR NEXT RUN"
                      : "TRAIL DETAILS"}
                  </p>
                  <h2>{selected.name}</h2>
                  <DifficultyPill difficulty={selected.difficulty} />
                </div>
                {fit && <Match score={fit.score} large />}
              </div>
              <div className="trail-attributes">
                <div>
                  <strong>
                    {((selected.lengthMeters ?? 0) / 1000).toFixed(2)}{" "}
                    <small>km</small>
                  </strong>
                  <span>Mapped length</span>
                </div>
                <div>
                  <strong>Unknown</strong>
                  <span>Surveyed vertical</span>
                </div>
                <div>
                  <strong>
                    {selected.grooming === "unknown"
                      ? "Unknown"
                      : selected.grooming}
                  </strong>
                  <span>OSM grooming</span>
                </div>
              </div>
              {fit ? (
                <>
                  <div className="fit-intro">
                    <Icon name="target" size={18} />
                    <h3>Why it fits you</h3>
                  </div>
                  <ul className="reasons">
                    {fit.reasons.slice(0, 3).map((r) => (
                      <li key={r}>
                        <Icon name="check" size={14} />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <details className="score-details">
                    <summary>
                      Inside your {fit.score}% match
                      <Icon name="plus" size={15} />
                    </summary>
                    <div className="score-parts">
                      {Object.entries(fit.parts).map(([key, value]) => (
                        <div className="score-part" key={key}>
                          <span>
                            {partNames[key as keyof typeof partNames]}
                            <small>
                              {weights[key as keyof typeof weights]}% weight
                            </small>
                          </span>
                          <div className="score-track">
                            <i style={{ width: `${value}%` }} />
                          </div>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                    <ul className="uncertainty-list">
                      {fit.uncertainty.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                    <p className="fine-print">
                      Weighted sum, then a −15 adjustment for the most recent
                      run or −5 for either of the two before it. A match score
                      is a preference ranking, not a skill percentage or safety
                      prediction. Unknown features receive no positive evidence.
                    </p>
                  </details>
                  <button
                    className="primary"
                    onClick={() => onReplay(selected, false)}
                  >
                    Ride this run
                    <Icon name="arrow" />
                  </button>
                  <button
                    className="secondary replay-button"
                    onClick={() => onReplay(selected, true)}
                  >
                    <Icon name="play" size={16} />
                    Demo Replay<span>Synthetic telemetry</span>
                  </button>
                </>
              ) : (
                <Notice>
                  This run is outside your selected terrain ceiling, unrated,
                  closed in the dataset, or excluded as backcountry. It is not
                  recommended. You can change your ceiling in Profile.
                </Notice>
              )}
              <details className="source-details">
                <summary>
                  Trail sources & what is unknown
                  <Icon name="info" size={14} />
                </summary>
                <p>
                  Coordinates, name and mapped rating: OpenStreetMap snapshot,
                  Oct 3, 2026. These community tags are not a verified official
                  resort rating. Grooming, exact gradient, elevation and daily
                  opening status may be unknown.
                </p>
                <p>
                  Replay follows{" "}
                  {routeFor(selected).partial
                    ? "the longest connected segment; disjoint ways are never bridged"
                    : "connected OSM geometry"}
                  . Its elevation, movement and pitch are simulated, and route
                  direction is not navigation guidance.
                </p>
                <div className="source-links">
                  {((selected.metadata?.osmWayIds as string[]) ?? []).map(
                    (id) => (
                      <a
                        key={id}
                        href={`https://www.openstreetmap.org/way/${id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        OSM way {id} ↗
                      </a>
                    ),
                  )}
                </div>
              </details>
            </>
          ) : (
            <div className="select-prompt">
              <Icon name="compass" size={36} />
              <h2>Find your line.</h2>
              <p>Tap a trail on the map, or explore your best matches below.</p>
              {top && (
                <button className="primary" onClick={() => onSelect(top.trail)}>
                  Explore {top.trail.name}
                  <Icon name="arrow" />
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
      <section className="trail-browser">
        <div className="section-title">
          <div>
            <p className="eyebrow">EXPLORE YOUR OPTIONS</p>
            <h2>Every run has a story.</h2>
          </div>
          <span className="muted">Ceiling: {profile.ceiling}</span>
        </div>
        <div className="chips filter-chips">
          {[
            ["all", "All trails"],
            ["for-you", "For you"],
            ["green", "● Green"],
            ["blue", "■ Blue"],
            ["black", "◆ Black"],
            ["double-black", "◆◆ Double black"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`chip ${filter === id ? "selected" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="trail-grid">
          {shown.length ? (
            shown.map((t) => {
              const f = ranked.find((x) => x.trail.id === t.id);
              return (
                <button
                  key={t.id}
                  className={`trail-row ${selected?.id === t.id ? "selected" : ""}`}
                  onClick={() => {
                    onSelect(t);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <DifficultyPill difficulty={t.difficulty} />
                  <div>
                    <strong>{t.name}</strong>
                    <span>
                      {((t.lengthMeters ?? 0) / 1000).toFixed(2)} km ·{" "}
                      {t.grooming === "unknown"
                        ? "grooming unknown"
                        : t.grooming}
                    </span>
                  </div>
                  <span className={f ? "fit-small" : "outside-limit"}>
                    {f ? `${f.score}%` : "Not eligible"}
                  </span>
                  <Icon name="chevron" size={15} />
                </button>
              );
            })
          ) : (
            <div className="empty-inline">
              No trails in this category for {resort.shortName}.
            </div>
          )}
        </div>
      </section>
      <Notice>
        Suggestions use your preferences and activity history. Follow official
        closures, signage and mountain warnings. SlopeSense does not determine
        terrain safety or provide backcountry or avalanche advice.
      </Notice>
    </div>
  );
}
