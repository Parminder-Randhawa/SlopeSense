# SlopeSense

A mobile-first North Shore ski and snowboard app that runs locally without an account, API key, or cloud database. Explore illustrated mountains and cartographic run maps, check weather estimates, record GPS activities, and revisit your tracks.

## Run locally

Use Node.js 20.19+ (Node 22 or 24 recommended) and pnpm.

```sh
pnpm install
pnpm dev
```

Open **http://127.0.0.1:5173/**. Use the same address each time: `localhost` and `127.0.0.1` have separate browser storage and location permissions.

```sh
pnpm build       # TypeScript + production bundle
pnpm preview     # Preview the production build
pnpm test        # Recommendation, geometry, GPS, and weather tests
pnpm test:ui     # Browser recording regression suite; dev server required
pnpm test:design # Layout + interaction checks at five widths; defaults to port 5173
```

The UI suite defaults to `http://127.0.0.1:5174`. Set `SLOPESENSE_URL=http://127.0.0.1:5173` to test the normal server. On macOS it uses installed Google Chrome. Elsewhere provide `CHROME_PATH` or adjust the test launcher for installed Playwright Chromium. Browser tests use isolated profiles and synthetic location callbacks; they do not overwrite the user's saved rides.

Google login and Tiger Cloud are deferred. The local app has no dependency on either and does not claim Tiger Data integration. No `.env` configuration is needed. Keep any existing credentials private; `.env` files are ignored by Git.

## Using the app

- **Home:** a fixed, realistic terrain illustration inspired by the North Shore, with three compact mountain labels and no zoom or pan. Select Cypress, Grouse, or Mt Seymour to open that mountain. The suggested run respects your explicit difficulty ceiling. Snow density and a restrained fall-speed increase follow current snowfall intensity (cm/hour); wind controls drift. Stale, zero, or unknown intensity does not animate. Reduced-motion preferences disable particles. The demo has a separately labelled winter scenario.
- **Explore:** a quiet OpenStreetMap cartographic basemap, difficulty filters, guided selected-run focus, collision-aware labels, and links to official resort reports. Tap a line or choose a run from the list. Choose Map detail or Runs only in the same reversible control. In Explore, free pan/zoom is disabled: selecting a run fits it, and tapping empty space or All runs returns to the overview. Recording/replay maps retain navigation controls.
- **Record:** choose skiing or snowboarding in Profile, then auto detection or a specific run. Press Start to request device location. Pause, resume, finish, add optional feedback, and save. The active recorder survives in-app navigation. A recovered draft requires an explicit Resume after reload.
- **Rides & replays:** play, pause, scrub and change replay speed; inspect actual route samples and calculated metrics, compare repeated runs, or export GPX. Unmatched activities remain valid recordings and do not receive an invented mountain or trail.
- **Progress:** distance by week, saved ride totals, mapped terrain experience, and experimental movement-pattern summaries.
- **Profile / Settings:** edit preferences, export a JSON backup, and enable **Demo mode** for the hackathon. Live mode is the default. A mode change is disabled while a draft exists.

Demo mode feeds synthetic positions along real OSM geometry through the same GPS filtering, run matching, recording, persistence, and analytics code as live rides. It advances simulated time at 10×. Synthetic weather is clearly labelled. Demo and real histories are stored separately by provenance and never combined in recommendations or progress. Demo starts with Alex’s complete profile, six completed rides across the three mountains, feedback, progress statistics and playable replays. These sample rides never appear in the live profile.

## What is real, modelled, and unknown

| Data | Source / meaning |
| --- | --- |
| Home artwork | Generated realistic illustration informed by mountain references; stylized layout, not a surveyed navigation map |
| Run basemap | OpenStreetMap standard cartographic tiles; desaturated so selected runs stand out |
| Trails | 37 named OSM trails: Cypress 12, Grouse 13, Seymour 12; snapshot Oct 3, 2026 |
| Current weather | Open-Meteo forecast model at each mountain's mapped centre; refresh every 10 minutes |
| Animated snow | Current snowfall accumulation divided by the provider interval, expressed in cm/hour; a visual intensity mapping, not a physical simulation |
| Last 24h snowfall | Sum of the previous 24 complete hourly model values, in cm; not a measured resort snow stake |
| Live movement | Browser Geolocation API, with explicit permission on Start |
| Speed, distance, descent | Calculated from accepted position / altitude observations |
| Rider preferences / feedback | Entered by the rider |
| Open lifts, open runs, daily grooming, surface quality | **Unverified**; follow the linked official mountain report |

There is no invented open/closed feed, avalanche assessment, surveyed trail vertical, or forecast-based claim of actual snow quality. Weather is excluded from live run-fit scoring; the remaining terrain/history weights are renormalized. Missing weather displays unavailable; previously retrieved weather is explicitly labelled cached when refresh fails. The winter home illustration is decorative and does not depict current snow coverage.

### Trail continuity and readability

Source ways sharing endpoints within 3 metres are joined and rendered with rounded joins. All connected chains remain on the map. Truly disconnected source ways are kept separate instead of drawing fictional connectors. Only connected source geometry is used for demo travel. The source snapshot is preserved in `src/data/*.geojson`.

Difficulty filters reduce clutter. Selecting a trail dims the others and focuses its extent. General labels appear at closer zooms and use collision avoidance. Initial framing fits the mapped run network. OSM geometry does not establish downhill direction or a navigable route; this selection is not a complete official resort map.

### GPS and local persistence

- Requires a secure context: loopback (`127.0.0.1` / `localhost`) works on this computer. A phone accessing an HTTP LAN IP will generally require a trusted HTTPS setup for location access.
- Keep the app visible. It requests a screen wake lock where supported and deliberately pauses on backgrounding; mobile browsers cannot guarantee continuous recording with the screen locked.
- Fixes with invalid coordinates/timestamps or reported accuracy worse than 50 m are rejected. Implausible jumps over 55 m/s are excluded. A small accuracy-dependent noise floor limits jitter.
- Pauses or gaps over 20 seconds break the route. No distance, descent, or tracked time is added across gaps. GPX export preserves separate track segments.
- GPS descent requires finite altitude with reported vertical accuracy between 0 and 25 m. Missing altitude disables elevation/gradient graphs. It remains a GPS estimate, not surveyed vertical.
- Auto matching requires a unique nearby trail, at least three supporting moving fixes, at least 30 m travel, and support from at least 60% of moving fixes. Ambiguous parallel trails and multi-run sessions can remain unmatched. A manual run assignment is explicitly labelled selected.
- Drafts and completed activities use browser IndexedDB. Finishing writes the activity and clears the draft in one transaction. Preferences and last weather response use localStorage. Storage failures remain visible. Drafts can be exported before saving.
- GPS routes are not uploaded to a server. Basemap providers receive requests for the map area viewed; Open-Meteo receives the three public resort coordinates. Clearing browser data removes local history; export backups first.

Movement-pattern labels are transparent hackathon heuristics, not validated sporting skill or safety assessments. Maximum speed never determines skill. Steep-section evidence is restricted to the explicitly simulated demo; live GPS slope is not promoted into a terrain-skill claim.

## Architecture

React + TypeScript + Vite, MapLibre GL JS, browser Geolocation, IndexedDB, and Open-Meteo. No backend service is needed for this local version.

- `src/App.tsx`: live/demo mode, profile, history, navigation, global recorder lifecycle.
- `src/hooks/useRecorder.ts`: GPS and demo sources, pause/resume, recovery, finish.
- `src/engine/gps.ts`: position validation, distance/altitude processing, conservative trail matching.
- `src/services/local.ts`: browser persistence, atomic finish, JSON/GPX export.
- `src/services/weather.ts`, `src/hooks/useWeather.ts`: forecast parsing, provenance, refresh, stale fallback.
- `src/components/RunMap.tsx`: cartographic context, run overlays, responsive camera, location and geometry fallback.
- `src/components/IllustratedRange.tsx`: fixed illustrated mountain selection and weather-driven snow.
- `src/components/RunPicker.tsx`, `ReplayPlayer.tsx`: mobile run selection and saved ride playback.
- `src/components/OfflineTrailMap.tsx`: bundled geometry fallback.
- `src/engine/route.ts`: connected source chains without fabricated bridges.
- `src/engine/recommendations.ts`, `riderModel.ts`, `telemetry.ts`: inspectable analytics and terrain constraints.

The project intentionally avoids requesting Google or Tiger Data credentials for local operation.

## Sources and image attribution

- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL 1.0. Individual way links appear in trail details. `scripts/import-osm.py` documents the original import.
- [Open-Meteo weather API](https://open-meteo.com/en/docs). The no-key endpoint is appropriate for this non-commercial local hackathon app; review provider terms before commercial deployment.
- Standard OpenStreetMap tiles follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): visible attribution, normal browser caching, no offline tile downloads or bulk prefetch. A larger public deployment should use an appropriate hosted or self-hosted tile service.
- Artwork process and geographic references: [`public/assets/README.md`](public/assets/README.md). No satellite imagery or mountain photographs are served by the active UI.

## Validation

`pnpm test` covers the existing recommendation/telemetry invariants and new GPS filtering, missing altitude, pauses, ambiguous matching, weather freshness, incomplete hourly data, continuous source chains, and disjoint geometry. `pnpm test:ui` covers live default, offline maps, manual selection, location denial, draft recovery, successful real/demo saves, history separation, export, empty-recording rejection, and responsive overflow checks.

The browser suite uses controlled GPS fixtures; an outdoor device field test is still needed to assess real sensor quality. Runtime provider requests and the map presentation are verified separately from deterministic outage tests.

### Design verification

`pnpm test:design` checks 320, 390, 768, 1024 and 1440 pixel widths, uncropped artwork, centered Record controls, stable modal opening/closing, map focus/overview and reversible map appearance. The source illustration is rendered at native aspect and capped at 700 CSS pixels to avoid the previous oversized crop. It includes illustrative Cypress Olympic rings, Grouse’s summit turbine, and Seymour’s rolling ridge; landmark placement is artistic, not navigation data.
