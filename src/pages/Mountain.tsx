import { useState } from "react";
import type { SkiRun } from "../types/trail";
import type { ResortId } from "../types/resort";
import type { Profile } from "../types/rider";
import type { Fit } from "../engine/recommendations";
import type { LiveWeather } from "../types/live";
import { resorts, resortById } from "../data/resorts";
import { trailsByResort } from "../data/trails";
import { mountainInfo } from "../data/mountains";
import { RunMap } from "../components/RunMap";
import { DifficultyPill } from "../components/Shared";
import { Icon } from "../components/Icon";
import { MiniMountain } from "../components/MiniMountain";
import { routeFor } from "../engine/route";
export function Mountain({
  resortId,
  selected,
  fits,
  profile,
  weather,
  onResort,
  onSelect,
  onRecord,
  onRefresh,
  loading,
}: {
  resortId: ResortId;
  selected: SkiRun | null;
  fits: Fit[];
  profile: Profile;
  weather: LiveWeather;
  onResort: (id: ResortId) => void;
  onSelect: (t: SkiRun | null) => void;
  onRecord: (t: SkiRun) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const [filter, setFilter] = useState("all"),
    resort = resortById[resortId],
    trails = trailsByResort[resortId],
    info = mountainInfo[resortId];
  const ranked = fits.filter((f) => f.trail.resortId === resortId),
    fit = ranked.find((f) => f.trail.id === selected?.id);
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
            className={r.id === resortId ? "active" : ""}
            onClick={() => {
              setFilter("all");
              onResort(r.id);
            }}
          >
            <Icon name="mountain" size={16} />
            {r.shortName}
          </button>
        ))}
      </div>
      <header className="mountain-live-heading">
        <div>
          <p className="eyebrow">{resort.location}</p>
          <h1>{resort.name}</h1>
        </div>
        <div className="weather-now">
          <Icon
            name={weather.description.includes("Clear") ? "sun" : "cloud"}
            size={28}
          />
          <strong>
            {weather.temperature === null
              ? "—"
              : `${Math.round(weather.temperature)}°`}
          </strong>
          <span>
            {weather.description}
            <small>
              {weather.simulated
                ? "Demo scenario"
                : weather.stale
                  ? "Cached forecast"
                  : "Weather model"}
            </small>
          </span>
        </div>
      </header>
      <div className="weather-strip">
        <span>
          <Icon name="snow" size={16} />
          <b>{weather.snowfall ?? "—"} cm</b> / past 24h{" "}
          {weather.simulated ? "(demo)" : "estimated"}
        </span>
        <span>
          <Icon name="wind" size={16} />
          {weather.wind ?? "—"} km/h wind
        </span>
        <button
          disabled={loading || weather.simulated}
          onClick={onRefresh}
          aria-label="Refresh weather"
        >
          <Icon name="reset" size={16} />
          {loading ? "Updating…" : "Refresh"}
        </button>
      </div>
      <div className="explore-layout live-explore">
        <section className="map-area">
          <RunMap
            key={resortId}
            resort={resort}
            trails={shown}
            selectedTrail={selected}
            onSelectTrail={onSelect}
            onClearSelection={()=>onSelect(null)}
            lockCamera
          />
          <div className="map-underbar">
            <span>● Green &nbsp; ■ Blue &nbsp; ◆ Black &nbsp; ◆◆ Expert</span>
            <span>Tap a run to focus · tap beside it to return</span>
          </div>
        </section>
        <aside className="trail-panel">
          {selected ? (
            <>
              <div className="trail-detail-title">
                <div>
                  <p className="eyebrow">
                    {fit ? "MATCHES YOUR TERRAIN LIMIT" : "MAPPED RUN"}
                  </p>
                  <h2>{selected.name}</h2>
                  <DifficultyPill difficulty={selected.difficulty} />
                </div>
                <button
                  className="icon-button"
                  aria-label="Close trail details"
                  onClick={() => onSelect(null)}
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className="trail-attributes">
                <div>
                  <strong>
                    {((selected.lengthMeters || 0) / 1000).toFixed(2)}{" "}
                    <small>km</small>
                  </strong>
                  <span>Mapped length</span>
                </div>
                <div>
                  <strong>
                    {selected.grooming === "groomed" ? "Groomed" : "Unverified"}
                  </strong>
                  <span>
                    {selected.grooming === "groomed"
                      ? "OSM tag · daily unknown"
                      : "Daily grooming"}
                  </span>
                </div>
              </div>
              {fit ? (
                <>
                  <h3>Why this run</h3>
                  <ul className="reasons">
                    {fit.reasons.slice(0, 3).map((r) => (
                      <li key={r}>
                        <Icon name="check" size={15} />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="primary"
                    onClick={() => onRecord(selected)}
                  >
                    <Icon name="play" size={16} />
                    Record this run
                  </button>
                </>
              ) : (
                <p className="inline-notice">
                  This run is outside your selected terrain limit or excluded
                  from recommendations. Update your limit in Profile if needed.
                </p>
              )}
              <a
                className="official-link"
                href={info.official}
                target="_blank"
                rel="noreferrer"
              >
                Check official conditions & openings ↗
              </a>
              <details className="source-details">
                <summary>Map accuracy & sources</summary>
                <p>
                  Community-mapped OSM trails, snapshot October 3, 2026. This is
                  a selection of mapped runs, not a complete resort map.
                  Ratings, daily openings and grooming need confirmation from
                  the resort.
                </p>
                <p>
                  {routeFor(selected).partial
                    ? "Some source ways are disconnected. Only shared endpoints are joined; unmapped gaps remain visible."
                    : "Connected source ways are joined at their shared endpoints."}{" "}
                  Geometry does not establish downhill direction.
                </p>
                <div className="source-links">
                  {((selected.metadata?.osmWayIds as string[]) || []).map(
                    (id) => (
                      <a
                        key={id}
                        href={`https://www.openstreetmap.org/way/${id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        OSM {id} ↗
                      </a>
                    ),
                  )}
                </div>
              </details>
            </>
          ) : (
            <>
              <MiniMountain resortId={resortId} />
              <p className="eyebrow">{shown.length} MAPPED RUNS</p>
              <h2>Pick your line.</h2>
              <p>Choose a run to focus its route. Tap beside it or use All runs to return.</p>
              {ranked[0] && (
                <button
                  className="primary"
                  onClick={() => onSelect(ranked[0].trail)}
                >
                  Explore {ranked[0].trail.name}
                  <Icon name="arrow" />
                </button>
              )}
              <a
                className="official-link"
                href={info.official}
                target="_blank"
                rel="noreferrer"
              >
                Official mountain report ↗
              </a>
            </>
          )}
        </aside>
      </div>
      <div className="trail-browser">
        <div className="section-title">
          <h2>Runs at {resort.shortName}</h2>
          <span className="muted">Your limit: {profile.ceiling}</span>
        </div>
        <div className="chips filter-chips">
          {[
            ["all", "All runs"],
            ["for-you", "For you"],
            ["green", "● Green"],
            ["blue", "■ Blue"],
            ["black", "◆ Black"],
            ["double-black", "◆◆ Expert"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`chip ${filter === id ? "selected" : ""}`}
              onClick={() => {
                setFilter(id);
                onSelect(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="trail-grid">
          {shown.map((t) => (
            <button
              key={t.id}
              className={`trail-row ${selected?.id === t.id ? "selected" : ""}`}
              onClick={() => {
                onSelect(t);
                document
                  .querySelector(".live-explore")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <DifficultyPill difficulty={t.difficulty} />
              <div>
                <strong>{t.name}</strong>
                <span>
                  {((t.lengthMeters || 0) / 1000).toFixed(2)} km mapped
                </span>
              </div>
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </div>
        {!shown.length && (
          <p className="empty-inline">No mapped runs in this category.</p>
        )}
      </div>
      <p className="data-note">
        {weather.simulated
          ? "Simulated winter weather for the hackathon."
          : `${weather.observedAt ? `Model valid ${new Date(weather.observedAt).toLocaleString()}. ` : ""}Open-Meteo estimates at the map location, not a resort snow report. Snowfall is estimated, not a measured snow stake total.`}{" "}
      </p>
    </div>
  );
}
