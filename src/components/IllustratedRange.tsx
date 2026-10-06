import { useState } from "react";
import { resorts } from "../data/resorts";
import { MountainSnow } from "./MountainSnow";
import type { ResortId } from "../types/resort";
import type { WeatherSet } from "../services/weather";
import { Icon } from "./Icon";
export function IllustratedRange({
  weather,
  onMountain,
}: {
  weather: WeatherSet;
  onMountain: (id: ResortId) => void;
}) {
  const [portrait, setPortrait] = useState(
    () => matchMedia("(max-width: 600px)").matches,
  );
  return (
    <div
      className="illustrated-range"
      aria-label="Choose your North Shore mountain"
    >
      <picture>
        <source
          media="(max-width: 600px)"
          srcSet="/assets/north-shore-portrait.png"
        />
        <img
          className="range-artwork"
          src="/assets/north-shore-detailed.png"
          width="1254"
          height="1254"
          decoding="async"
          fetchPriority="high"
          onLoad={(event) =>
            setPortrait(
              event.currentTarget.naturalHeight >
                event.currentTarget.naturalWidth * 1.5,
            )
          }
          alt="Illustrated Cypress with its Olympic rings, Grouse with its summit turbine, and Seymour’s wooded ridge"
        />
      </picture>
      <MountainSnow weather={weather} portrait={portrait} />
      {resorts.map((r) => {
        const c = weather[r.id],
          snow = c.snowing && !c.stale;
        return (
          <div className={`illustrated-mountain ${r.id}`} key={r.id}>
            <button
              className="illustrated-pin"
              onClick={() => onMountain(r.id)}
              aria-label={`Explore ${r.name}`}
            >
              <span className="illustrated-pin-name">
                {r.shortName}
                <Icon name="chevron" size={13} />
              </span>
              <span className="illustrated-weather">
                {c.temperature === null ? "—" : `${Math.round(c.temperature)}°`}
                {snow && <span>Snowing</span>}
              </span>
              <small>
                {c.snowfall === null
                  ? "Snow unavailable"
                  : `${c.snowfall} cm / 24h`}
                {c.snowfall === null
                  ? ""
                  : c.simulated
                    ? " · demo"
                    : c.stale
                      ? " · cached"
                      : " · est."}
              </small>
            </button>
          </div>
        );
      })}
      <span className="art-caption">
        Illustrated winter terrain · select a mountain
      </span>
    </div>
  );
}
