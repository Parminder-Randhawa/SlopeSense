import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser, disableWebGL } from "./browser-test-utils.mjs";
const base = process.env.SLOPESENSE_URL || "http://127.0.0.1:5173";
const out = process.env.SLOPESENSE_SCREENSHOTS || "test-results";
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
let checks = 0;
const ok = (v, label) => {
  assert.ok(v, label);
  checks++;
  console.log("✓ " + label);
};
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__gps = { watch: null };
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition(success, error) {
          window.__gps.watch = success;
          window.__gps.error = error;
          return 1;
        },
        clearWatch() {
          window.__gps.watch = null;
        },
        getCurrentPosition(success, error) {
          error({ code: 1 });
        },
      },
    });
  });
  // External outages are deterministic in this suite. A separate visual preview
  // verifies the actual providers; these tests never depend on an internet feed.
  await page.route("https://**/*", (r) => r.abort());
  await page.addInitScript(disableWebGL);
  await page.goto(base);
  const nav = async (name) => {
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name, exact: true })
      .click();
    await page
      .locator(
        {
          Home: ".home-page",
          Explore: ".mountain-page",
          Record: ".record-page",
          Progress: ".progress-page",
          Profile: ".profile-page",
        }[name],
      )
      .waitFor();
  };
  await page.getByRole("heading", { name: "Find your next line." }).waitFor();
  ok(!(await page.locator(".mode-ribbon").count()), "Live mode is the default");
  ok(
    (await page.locator(".illustrated-pin").count()) === 3,
    "Three fixed illustrated mountain choices",
  );
  ok(
    (await page.locator(".range-scene .maplibregl-canvas").count()) === 0,
    "Home has no pannable or zoomable map",
  );
  await page
    .getByRole("button", { name: "Explore Grouse Mountain", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Grouse Mountain", exact: true })
    .waitFor();
  ok(
    await page
      .getByRole("heading", { name: "Grouse Mountain", exact: true })
      .isVisible(),
    "Mountain selector opens matching Explore screen",
  );

  await page
    .getByRole("group", { name: "Interactive trail map for Grouse Mountain" })
    .waitFor();
  ok(
    await page
      .getByRole("group", { name: "Interactive trail map for Grouse Mountain" })
      .isVisible(),
    "Offline trail fallback works",
  );
  await page
    .locator(".trail-grid .trail-row")
    .filter({ hasText: "Paradise" })
    .click();
  ok(
    await page
      .getByRole("button", { name: "Record this run", exact: true })
      .isVisible(),
    "Trail selection exposes actual recording action",
  );
  await page
    .getByRole("button", { name: "Record this run", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Choose a run", exact: true })
    .waitFor();
  ok(
    (await page
      .getByRole("button", { name: "Choose a run", exact: true })
      .getAttribute("aria-pressed")) === "true",
    "Selected run enters manual mode",
  );
  await page.getByRole("button", { name: "Choose recording run" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByLabel("Search runs").fill("Paradise");
  ok(
    (await page.locator(".picker-runs button").count()) === 1,
    "Run picker searches within mountain",
  );
  await page.getByRole("button", { name: "Close run picker" }).click();
  await page.getByRole("button", { name: "Auto-detect", exact: true }).click();
  await page
    .getByRole("button", { name: "Start activity", exact: true })
    .click();
  await page.waitForFunction(() => !!window.__gps.watch);
  await page.evaluate(() => window.__gps.error({ code: 1 }));
  await page.getByText(/Location access denied/).waitFor();
  ok(
    await page.getByText(/Location access denied/).isVisible(),
    "Denied location gives a recoverable explanation",
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const emit = async (seq, lat) =>
    page.evaluate(
      ({ seq, lat }) =>
        window.__gps.watch({
          timestamp: Date.now() + seq * 1000,
          coords: {
            latitude: lat,
            longitude: -123.12,
            accuracy: 4,
            altitude: null,
            altitudeAccuracy: null,
            speed: null,
            heading: null,
          },
        }),
      { seq, lat },
    );
  for (let i = 0; i < 7; i++) await emit(i, 49.25 + i * 0.00006);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  ok(
    await page.getByRole("button", { name: "Resume", exact: true }).isVisible(),
    "Live activity pauses",
  );
  await nav("Profile");
  ok(
    !(await page.getByRole("switch", { name: "Demo mode" }).isEnabled()),
    "Cannot switch live/demo with an active draft",
  );
  await nav("Record");
  page.once("dialog", (d) => d.accept());
  await page.reload();
  await nav("Record");
  await page.getByText(/Recovered your draft/).waitFor();
  ok(
    await page.getByText(/Recovered your draft/).isVisible(),
    "Draft survives a reload",
  );
  await page.getByRole("button", { name: "Finish ride", exact: true }).click();
  await page
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Mountain activity", exact: true })
    .waitFor();
  ok(
    await page
      .getByText("No confident mapped run match", { exact: true })
      .isVisible(),
    "Unmatched GPS activity saves without an invented mountain",
  );
  await page.getByLabel("Graph type").selectOption("speed-time");
  ok(
    await page
      .getByRole("option", { name: "Elevation / distance" })
      .isDisabled(),
    "Missing altitude is not graphed as zero",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export GPX" }).click();
  const download = await downloadPromise;
  ok(
    download.suggestedFilename().endsWith(".gpx"),
    "Saved GPS route exports as GPX",
  );
  await nav("Profile");
  await page.getByRole("switch", { name: "Demo mode" }).click();
  await page.getByText("18 demo activities · this device").waitFor();
  ok(
    (await page.getByRole("textbox", { name: "Name" }).inputValue()) === "Alex",
    "Demo has a complete separate profile",
  );
  await page.getByRole("button", { name: "Activities", exact: true }).click();
  ok(
    (await page.locator(".activity-row").count()) === 18,
    "Demo starts with eighteen completed rides",
  );
  await page.locator(".activity-row").first().click();
  await page.getByRole("button", { name: "Play replay", exact: true }).click();
  await page.waitForFunction(
    () =>
      Number(document.querySelector('[aria-label="Replay position"]').value) >
      0,
  );
  ok(true, "Saved demo replay advances");
  await page.getByRole("button", { name: "Pause replay", exact: true }).click();
  await page.screenshot({ path: `${out}/demo-replay.png`, fullPage: true });
  await nav("Record");
  ok(
    await page
      .getByRole("button", { name: "Start demo activity", exact: true })
      .isVisible(),
    "Demo is opt-in through Settings",
  );
  await page
    .getByRole("button", { name: "Start demo activity", exact: true })
    .click();
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  ok(
    await page.getByText(/Simulated time/).isVisible(),
    "Demo uses the recording controls and synthetic clock",
  );
  await page.getByRole("button", { name: "Finish ride", exact: true }).click();
  await page.getByRole("button", { name: "Just right", exact: true }).click();
  await page
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await page.getByRole("button", { name: "Export GPX" }).waitFor();
  ok(
    await page.getByText(/This ride uses simulated GPS/).isVisible(),
    "Demo saves with explicit provenance",
  );
  await nav("Profile");
  await page.getByRole("button", { name: "Activities", exact: true }).click();
  ok(
    (await page.locator(".activity-row").count()) === 19,
    "Demo history excludes the real GPS ride",
  );
  await nav("Profile");
  await page.getByRole("switch", { name: "Demo mode" }).click();
  await page.getByRole("button", { name: "Activities", exact: true }).click();
  ok(
    (await page.locator(".activity-row").count()) === 1,
    "Live history excludes demo rides",
  );
  await nav("Progress");
  ok(
    await page.getByRole("heading", { name: "See your progress." }).isVisible(),
    "Real saved rides feed Progress",
  );
  await nav("Record");
  await page
    .getByRole("button", { name: "Start activity", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish ride", exact: true }).click();
  await page
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await page.getByText(/At least two usable GPS points/).waitFor();
  ok(
    await page.getByText(/At least two usable GPS points/).isVisible(),
    "Empty recordings cannot be saved",
  );
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard recording", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start activity", exact: true })
    .waitFor();
  ok(true, "Draft discard resets recorder");
  await nav("Home");
  ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile layout has no horizontal overflow",
  );
  await page.screenshot({ path: `${out}/local-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Profile", exact: true })
    .click();
  ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Desktop layout has no horizontal overflow",
  );
  ok(
    errors.length === 0,
    `No browser runtime exceptions (${errors.join("; ")})`,
  );
  console.log(`\n${checks} local UI checks passed.`);
  await context.close();
} finally {
  await browser.close();
}
