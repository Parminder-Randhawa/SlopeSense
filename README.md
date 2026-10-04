# SlopeSense

**SlopeSense learns how you ride and recommends where and what to ride next.** A mobile-first, local-first ski and snowboard app for Cypress, Grouse and Mt Seymour. It includes an offline geographic trail explorer, transparent recommendations, animated telemetry replays, run feedback, activity comparisons and an evidence-based rider profile.

## Run

Use Node.js 22+ and pnpm (the repository pins pnpm 11).

```bash
corepack enable
pnpm install
pnpm dev
```

Open the address printed by Vite, normally http://localhost:5173. No API keys, login, backend, map tiles, font CDN or live weather service is required. All assets, 37 trail geometries and demo inputs ship locally. Once the page is loaded, all product interactions continue without a network connection. For an offline demo, keep the local server running; this is not a service-worker-installed PWA.

```bash
pnpm test        # 75 engine, data, guardrail and persistence checks
pnpm typecheck
pnpm build
pnpm preview
```

For browser checks, start `pnpm dev --host 127.0.0.1 --port 5174`, then:

```bash
pnpm exec playwright install chromium  # not needed if Chrome is installed on macOS
pnpm test:ui
```

`SLOPESENSE_URL` overrides the test address. `CHROME_PATH` optionally specifies Chrome. The browser suite checks onboarding, all mountains, trail selection, map controls, replay/pause/reset/scrub/speeds, charts, events, natural completion, feedback, changed recommendations, activity comparison, persistence, terrain ceilings, offline interactions, corruption recovery and narrow-screen layouts. Screenshots go to the ignored `test-results/` directory.

## Judge demo

1. Select **Explore Alex's demo** on first launch. Alex is an intermediate snowboarder with a **Blue** terrain ceiling and six simulated past activities.
2. Tap **Where should I ride today?** Cypress ranks first: **84%**, based on actual calculated inputs, not a fixed display value.
3. Open Cypress, then **Explore T-33**. T-33 is the leading Cypress trail at **89%**. Tap the match breakdown for scores, weights and uncertainties.
4. Select **Demo Replay**. The developing profile starts at 4×. Follow its rider on connected, real OSM coordinates while the graph and metrics update. Pause, restart, scrub, or switch among three deterministic rider profiles and four graph views.
5. Finish playback (or use the explicitly labelled completion shortcut). See detected pauses and objective observations. Select **Easy**, optionally report a surface, and save.
6. The evidence display updates, and **Horizon** becomes the next Cypress recommendation at **87%**, still within Blue. It is a longer mapped route aligned with the progression goal. No unsupported actual gradient claim is made.
7. Open Activity to compare the three Crazy Raven replays; open Progress to see support counts and intentionally unknown dimensions.

Profile → **Reset demo account** restores this exact starting story. Choosing **Set up my own rider** instead starts with zero activities and zero skill evidence. A user's natural-language request never increases their terrain ceiling.

## Data: real, simulated, calculated and unknown

| Category                           | Contents                                                                                                                                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real community-mapped data         | 37 named pistes, geometry and mapped difficulty in `src/data/*.geojson`: Cypress 12, Grouse 13, Seymour 12. Original OSM way IDs, tags and snapshot date are retained. Trail details link to the individual ways.                                                          |
| Approximate geographic calculation | Trail length from geographic coordinates. Replay uses the longest connected route; it never invents a bridge across disjoint ways. Mapped total length and replay segment length can differ.                                                                               |
| Simulated                          | **Jan 17, 2026** winter scenario weather; every replay's movement, elevation, pitch, stops and timestamp; Alex's seeded activity history. This date is a historical setting, **not archived observed weather**. Current October conditions are not represented as skiable. |
| Calculated                         | Completion time, geographic progress, vertical from synthetic elevation, stop counts/durations, moving-speed variability, section averages, match scores and rider evidence.                                                                                               |
| Rider-reported                     | Terrain ceiling, preferences, goals, perceived difficulty and optional surface report. A surface report is not an instrument observation.                                                                                                                                  |
| Unknown / unverified               | Official resort ratings, daily opening/closure status, daily grooming, surveyed elevation/vertical/gradient, most terrain characteristics, precise trail surfaces and actual downhill route direction.                                                                     |

OSM is community-maintained and is **not independently verified official resort data**. Collins is mapped **green**, so the blue-terrain demo uses T-33 and Horizon. The curated Seymour snapshot contains no double-black trail; none is invented. OSM grooming is mostly unknown. Sparse tags do not become fictional terrain facts.

Snowfall and visibility affect both the visual treatment and the scenario compatibility score. Thaw followed by freezing can raise an **estimated firm-surface risk**. Neither weather nor that estimate proves a particular trail is icy. Live resort operations are not integrated; resort closures, warnings and signage always take precedence.

The background in `public/assets/mountain-winter.png` is generated illustrative scenery, not a resort photograph. Map contour artwork is illustrative, while overlaid trail coordinates are real. See `public/assets/README.md` for the image-generation prompt and provenance.

Trail geometry © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL 1.0. The original offline importer remains at `scripts/import-osm.py`:

```bash
python3 scripts/import-osm.py --cypress /path/to/cypress.osm \
  --grouse /path/to/grouse.osm --seymour /path/to/seymour.osm --output src/data
```

## Recommendation method

The independent deterministic engine lives in `src/engine/recommendations.ts`. It first excludes unrated terrain, mapped backcountry, records explicitly flagged closed, and every rating above the rider's chosen ceiling.

Trail score is a weighted sum:

- **30% ability:** self-selected experience versus mapped rating, bounded by the ceiling.
- **15% preferences:** mapped length, available grooming tags and broad difficulty proxies for gentle/steep preferences. Unknown attributes receive no positive evidence. Tree/open/park preferences are saved but explicitly reported as unscorable with this dataset.
- **20% scenario conditions:** synthetic snow, visibility, wind and freeze–thaw indicators, adjusted for expressed avoidance preferences.
- **25% progression:** distance from a transparent target route length based on the most recent comparable run and today's goal. A difficult-feeling run does not trigger a challenge increment.
- **10% demonstrated evidence:** supported comfort observations from recorded replay history; conservative neutral value with sparse evidence.

A **−15** variety adjustment applies to the most recent trail, or **−5** to either of the two preceding trails. Ties are broken by stable trail IDs. Mountain scores combine **55% best eligible run, 35% average of the top three, 10% suitable-run breadth**. The UI exposes the factors and the adjustments. Scores are heuristic compatibility rankings, **not safety probabilities or validated skill measurements**.

“Ask SlopeSense” is a small deterministic intent parser for easy/relaxed, longer/shorter, progression, grooming, firm-snow avoidance and low-visibility avoidance. It updates structured preferences and calls the same engine. Blue/green requests narrow the response to eligible matching ratings. Unsupported requests are explained. No LLM chooses or scores the trails.

## Telemetry and learning

`simulateRun()` produces repeatable one-second samples: timestamp, latitude, longitude, distance, synthetic elevation/pitch, speed and acceleration. It integrates progress along connected OSM coordinates and includes three demonstrative patterns. The replay interpolates samples using `requestAnimationFrame`, with 1×, 2× and 4× playback. Its graphic and rider share the same playhead.

The analyzer detects stationary intervals below 1 km/h lasting at least 3 seconds, moving-speed coefficient of variation, elapsed and moving averages, vertical descent, section-level changes, acceleration/deceleration events, and pause duration. It handles empty telemetry. Maximum speed is never used as skill evidence.

For each supported dimension, 80% of the heuristic comfort observation comes from pace consistency and stationary-time share; 20% from feedback. At least three supporting runs are required before a comfort label replaces **Limited data**. With zero evidence the UI says **Not enough data yet**. Groomed evidence requires a mapped grooming tag; long-run evidence requires at least 1 km of recorded route; firm evidence requires an explicit rider report. The steep-section demo dimension uses simulated pitch and is labelled accordingly. Unobserved dimensions stay unchanged.

The model is deliberately incomplete. All current activities are synthetic, and this is not a validated sporting ability assessment. Real GPS acquisition, surveyed elevation, official operations feeds and native watch integration are outside this demo's scope.

## Structure and storage

- `src/data/`: resort and trail snapshots, fictional weather, demo profile/history.
- `src/engine/`: connected-route geometry, telemetry simulation/analysis, evidence model, recommendations and versioned storage validation.
- `src/hooks/usePlayback.ts`: deterministic playhead and animation lifecycle.
- `src/components/`: offline map, chart, onboarding/preferences, reusable UI.
- `src/pages/`: Home, Mountain, Replay, Activity, Progress, Profile.
- `scripts/test.mjs`: reproducible engine checks using Vite's TypeScript/GeoJSON loader.
- `scripts/smoke.mjs`: mobile browser tests plus desktop/narrow-layout regression screenshots.

Profile and up to 100 replay activities are persisted under `slopesense:v2` in this browser's local storage. Writes that exceed storage limits leave the session usable and show a warning. Invalid saved data falls back to a fresh demo. Nothing is uploaded. Run feedback is committed once per completed replay session. Source changes in this repository are intentionally left **uncommitted and unpushed**.
