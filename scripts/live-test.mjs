import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
});
let checks = 0;
const ok = (value, label) => {
  assert.ok(value, label);
  checks++;
  console.log("✓ " + label);
};
try {
  const { processGps, nearestTrail } =
    await server.ssrLoadModule("/src/engine/gps.ts");
  const { analyze, sampleAt } = await server.ssrLoadModule(
    "/src/engine/telemetry.ts",
  );
  const { parseWeather, emptyWeather } = await server.ssrLoadModule(
    "/src/services/weather.ts",
  );
  const { rankTrails } = await server.ssrLoadModule(
    "/src/engine/recommendations.ts",
  );
  const { allTrails, demoProfile, seedActivities } =
    await server.ssrLoadModule("/src/data/demo.ts");
  const { routeFor } = await server.ssrLoadModule("/src/engine/route.ts");
  const { trailsToFeatureCollection } = await server.ssrLoadModule(
    "/src/lib/trailParser.ts",
  );
  const samples = seedActivities();
  ok(
    samples.length === 18 && new Set(samples.map((a) => a.id)).size === 18,
    "Extended sample season has unique stable ride IDs",
  );
  ok(
    samples.every(
      (a) =>
        a.simulated &&
        a.telemetry.length > 1 &&
        allTrails.some((t) => t.id === a.trailId),
    ),
    "Every sample ride has a replayable mapped route and provenance",
  );
  ok(
    new Set(samples.map((a) => a.resortId)).size === 3,
    "Sample season covers all three mountains",
  );
  const { ridingProgress } = await server.ssrLoadModule(
    "/src/engine/progression.ts",
  );
  const emptyProgress = ridingProgress([], allTrails, demoProfile);
  ok(
    emptyProgress.level === 1 && emptyProgress.xp === 0,
    "New rider starts at level one with zero XP",
  );
  const season = ridingProgress(samples, allTrails, demoProfile);
  ok(
    season.level > 1 && season.unique > 2 && season.completed > 3,
    "Completed sample rides earn levels and distinct-run badges",
  );
  ok(
    ridingProgress([...samples, ...samples], allTrails, demoProfile).xp ===
      season.xp,
    "Duplicate ride IDs cannot earn extra XP",
  );
  ok(
    ridingProgress(samples, allTrails, { ...demoProfile, ceiling: "green" })
      .xp === season.xp,
    "Changing terrain limit does not remove earned experience",
  );
  ok(
    ridingProgress(
      samples.map((a) => ({
        ...a,
        telemetry: a.telemetry.map((p) => ({ ...p, speed: p.speed * 2 })),
      })),
      allTrails,
      demoProfile,
    ).xp === season.xp,
    "Higher speed earns no progression bonus",
  );
  ok(
    ridingProgress([{ ...samples[0], trailId: "" }], allTrails, demoProfile)
      .xp === 0,
    "Unmatched rides do not claim completed-run XP",
  );
  ok(
    ridingProgress(
      [{ ...samples[0], telemetry: samples[0].telemetry.slice(0, 2) }],
      allTrails,
      demoProfile,
    ).xp === 0,
    "Trivial recordings cannot unlock levels",
  );
  ok(
    ridingProgress(
      [{ ...samples[0], simulated: false, matchingConfidence: 0.2 }],
      allTrails,
      demoProfile,
    ).xp === 0,
    "Low-confidence live matches do not earn route XP",
  );
  ok(
    ridingProgress(
      [
        {
          ...samples[0],
          simulated: false,
          matchingConfidence: 0.8,
          telemetry: samples[0].telemetry.map((p) => ({
            ...p,
            lat: 40,
            lng: -100,
          })),
        },
      ],
      allTrails,
      demoProfile,
    ).xp === 0,
    "Manually naming an unrelated run cannot earn route XP",
  );
  ok(
    ridingProgress(
      [{ ...samples[0], simulated: false, matchingConfidence: 0.8 }],
      allTrails,
      demoProfile,
    ).xp === 150,
    "A sufficiently matched completed GPS ride earns first-route XP",
  );
  ok(
    ridingProgress([], allTrails, {
      ...demoProfile,
      ceiling: "green",
    }).nextRuns.every((t) => t.difficulty === "green"),
    "Level challenges stay inside the user's terrain limit",
  );
  const { loadMapContext } = await server.ssrLoadModule(
    "/src/data/mapContext.ts",
  );
  for (const id of ["cypress", "grouse", "seymour"]) {
    const context = await loadMapContext(id);
    ok(
      context.features.some((f) => f.properties.kind === "connector") &&
        context.features.some((f) => f.properties.kind === "lift"),
      `${id} includes sourced connectors and lifts`,
    );
    ok(
      context.features.every((f) => /^\d+$/.test(f.properties.osmWayId)),
      `${id} context has inspectable OSM provenance`,
    );
  }
  const dates = samples.map((a) => Date.parse(a.date));
  ok(
    Math.max(...dates) - Math.min(...dates) > 6 * 7 * 86400000,
    "Sample history spans enough weeks for progress charts",
  );
  const { mapStyle } = await server.ssrLoadModule("/src/lib/mapStyle.ts");
  const dark = mapStyle();
  ok(
    dark.sources.openmaptiles.url === "https://tiles.openfreemap.org/planet" &&
      dark.sources.openmaptiles.attribution.includes("OpenStreetMap"),
    "Detailed basemap uses dark tiles with provider attribution",
  );
  const base = Date.parse("2026-10-05T12:00:00Z");
  const fix = (seq, lat = 49, lng = -123, extra = {}) => ({
    seq,
    timestamp: new Date(base + seq * 1000).toISOString(),
    latitude: lat,
    longitude: lng,
    altitude: null,
    altitudeAccuracy: null,
    accuracy: 4,
    speed: null,
    heading: null,
    ...extra,
  });
  const normal = processGps(
    Array.from({ length: 8 }, (_, i) => fix(i, 49 + i * 0.00005)),
    [],
  );
  ok(
    normal.samples.length === 8 && analyze(normal.samples).distance > 30,
    "Usable GPS movement produces distance",
  );
  ok(
    !analyze(normal.samples).elevationAvailable,
    "Missing altitude remains unknown",
  );
  ok(
    analyze(normal.samples).vertical === 0,
    "No descent fabricated without altitude",
  );
  ok(
    processGps([fix(0), fix(1, 49.1, -123, { accuracy: 100 })], []).rejected ===
      1,
    "Poor accuracy excluded",
  );
  ok(
    processGps([fix(0), fix(1, 50)], []).rejected === 1,
    "Impossible GPS jump excluded",
  );
  ok(
    processGps([fix(0), fix(0)], []).rejected === 1,
    "Duplicate timestamps excluded",
  );
  ok(
    processGps([fix(0, NaN), fix(1, 91), fix(2, 49, -181)], []).rejected === 3,
    "Invalid coordinates excluded",
  );
  const pause = processGps(
    [
      fix(0),
      fix(1, 49.00005),
      fix(31, 49.1, -123, { breakBefore: true }),
      fix(32, 49.10005),
    ],
    [],
  );
  ok(
    pause.samples[2].distance === pause.samples[1].distance,
    "Pause does not connect separated positions",
  );
  ok(
    analyze(pause.samples).duration === 2,
    "Paused or missing time excluded from tracked duration",
  );
  ok(
    sampleAt(pause.samples, 15).lat === pause.samples[1].lat,
    "Replay does not interpolate across gaps",
  );
  const noisyResume = processGps(
    [
      fix(0),
      fix(1, 49.00005),
      fix(4, 49.0008, -123, { accuracy: 100, breakBefore: true }),
      fix(5, 49.0009),
      fix(6, 49.00095),
    ],
    [],
  );
  ok(
    noisyResume.samples[2].breakBefore &&
      noisyResume.samples[2].distance === noisyResume.samples[1].distance,
    "Pause boundary survives a rejected first resumed fix",
  );
  const altitude = processGps(
    [
      fix(0, 49, -123, { altitude: 1000, altitudeAccuracy: 3 }),
      fix(1, 49.00005, -123, { altitude: 980, altitudeAccuracy: 3 }),
      fix(2, 49.0001, -123, { altitude: 0, altitudeAccuracy: 100 }),
    ],
    [],
  );
  ok(
    analyze(altitude.samples).vertical > 0 &&
      analyze(altitude.samples).vertical < 30,
    "No giant descent from invalid altitude",
  );
  const trail = {
    id: "line",
    name: "Line",
    resortId: "cypress",
    difficulty: "green",
    geometry: {
      type: "LineString",
      coordinates: [
        [-123, 49],
        [-123, 49.001],
      ],
    },
  };
  const routeFixes = Array.from({ length: 15 }, (_, i) =>
    fix(i, 49 + i * 0.00005),
  );
  const match = processGps(routeFixes, [trail]);
  ok(
    match.matchedTrailId === "line",
    "Auto detection matches sustained unique route movement",
  );
  ok(
    processGps(routeFixes, [trail, { ...trail, id: "parallel" }])
      .matchedTrailId === null,
    "Overlapping trails remain ambiguous",
  );
  ok(
    nearestTrail(fix(0, 49, -123, { accuracy: 45 }), [trail]) === null,
    "Imprecise GPS not assigned to a trail",
  );
  ok(
    processGps(
      [
        ...routeFixes,
        ...Array.from({ length: 40 }, (_, i) =>
          fix(i + 15, 49.002 + i * 0.00005),
        ),
      ],
      [trail],
    ).matchedTrailId === null,
    "Brief proximity does not label a whole unmatched ride",
  );
  const data = {
    current: {
      time: base / 1000,
      temperature_2m: 10,
      wind_speed_10m: 20,
      weather_code: 0,
    },
    hourly: {
      time: Array.from({ length: 25 }, (_, i) => base / 1000 - (24 - i) * 3600),
      snowfall: Array(25).fill(1),
      visibility: Array(25).fill(9000),
    },
  };
  const weather = parseWeather(data, base);
  ok(
    weather.snowfall === 24,
    "Snow estimate sums exactly the preceding 24 hourly intervals",
  );
  ok(
    !weather.simulated &&
      weather.modelled &&
      weather.description === "Clear sky",
    "Live weather carries provenance",
  );
  ok(
    parseWeather(
      { ...data, hourly: { ...data.hourly, snowfall: [null] } },
      base,
    ).snowfall === null,
    "Missing snowfall never becomes zero",
  );
  ok(
    parseWeather(data, base + 2 * 3600000).stale,
    "Outdated model output labelled stale",
  );
  assert.throws(() => parseWeather({ current: { temperature_2m: 10 } }, base));
  checks++;
  console.log("✓ Invalid weather payload rejected");
  const { snowMotion } = await server.ssrLoadModule(
    "/src/components/MountainSnow.tsx",
  );
  const snowData = {
    ...data,
    current: {
      ...data.current,
      weather_code: 73,
      snowfall: 0.2,
      interval: 900,
      wind_direction_10m: 270,
    },
  };
  const snowNow = parseWeather(snowData, base);
  ok(
    snowNow.snowfallRate === 0.8,
    "Current snowfall interval converted to cm/hour",
  );
  const heavy = parseWeather(
    { ...snowData, current: { ...snowData.current, snowfall: 0.8 } },
    base,
  );
  ok(
    snowMotion(heavy).count > snowMotion(snowNow).count &&
      snowMotion(heavy).fall > snowMotion(snowNow).fall,
    "Heavier current snowfall increases density and modestly increases speed",
  );
  ok(
    snowMotion({ ...snowNow, stale: true }).count === 0,
    "Stale snowfall never animates",
  );
  ok(
    snowMotion({ ...snowNow, snowfallRate: null }).count === 0,
    "Unknown snowfall intensity never invents precipitation",
  );
  ok(
    snowMotion({ ...snowNow, snowfallRate: 0 }).count === 0,
    "Zero current snowfall produces no particles despite historical accumulation",
  );
  ok(
    snowMotion({ ...snowNow, wind: 40 }).drift >
      snowMotion({ ...snowNow, wind: 5 }).drift,
    "Wind speed controls particle drift",
  );
  const ranked = rankTrails(allTrails, demoProfile, [], emptyWeather());
  ok(
    ranked.every(
      (f) => Number.isFinite(f.score) && f.score >= 0 && f.score <= 100,
    ),
    "Unknown weather yields finite rankings",
  );
  ok(
    ranked.every((f) => f.parts.conditions === 0),
    "Forecast excluded from live snow-surface ranking",
  );
  const connected = {
    ...trail,
    geometry: {
      type: "MultiLineString",
      coordinates: [
        [
          [-123, 49],
          [-123, 49.001],
        ],
        [
          [-123, 49.001],
          [-123, 49.002],
        ],
      ],
    },
  };
  ok(routeFor(connected).chains.length === 1, "Shared source endpoints joined");
  ok(
    trailsToFeatureCollection([connected]).features[0].geometry.coordinates
      .length === 1,
    "Map renders continuous joined source line",
  );
  const gapTrail = {
    ...trail,
    geometry: {
      type: "MultiLineString",
      coordinates: [
        [
          [-123, 49],
          [-123, 49.001],
        ],
        [
          [-123, 49.002],
          [-123, 49.003],
        ],
      ],
    },
  };
  ok(
    routeFor(gapTrail).partial && routeFor(gapTrail).chains.length === 2,
    "Unmapped gaps remain separate instead of fabricated paths",
  );
  console.log(`\n${checks} live engine checks passed.`);
} finally {
  await server.close();
}
