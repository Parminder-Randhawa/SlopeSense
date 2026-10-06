import type { Activity, Profile } from "../types/rider";
import type { ResortId } from "../types/resort";
import type { Fit } from "../engine/recommendations";
import { IllustratedRange } from "../components/IllustratedRange";
import { Icon } from "../components/Icon";
import { DifficultyPill } from "../components/Shared";
import { resortById } from "../data/resorts";
import { analyze } from "../engine/telemetry";
import type { WeatherSet } from "../services/weather";
export function Home({
  profile,
  activities,
  fits,
  weather,
  demo,
  openMountain,
  openTrail,
  onNavigate,
}: {
  profile: Profile;
  activities: Activity[];
  fits: Fit[];
  weather: WeatherSet;
  demo: boolean;
  openMountain: (id: ResortId) => void;
  openTrail: (fit: Fit) => void;
  onNavigate: (page: string) => void;
}) {
  const top = fits[0],
    distance = activities.reduce(
      (n, a) => n + analyze(a.telemetry).distance,
      0,
    );
  return (
    <div className="home-page page-enter">
      <section className="range-scene">
        <IllustratedRange weather={weather} onMountain={openMountain} />

        <div className="range-intro">
          <p className="eyebrow">
            <span className="status-dot" /> NORTH SHORE · BRITISH COLUMBIA
          </p>
          <h1>
            Find your
            <br />
            <em>next line.</em>
          </h1>
          <p>Three mountains. Choose your terrain.</p>
        </div>
        <div className="range-coordinates">
          49° 23′ N &nbsp; 123° 05′ W <span>EXPLORE THE NORTH SHORE</span>
        </div>
        <div className="range-bottom">
          <div className="range-next">
            <p className="eyebrow">
              {demo ? "DEMO PICK" : "WITHIN YOUR TERRAIN LIMIT"}
            </p>
            {top ? (
              <>
                <button
                  className="next-run-title"
                  onClick={() => openTrail(top)}
                >
                  <h2>{top.trail.name}</h2>
                  <Icon name="arrow" />
                </button>
                <div className="next-run-detail">
                  <DifficultyPill difficulty={top.trail.difficulty} />
                  <span>
                    {resortById[top.trail.resortId].shortName} ·{" "}
                    {((top.trail.lengthMeters || 0) / 1000).toFixed(2)} km
                    mapped
                  </span>
                </div>
                <p className="next-run-reason">
                  {top.reasons.find(
                    (r) =>
                      !r.startsWith("Within") &&
                      !/weather|freeze|snow|visibility/i.test(r),
                  ) ||
                    `A mapped ${top.trail.difficulty} run for your ${profile.goal} goal.`}
                </p>
                <small>
                  Opening status unverified · check the resort before riding
                </small>
              </>
            ) : (
              <p>No mapped runs match your terrain limit.</p>
            )}
          </div>
          <div className="range-stats">
            <div>
              <strong>{activities.length}</strong>
              <span>{demo ? "demo rides" : "saved rides"}</span>
            </div>
            <div>
              <strong>
                {(distance / 1000).toFixed(1)}
                <small> km</small>
              </strong>
              <span>recorded distance</span>
            </div>
            <button className="primary" onClick={() => onNavigate("record")}>
              <Icon name="play" size={17} />
              Start a ride
            </button>
          </div>
        </div>
        <section className="home-shortcuts" aria-label="Your riding">
          <button onClick={() => onNavigate("activity")}>
            <span className="shortcut-icon">
              <Icon name="play" />
            </span>
            <span>
              <strong>Rides & replays</strong>
              <small>
                {activities.length
                  ? `${activities.length} saved rides · replay your tracks`
                  : "Your saved tracks live here"}
              </small>
            </span>
            <Icon name="chevron" size={17} />
          </button>
          <button onClick={() => onNavigate("progress")}>
            <span className="shortcut-icon">
              <Icon name="progress" />
            </span>
            <span>
              <strong>Your progress</strong>
              <small>Distance, terrain & riding patterns</small>
            </span>
            <Icon name="chevron" size={17} />
          </button>
        </section>
      </section>
    </div>
  );
}
