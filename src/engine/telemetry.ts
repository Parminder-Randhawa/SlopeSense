import type { SkiRun } from "../types/trail";
import type { Analysis, Persona, Sample, TelemetryEvent } from "../types/rider";
import { pointAt, routeFor } from "./route";

export const sectionLabels = [
  "Opening section",
  "Steeper middle",
  "Rolling finish",
];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Deterministic synthetic movement on real OSM coordinates. Elevation and pitch
// are scenario inputs, never asserted as surveyed trail attributes.
export function simulateRun(trail: SkiRun, persona: Persona): Sample[] {
  const route = routeFor(trail);
  const samples: Sample[] = [];
  let distance = 0,
    elevation = 1180,
    lastSpeed = 0,
    pauseRemaining = 0;
  const pauses =
    persona === "smooth"
      ? [0.59]
      : persona === "developing"
        ? [0.38, 0.62]
        : [0.25, 0.48, 0.73];
  let pauseIndex = 0;
  for (let time = 0; time < 3600; time++) {
    const progress = distance / route.length;
    const section = progress < 0.33 ? 0 : progress < 0.68 ? 1 : 2;
    const gradient =
      [11, 23, 14][section] + Math.sin(progress * Math.PI * 8) * 2;
    if (pauseIndex < pauses.length && progress >= pauses[pauseIndex]) {
      pauseRemaining =
        persona === "smooth" ? 5 : persona === "developing" ? 11 : 17;
      pauseIndex++;
    }
    const base =
      persona === "smooth" ? 7.5 : persona === "developing" ? 6.4 : 4.7;
    const slowdown =
      section === 1
        ? persona === "smooth"
          ? 0.89
          : persona === "developing"
            ? 0.62
            : 0.51
        : 1;
    let speed =
      base *
      slowdown *
      (1 + Math.sin(time / 12) * (persona === "smooth" ? 0.075 : 0.19));
    speed *= Math.min(1, time / 7);
    if (pauseRemaining > 0) {
      speed = 0;
      pauseRemaining--;
    }
    if (time === 0) speed = 0;
    const delta = time === 0 ? 0 : Math.min(speed, route.length - distance);
    distance += delta;
    elevation -= (delta * gradient) / 100;
    const kmh = delta * 3.6;
    samples.push({
      time,
      ...pointAt(route, distance),
      elevation,
      distance,
      speed: kmh,
      gradient,
      acceleration: (kmh - lastSpeed) / 3.6,
      section,
    });
    lastSpeed = kmh;
    if (distance >= route.length) break;
  }
  return samples;
}

export function analyze(samples: Sample[]): Analysis {
  if (samples.length < 2)
    return {
      duration: 0,
      distance: 0,
      vertical: 0,
      averageSpeed: 0,
      movingAverage: 0,
      maxSpeed: 0,
      stops: 0,
      stopSeconds: 0,
      longestStop: 0,
      consistency: 0,
      speedCV: 0,
      events: [],
      observations: [],
      sections: [],
    };
  const first = samples[0],
    last = samples.at(-1)!;
  const duration = samples
      .slice(1)
      .reduce(
        (sum, p, i) =>
          sum + (p.breakBefore ? 0 : Math.max(0, p.time - samples[i].time)),
        0,
      ),
    distance = last.distance - first.distance;
  let stops = 0,
    stopSeconds = 0,
    longestStop = 0,
    stopStart: number | null = null;
  let vertical = 0,
    movingTime = 0,
    weightedSpeed = 0,
    weightedSquared = 0;
  const events: TelemetryEvent[] = [];
  let lastMotionEvent = -20;
  const commitStop = (end: number) => {
    if (stopStart === null) return;
    const seconds = end - stopStart;
    if (seconds >= 3) {
      stops++;
      stopSeconds += seconds;
      longestStop = Math.max(longestStop, seconds);
      events.push({
        time: stopStart + 3,
        type: "stop",
        title: "Stop detected",
        detail: `${Math.round(seconds)} seconds stationary`,
      });
    }
    stopStart = null;
  };
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i],
      prev = samples[i - 1],
      dt = p.time - prev.time;
    if (dt <= 0) continue;
    if (p.breakBefore) {
      commitStop(prev.time);
      continue;
    }
    if (p.elevationKnown !== false && prev.elevationKnown !== false)
      vertical += Math.max(0, prev.elevation - p.elevation);
    if (p.speed < 1) {
      if (stopStart === null) stopStart = prev.time;
    } else {
      commitStop(prev.time);
      movingTime += dt;
      weightedSpeed += p.speed * dt;
      weightedSquared += p.speed ** 2 * dt;
    }
    if (p.section !== prev.section && p.section === 1)
      events.push({
        time: p.time,
        type: "gradient",
        title: "Gradient increasing",
        detail: `${Math.round(prev.gradient)}% → ${Math.round(p.gradient)}% · simulated pitch`,
      });
    const before = samples[Math.max(0, i - 6)];
    if (
      p.time - lastMotionEvent > 12 &&
      p.speed > 1 &&
      before.speed > 1 &&
      Math.abs(p.speed - before.speed) > 5
    ) {
      const slowing = p.speed < before.speed;
      events.push({
        time: p.time,
        type: slowing ? "slowdown" : "accelerate",
        title: slowing ? "Speed decreased" : "Accelerating",
        detail: `${Math.round(before.speed)} → ${Math.round(p.speed)} km/h${slowing && p.section === 1 ? " in steeper section" : ""}`,
      });
      lastMotionEvent = p.time;
    }
  }
  commitStop(last.time);
  const mean = movingTime ? weightedSpeed / movingTime : 0;
  const deviation = Math.sqrt(
    Math.max(0, movingTime ? weightedSquared / movingTime - mean ** 2 : 0),
  );
  const speedCV = mean > 0 ? deviation / mean : 0;
  const consistency = mean > 0 ? clamp(100 * (1 - speedCV), 0, 100) : 0;
  const sections = sectionLabels.map((label, index) => {
    const segment = samples.filter((s) => s.section === index);
    return {
      label,
      averageSpeed:
        segment.reduce((n, s) => n + s.speed, 0) / (segment.length || 1),
      gradient:
        segment.reduce((n, s) => n + s.gradient, 0) / (segment.length || 1),
      stops: events.filter(
        (e) => e.type === "stop" && segment.some((s) => s.time === e.time),
      ).length,
    };
  });
  const observations = [
    `${stops} ${stops === 1 ? "stop" : "stops"} detected${stops ? `; longest ${Math.round(longestStop)} seconds` : ""}.`,
    `Moving-speed variation: ${Math.round(speedCV * 100)}% (lower means a more even pace).`,
  ];
  if (
    sections[0].averageSpeed &&
    sections[1].averageSpeed < sections[0].averageSpeed * 0.8
  )
    observations.push(
      "Average speed decreased in the simulated steeper middle section.",
    );
  if (
    sections[1].averageSpeed > 0 &&
    sections[2].averageSpeed > sections[1].averageSpeed * 1.1
  )
    observations.push("Average speed increased through the rolling finish.");
  return {
    elevationAvailable: samples.some((s) => s.elevationKnown !== false),
    duration,
    distance,
    vertical,
    averageSpeed: duration ? (distance / duration) * 3.6 : 0,
    movingAverage: mean,
    maxSpeed: Math.max(...samples.map((p) => p.speed)),
    stops,
    stopSeconds,
    longestStop,
    consistency,
    speedCV,
    events: events.sort((a, b) => a.time - b.time),
    observations,
    sections,
  };
}

export function sampleAt(samples: Sample[], time: number): Sample {
  const index = samples.findIndex((s) => s.time >= time);
  if (index <= 0) return index < 0 ? samples.at(-1)! : samples[0];
  const a = samples[index - 1],
    b = samples[index],
    t = (time - a.time) / (b.time - a.time);
  if (b.breakBefore) return time < b.time ? a : b;
  return {
    ...b,
    time,
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    elevation: a.elevation + (b.elevation - a.elevation) * t,
    distance: a.distance + (b.distance - a.distance) * t,
    speed: a.speed + (b.speed - a.speed) * t,
    gradient: a.gradient + (b.gradient - a.gradient) * t,
    acceleration: b.acceleration,
    section: b.section,
  };
}
export function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
