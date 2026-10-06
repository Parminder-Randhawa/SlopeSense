import { useEffect, useRef } from "react";
import type { WeatherSet } from "../services/weather";
import type { LiveWeather } from "../types/live";
import { homeArtwork, type ArtworkFrame } from "../data/homeArtwork";
import { resorts } from "../data/resorts";
/** Visual mapping, not a physical snowfall simulation. Rate is cm/hour. */
export function snowMotion(weather: LiveWeather) {
  const rate = weather.snowfallRate;
  if (
    !weather.available ||
    weather.stale ||
    !weather.snowing ||
    !Number.isFinite(rate) ||
    rate === null ||
    rate <= 0
  )
    return { count: 0, fall: 0, drift: 0 };
  const intensity = Math.min(1, Math.log1p(rate) / Math.log(5));
  const wind = Math.min(60, Math.max(0, weather.wind || 0));
  return {
    count: Math.round(24 + intensity * 180),
    fall: 13 + intensity * 12,
    drift:
      -Math.sin(((weather.windDirection || 0) * Math.PI) / 180) * wind * 0.65,
  };
}
export function MountainSnow({
  weather,
  frame = "wide",
}: {
  weather: WeatherSet;
  frame?: ArtworkFrame;
}) {
  const zones = resorts.map(
    (r) => [r.id, ...homeArtwork[frame].mountains[r.id].glow] as const,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const signature = JSON.stringify(
    zones.map(([id]) => snowMotion(weather[id])),
  );
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0,
      last = 0,
      width = 1,
      height = 1,
      visible = true;
    const fields = zones.map(([id, x, y, rx, ry]) => ({
      x,
      y,
      rx,
      ry,
      ...snowMotion(weather[id]),
      particles: Array.from(
        { length: snowMotion(weather[id]).count },
        (_, i) => ({
          x: ((i * 0.61803398875) % 1) * 2 - 1,
          y: ((i * 0.41421356237) % 1) * 2 - 1,
          depth: 0.35 + (i % 7) / 10,
          phase: i * 2.39,
        }),
      ),
    }));
    const resize = () => {
      const box = el.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      const dpr = Math.min(
        devicePixelRatio || 1,
        frame === "portrait" || frame === "tall" ? 3 : 2,
      );
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const f of fields)
        for (const p of f.particles) {
          p.y += (dt * f.fall * p.depth) / (height * f.ry);
          p.x +=
            (dt * (f.drift * p.depth + Math.sin(now / 2100 + p.phase) * 3)) /
            (width * f.rx);
          if (p.y > 1) p.y = -1;
          if (p.x > 1) p.x = -1;
          if (p.x < -1) p.x = 1;
          const edge = Math.max(0, 1 - p.x * p.x - p.y * p.y);
          if (!edge) continue;
          ctx.globalAlpha = edge * (0.28 + p.depth * 0.55);
          ctx.fillStyle = "#eaf2f4";
          ctx.beginPath();
          ctx.ellipse(
            (f.x + p.x * f.rx) * width,
            (f.y + p.y * f.ry) * height,
            0.65 + p.depth * 1.1,
            0.9 + p.depth * 1.35,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      animationFrame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, width, height);
      if (
        !reduced.matches &&
        !document.hidden &&
        visible &&
        fields.some((f) => f.count)
      ) {
        last = performance.now();
        animationFrame = requestAnimationFrame(tick);
      }
    };
    const resizeObserver = new ResizeObserver(() => {
      resize();
      sync();
    });
    resizeObserver.observe(el);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    resize();
    sync();
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [signature, frame]);
  return (
    <canvas ref={canvas} className="mountain-snow-canvas" aria-hidden="true" />
  );
}
