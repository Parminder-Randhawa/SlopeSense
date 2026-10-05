import { useEffect, useState, useCallback } from "react";
import { cachedWeather, demoWeather, fetchWeather } from "../services/weather";
export function useWeather(demo: boolean) {
  const [weather, setWeather] = useState(cachedWeather),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const update = async () => {
      setLoading(true);
      timer = setTimeout(() => controller.abort(), 15000);
      try {
        const result = await fetchWeather(controller.signal);
        if (!controller.signal.aborted) {
          setWeather(result);
          setError("");
        }
      } catch {
        if (!stopped) {
          setWeather(
            (w) =>
              Object.fromEntries(
                Object.entries(w).map(([id, c]) => [
                  id,
                  { ...c, stale: c.available },
                ]),
              ) as typeof w,
          );
          setError("Weather could not refresh.");
        }
      } finally {
        clearTimeout(timer);
        if (!stopped) setLoading(false);
      }
    };
    let stopped = false;
    void update();
    const interval = setInterval(refresh, 10 * 60000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(interval);
      controller.abort();
    };
  }, [demo, revision, refresh]);
  return {
    weather: demo ? demoWeather() : weather,
    loading: !demo && loading,
    error: demo ? "" : error,
    refresh,
  };
}
