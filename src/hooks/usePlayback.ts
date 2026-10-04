import { useEffect, useRef, useState } from "react";
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(4);
  const last = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last.current) / 1000, 0.25);
      last.current = now;
      setTime((t) => Math.min(duration, t + dt * rate));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rate, duration]);
  useEffect(() => {
    if (time >= duration) setPlaying(false);
  }, [time, duration]);
  return {
    time,
    playing,
    rate,
    setRate,
    setPlaying,
    seek: (value: number) => setTime(Math.max(0, Math.min(duration, value))),
    restart: () => {
      setTime(0);
      setPlaying(false);
    },
  };
}
