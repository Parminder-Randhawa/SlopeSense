import assert from "node:assert/strict";
import { createServer } from "vite";
import { createServer as createHttpServer } from "node:http";
const server = await createServer({
  server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  appType: "custom",
});
let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log(`✓ ${name}`);
};
try {
  const { allTrails, demoProfile, seedActivities } =
    await server.ssrLoadModule("/src/data/demo.ts");
  const { simulateRun, analyze, sampleAt } = await server.ssrLoadModule(
    "/src/engine/telemetry.ts",
  );
  const { routeFor, meters } = await server.ssrLoadModule(
    "/src/engine/route.ts",
  );
  const { rankTrails, rankMountains, eligible, difficultyLevel } =
    await server.ssrLoadModule("/src/engine/recommendations.ts");
  const { buildRiderModel } = await server.ssrLoadModule(
    "/src/engine/riderModel.ts",
  );
  const { conditions } = await server.ssrLoadModule("/src/data/conditions.ts");
  const { readState, saveState, STORAGE_KEY } = await server.ssrLoadModule(
    "/src/engine/storage.ts",
  );
  const history = seedActivities();
  test("37 real named trails across all three mountains", () => {
    assert.equal(allTrails.length, 37);
    assert.equal(new Set(allTrails.map((t) => t.resortId)).size, 3);
    assert.equal(new Set(allTrails.map((t) => t.id)).size, 37);
  });
  for (const ceiling of ["green", "blue", "black", "double-black"])
    for (const goal of ["relax", "explore", "improve", "challenge"]) {
      test(`${goal} never crosses ${ceiling} ceiling`, () => {
        const ranked = rankTrails(
          allTrails,
          { ...demoProfile, ceiling, goal },
          history,
          conditions,
        );
        assert.ok(ranked.length);
        assert.ok(
          ranked.every(
            (f) =>
              difficultyLevel[f.trail.difficulty] <= difficultyLevel[ceiling],
          ),
        );
      });
    }
  const initial = rankTrails(allTrails, demoProfile, history, conditions);
  console.log(
    "Initial mountain rankings",
    rankMountains(initial).map((m) => ({
      id: m.id,
      score: m.score,
      top: m.top?.trail.name,
    })),
  );
  console.log(
    "Initial Cypress runs",
    initial
      .filter((f) => f.trail.resortId === "cypress")
      .map((f) => ({ name: f.trail.name, score: f.score, parts: f.parts })),
  );
  test("Cypress wins the documented demo story", () =>
    assert.equal(rankMountains(initial)[0].id, "cypress"));
  test("Scores are deterministic", () =>
    assert.deepEqual(
      initial,
      rankTrails(allTrails, demoProfile, history, conditions),
    ));
  test("Unknown, closed and backcountry runs are excluded", () => {
    for (const changes of [
      { difficulty: "unknown" },
      { metadata: { closed: true } },
      { grooming: "backcountry" },
    ])
      assert.equal(
        eligible({ ...allTrails[0], ...changes }, demoProfile),
        false,
      );
  });
  test("No eligible runs returns empty results without throwing", () =>
    assert.equal(rankTrails([], demoProfile, history, conditions).length, 0));
  const top = initial.find((f) => f.trail.resortId === "cypress").trail;
  for (const t of allTrails) {
    test(`Continuous synthetic route: ${t.name}`, () => {
      const samples = simulateRun(t, "smooth"),
        route = routeFor(t);
      assert.ok(samples.length > 2);
      assert.ok(
        samples.every((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat)),
      );
      assert.ok(Math.abs(samples.at(-1).distance - route.length) < 0.01);
      for (let i = 1; i < samples.length; i++) {
        assert.ok(meters(samples[i - 1], samples[i]) < 10);
        assert.ok(samples[i].time > samples[i - 1].time);
        assert.ok(samples[i].distance >= samples[i - 1].distance);
      }
    });
  }
  for (const [persona, stops] of [
    ["smooth", 1],
    ["developing", 2],
    ["cautious", 3],
  ]) {
    test(`${persona} has ${stops} analytically detected stops`, () => {
      const samples = simulateRun(top, persona),
        s = analyze(samples);
      assert.equal(s.stops, stops);
      assert.equal(
        s.longestStop,
        persona === "smooth" ? 5 : persona === "developing" ? 11 : 17,
      );
      assert.ok(s.events.some((e) => e.type === "gradient"));
      assert.ok(s.averageSpeed > 0);
      assert.ok(s.vertical > 0);
      assert.deepEqual(samples, simulateRun(top, persona));
    });
  }
  const telemetry = simulateRun(top, "developing");
  const synthetic = {
    id: "test-completed",
    trailId: top.id,
    resortId: top.resortId,
    date: "2026-01-17T12:00:00",
    persona: "developing",
    feeling: "easy",
    surface: "unknown",
    telemetry,
    simulated: true,
  };
  const after = rankTrails(
    allTrails,
    demoProfile,
    [...history, synthetic],
    conditions,
  );
  console.log(
    "After replay Cypress rankings",
    after
      .filter((f) => f.trail.resortId === "cypress")
      .map((f) => ({ name: f.trail.name, score: f.score })),
  );
  test("Completed feedback produces a different next recommendation", () =>
    assert.notEqual(
      top.id,
      after.find((f) => f.trail.resortId === "cypress").trail.id,
    ));
  test("Next recommendation remains within Blue ceiling", () =>
    assert.ok(after.every((f) => difficultyLevel[f.trail.difficulty] <= 2)));
  test("Feedback updates supported dimensions only", () => {
    const before = buildRiderModel(history, allTrails),
      learned = buildRiderModel([...history, synthetic], allTrails);
    assert.equal(learned.difficulty.count, before.difficulty.count + 1);
    assert.equal(learned.steep.count, before.steep.count + 1);
    assert.equal(learned.firm.count, before.firm.count);
    assert.equal(learned.groomed.count, before.groomed.count);
    assert.equal(learned.ungroomed.count, before.ungroomed.count);
  });
  test("Unseen terrain displays not enough data", () => {
    const m = buildRiderModel([], allTrails);
    assert.ok(
      Object.values(m).every(
        (e) => e.count === 0 && e.label === "Not enough data yet",
      ),
    );
  });
  test("A single easy report cannot establish strong evidence", () =>
    assert.equal(
      buildRiderModel([synthetic], allTrails).difficulty.label,
      "Limited data",
    ));
  test("Firm evidence requires an explicit surface report", () => {
    const m = buildRiderModel([{ ...synthetic, surface: "firm" }], allTrails);
    assert.equal(m.firm.count, 1);
    assert.equal(m.firm.label, "Limited data");
  });
  test("Maximum speed is not a skill input", () => {
    const speedScaled = {
      ...synthetic,
      telemetry: telemetry.map((p) => ({ ...p, speed: p.speed * 2 })),
    };
    const a = buildRiderModel([synthetic], allTrails),
      b = buildRiderModel([speedScaled], allTrails);
    assert.ok(Math.abs(a.difficulty.value - b.difficulty.value) < 0.0001);
  });
  test("Interpolation is bounded and tracks time and position", () => {
    const p = sampleAt(telemetry, 10.5);
    assert.equal(p.time, 10.5);
    assert.ok(
      p.distance >= telemetry[10].distance &&
        p.distance <= telemetry[11].distance,
    );
    assert.deepEqual(sampleAt(telemetry, -1), telemetry[0]);
    assert.deepEqual(sampleAt(telemetry, 100000), telemetry.at(-1));
  });
  test("No invented bridge across disconnected geometry", () => {
    const t = {
      ...top,
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [0.001, 0],
          ],
          [
            [10, 10],
            [10.001, 10],
          ],
        ],
      },
    };
    const r = routeFor(t);
    assert.equal(r.partial, true);
    assert.ok(r.length < 120);
  });
  test("Empty telemetry produces finite zero metrics", () =>
    assert.equal(analyze([]).duration, 0));
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
  };
  const state = {
    version: 2,
    onboarded: true,
    profile: demoProfile,
    activities: [...history, synthetic],
  };
  test("Profile, feedback and telemetry persist and rehydrate", () => {
    assert.equal(saveState(state), null);
    assert.deepEqual(readState().state, state);
  });
  test("Corrupt saves recover into a usable demo", () => {
    storage.set(STORAGE_KEY, "{bad");
    const recovered = readState();
    assert.ok(recovered.warning);
    assert.equal(recovered.state.activities.length, history.length);
  });
  test("Malformed telemetry cannot crash saved-state loading", () => {
    storage.set(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        activities: [{ ...synthetic, telemetry: [{ time: 0 }, { time: 1 }] }],
      }),
    );
    assert.ok(readState().warning);
  });
  test("Storage failures are surfaced without breaking the session", () => {
    globalThis.localStorage = {
      getItem() {
        throw Error("denied");
      },
      setItem() {
        throw Error("quota");
      },
    };
    assert.ok(readState().warning);
    assert.ok(saveState(state));
  });
  console.log(`\n${checks} engine checks passed.`);
} finally {
  await server.close();
}
