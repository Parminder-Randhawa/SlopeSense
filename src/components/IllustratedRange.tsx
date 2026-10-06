import { useId, useState, type CSSProperties } from "react";
import { resorts } from "../data/resorts";
import {
  homeArtwork,
  frameForViewport,
  type ArtworkFrame,
} from "../data/homeArtwork";
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
  const [frame, setFrame] = useState(frameForViewport);
  const artwork = homeArtwork[frame];
  const mask = useId();
  const blur = `${mask}-blur`;
  return (
    <div
      className="illustrated-range"
      data-frame={frame}
      style={
        { "--image-aspect": artwork.width / artwork.height } as CSSProperties
      }
      aria-label="Choose your North Shore mountain"
    >
      <picture>
        <source
          media="(max-aspect-ratio: 9/25)"
          srcSet={homeArtwork.tall.src}
        />
        <source
          media="(max-aspect-ratio: 1/1)"
          srcSet={homeArtwork.portrait.src}
        />
        <source media="(max-height: 500px)" srcSet={homeArtwork.medium.src} />
        <source
          media="(max-aspect-ratio: 7/5)"
          srcSet={homeArtwork.medium.src}
        />
        <img
          className="range-artwork"
          src={homeArtwork.wide.src}
          width={homeArtwork.wide.width}
          height={homeArtwork.wide.height}
          decoding="async"
          fetchPriority="high"
          onLoad={(event) => {
            const src = event.currentTarget.currentSrc;
            const selected = (Object.keys(homeArtwork) as ArtworkFrame[]).find(
              (key) => src.endsWith(homeArtwork[key].src),
            );
            if (selected) setFrame(selected);
          }}
          alt="Illustrated Cypress with its Olympic rings, Grouse with its complete summit and turbine, and Seymour’s wooded ridge"
        />
      </picture>
      <svg
        className="mountain-lighting"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          <mask
            id={mask}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
          >
            <rect width="100" height="100" fill="white" />
            {resorts.map((r) => {
              const [x, y, rx, ry] = artwork.mountains[r.id].glow;
              return (
                <ellipse
                  key={r.id}
                  cx={x * 100}
                  cy={y * 100}
                  rx={rx * 100}
                  ry={ry * 100}
                  fill="black"
                  filter={`url(#${blur})`}
                />
              );
            })}
          </mask>
        </defs>
        <rect
          width="100"
          height="100"
          fill="#06131b"
          opacity=".55"
          mask={`url(#${mask})`}
        />
      </svg>
      <MountainSnow weather={weather} frame={frame} />
      {resorts.map((r) => {
        const c = weather[r.id],
          snow = c.snowing && !c.stale;
        const mountain = artwork.mountains[r.id];
        return (
          <div
            className={`illustrated-mountain ${r.id}`}
            key={r.id}
            data-summit={mountain.summit.join(",")}
            data-landmark={mountain.landmark.join(",")}
            style={
              {
                "--mountain-x": mountain.label[0],
                "--mountain-y": mountain.label[1],
              } as CSSProperties
            }
          >
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
    </div>
  );
}
