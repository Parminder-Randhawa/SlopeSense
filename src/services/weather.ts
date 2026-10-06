import type { LiveWeather } from "../types/live";
import type { ResortId } from "../types/resort";
import { resorts } from "../data/resorts";
import { conditions } from "../data/conditions";
export type WeatherSet = Record<ResortId, LiveWeather>;
export const unknownWeather = (): LiveWeather => ({
  snowing: false,
  snowfallRate: null,
  windDirection: null,
  temperature: null,
  snowfall: null,
  wind: null,
  visibility: "unknown",
  daytimeHigh: null,
  overnightLow: null,
  description: "Weather unavailable",
  simulated: false,
  available: false,
  stale: false,
  observedAt: null,
  fetchedAt: null,
  source: "Open-Meteo",
  sourceUrl: "https://open-meteo.com/",
  modelled: true,
});
export const emptyWeather = (): WeatherSet =>
  Object.fromEntries(
    resorts.map((r) => [r.id, unknownWeather()]),
  ) as WeatherSet;
export function demoWeather(): WeatherSet {
  return Object.fromEntries(
    resorts.map((r) => [
      r.id,
      {
        ...unknownWeather(),
        ...conditions[r.id],
        available: true,
        source: "Simulated winter scenario",
        observedAt: null,
        modelled: false,
        snowing: r.id === "seymour",
        snowfallRate: r.id === "seymour" ? 0.8 : 0,
        windDirection: 245,
      },
    ]),
  ) as WeatherSet;
}
const descriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
export function parseWeather(data: any, now = Date.now()): LiveWeather {
  const c = data?.current;
  if (!finite(c?.time) || !finite(c?.temperature_2m))
    throw new Error("Incomplete forecast");
  const times: number[] = data.hourly?.time || [],
    snow = data.hourly?.snowfall || [];
  const previous = times
    .map((t, i) => ({ t, v: snow[i] }))
    .filter((x) => x.t <= c.time && x.t > c.time - 86400);
  const visIndex = times.findIndex((t) => t >= c.time),
    visibility = data.hourly?.visibility?.[visIndex];
  return {
    ...unknownWeather(),
    available: true,
    snowing: [71, 73, 75, 77, 85, 86].includes(c.weather_code),
    snowfallRate:
      finite(c.snowfall) &&
      c.snowfall >= 0 &&
      finite(c.interval) &&
      c.interval > 0 &&
      c.interval <= 3600
        ? (c.snowfall * 3600) / c.interval
        : null,
    windDirection:
      finite(c.wind_direction_10m) &&
      c.wind_direction_10m >= 0 &&
      c.wind_direction_10m <= 360
        ? c.wind_direction_10m
        : null,
    temperature: c.temperature_2m,
    wind: finite(c.wind_speed_10m) ? c.wind_speed_10m : null,
    snowfall:
      previous.length === 24 && previous.every((x) => finite(x.v))
        ? Math.round(previous.reduce((s, x) => s + x.v, 0) * 10) / 10
        : null,
    visibility: finite(visibility)
      ? visibility < 1000
        ? "low"
        : visibility < 5000
          ? "mixed"
          : "good"
      : "unknown",
    description: descriptions[c.weather_code] || "Conditions unavailable",
    observedAt: new Date(c.time * 1000).toISOString(),
    fetchedAt: new Date(now).toISOString(),
    stale: now - c.time * 1000 > 90 * 60000,
  };
}
export function cachedWeather(): WeatherSet {
  try {
    const data = JSON.parse(
      localStorage.getItem("slopesense:weather:v1") || "null",
    );
    if (
      data &&
      resorts.every(
        (r) =>
          typeof data[r.id]?.available === "boolean" &&
          typeof data[r.id]?.fetchedAt === "string",
      )
    )
      return Object.fromEntries(
        resorts.map((r) => [r.id, { ...data[r.id], stale: true }]),
      ) as WeatherSet;
  } catch {}
  return emptyWeather();
}
export async function fetchWeather(signal: AbortSignal): Promise<WeatherSet> {
  const params = new URLSearchParams({
    latitude: resorts.map((r) => r.center.lat).join(","),
    longitude: resorts.map((r) => r.center.lng).join(","),
    current:
      "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,snowfall",
    hourly: "snowfall,visibility",
    past_days: "1",
    forecast_days: "1",
    timezone: "UTC",
    timeformat: "unixtime",
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error("Weather provider unavailable");
  const raw = await response.json();
  if (!Array.isArray(raw) || raw.length !== 3)
    throw new Error("Incomplete weather response");
  const result = Object.fromEntries(
    resorts.map((r, i) => [r.id, parseWeather(raw[i])]),
  ) as WeatherSet;
  try {
    localStorage.setItem("slopesense:weather:v1", JSON.stringify(result));
  } catch {}
  return result;
}
