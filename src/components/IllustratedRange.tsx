import type { CSSProperties } from "react";
import { resorts } from "../data/resorts";
import { mountainInfo } from "../data/mountains";
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
  return (
    <div
      className="illustrated-range"
      aria-label="Choose your North Shore mountain"
    >
      <img
        className="range-artwork"
        src="/assets/north-shore-diorama.png"
        alt="Illustrated three-mountain range viewed from above"
      />
      <div className="range-mist" aria-hidden="true" />
      {resorts.map((r) => {
        const c = weather[r.id],
          snow = c.snowing && !c.stale;
        return (
          <div
            className={`illustrated-mountain ${r.id}`}
            key={r.id}
            style={
              { "--mountain-color": mountainInfo[r.id].color } as CSSProperties
            }
          >
            {snow && (
              <div className="mountain-snow" aria-hidden="true">
                {Array.from({ length: 16 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      left: `${(i * 23) % 100}%`,
                      animationDelay: `${-(i % 7) * 0.7}s`,
                      animationDuration: `${3 + (i % 4)}s`,
                    }}
                  />
                ))}
              </div>
            )}
            <button
              className="illustrated-pin"
              onClick={() => onMountain(r.id)}
              aria-label={`Explore ${r.name}`}
            >
              <span className="mountain-beacon" />
              <span className="illustrated-pin-name">
                {r.shortName}
                <Icon name="chevron" size={13} />
              </span>
              <span className="illustrated-weather">
                {c.temperature === null ? "—" : `${Math.round(c.temperature)}°`}
                <span>{snow ? "Snowing" : c.description}</span>
              </span>
              <small>
                {c.snowfall === null
                  ? "Snow total unavailable"
                  : `${c.snowfall} cm / 24h`}
                {c.simulated ? " · demo" : c.stale ? " · cached" : " · est."}
              </small>
            </button>
          </div>
        );
      })}
      <span className="art-caption">ILLUSTRATED TERRAIN</span>
    </div>
  );
}
