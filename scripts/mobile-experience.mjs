import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser, disableWebGL } from "./browser-test-utils.mjs";
const browser = await launchBrowser();
const out = process.env.SLOPESENSE_SCREENSHOTS || "test-results/mobile";
mkdirSync(out, { recursive: true });
let checks = 0;
function ok(value, label) {
  assert.ok(value, label);
  checks++;
  console.log("✓ " + label);
}
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://**/*", (r) => r.abort());
  await page.addInitScript(disableWebGL);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition(success) {
          success({
            coords: { latitude: 49.396, longitude: -123.207, accuracy: 5 },
          });
        },
      },
    }),
  );
  await page.goto(process.env.SLOPESENSE_URL || "http://127.0.0.1:5173");
  const nav = async (name) => {
    const mobile = page.getByRole("navigation", { name: "Mobile navigation" });
    const root = (await mobile.isVisible())
      ? mobile
      : page.getByRole("navigation", { name: "Main navigation" });
    await root.getByRole("button", { name, exact: true }).click();
  };
  await page.waitForFunction(() => {
    const img = document.querySelector(".range-artwork");
    return img.complete && img.naturalWidth > 0;
  });
  await page.screenshot({ path: `${out}/home-mobile.png` });
  await page
    .getByRole("button", {
      name: "Explore Cypress Mountain terrain",
      exact: true,
    })
    .press("Enter");
  await page
    .getByRole("heading", { name: "Cypress Mountain", exact: true })
    .waitFor();
  ok(true, "Mountain terrain itself opens Explore with keyboard access");
  await page.locator(".geographic-context path").first().waitFor();
  ok(
    (await page.locator('.geographic-context [data-context="lift"]').count()) >
      0 &&
      (await page
        .locator('.geographic-context [data-context="connector"]')
        .count()) > 0,
    "Cypress includes mapped lifts and unnamed run connectors",
  );
  await page
    .locator(".trail-grid .trail-row")
    .filter({ hasText: "Panorama" })
    .click();
  ok(
    await page.evaluate(() => scrollY === 0),
    "Selecting a run returns to the top of Explore",
  );
  await page
    .getByRole("button", { name: "Record this run", exact: true })
    .waitFor();
  ok(
    await page
      .getByRole("button", { name: "Record this run", exact: true })
      .isVisible(),
    "Selected run has a visible recording action",
  );
  await page.screenshot({ path: `${out}/explore-mobile.png` });
  await nav("Record");
  await page
    .getByRole("button", { name: "Start activity", exact: true })
    .waitFor();
  ok(
    (await page.locator(".map-controls").count()) === 0,
    "Record has no zoom button cluster",
  );
  ok(
    await page.locator(".record-title .secondary svg").isVisible(),
    "Ride history has a visible icon on phones",
  );
  ok(
    await page
      .locator(".gps-status")
      .evaluate((el) => el.getBoundingClientRect().height < 45),
    "GPS status stays a compact overlay",
  );
  ok(
    await page.evaluate(
      () =>
        document.documentElement.clientWidth === innerWidth &&
        document.documentElement.scrollWidth === innerWidth,
    ),
    "Recorder uses the complete phone width",
  );
  const start = await page
    .getByRole("button", { name: "Start activity", exact: true })
    .boundingBox();
  const bottom = await page.locator(".bottom-nav").boundingBox();
  ok(
    start.y + start.height < bottom.y,
    "Start control remains above mobile navigation",
  );
  await page.getByRole("button", { name: "Locate me", exact: true }).click();
  await page.locator('[data-testid="map-rider"]').waitFor();
  ok(true, "Locate displays an actual supplied GPS position in offline mode");
  await page.screenshot({ path: `${out}/record-mobile.png` });
  await nav("Profile");
  await page.getByRole("switch", { name: "Demo mode" }).click();
  await page.getByRole("button", { name: "Activities", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to Profile", exact: true })
    .click();
  ok(
    (await page.getByRole("textbox", { name: "Name" }).inputValue()) === "Alex",
    "Activities returns to the complete demo profile",
  );
  await nav("Progress");
  await page.getByRole("region", { name: "Rider level" }).waitFor();
  ok(
    (await page.locator(".ride-badges .earned").count()) === 3,
    "Completed demo rides unlock experience badges",
  );
  ok(
    (await page
      .getByRole("progressbar", { name: "Progress to next riding level" })
      .getAttribute("value")) < 1,
    "Demo rider can continue earning towards another level",
  );
  await page.locator(".recent-rides-menu summary").click();
  await page.locator(".recent-rides-list button").first().click();
  await page
    .getByRole("button", { name: "Play replay", exact: true })
    .waitFor();
  ok(true, "Expandable recent rides opens a playable replay");
  await nav("Progress");
  await page.locator(".rider-level").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/progress-mobile.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  await nav("Home");
  ok(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
    "Desktop Home fills the viewport without vertical scrolling",
  );
  await page.waitForFunction(() => {
    const img = document.querySelector(".range-artwork");
    return img.complete && img.naturalWidth > 0;
  });
  await page.screenshot({ path: `${out}/home-desktop.png` });
  await nav("Record");
  ok(
    await page.locator(".desktop-nav .record-nav svg").isVisible(),
    "Desktop recording navigation uses a visible icon",
  );
  await page.screenshot({ path: `${out}/record-desktop.png` });
  await page.setViewportSize({ width: 320, height: 568 });
  await nav("Record");
  ok(
    await page
      .getByRole("button", { name: "Start demo activity", exact: true })
      .evaluate((el) => {
        const b = el.getBoundingClientRect(),
          c = el.closest(".record-console").getBoundingClientRect();
        return (
          b.top >= c.top &&
          b.bottom <= c.bottom &&
          b.bottom <=
            document.querySelector(".bottom-nav").getBoundingClientRect().top
        );
      }),
    "Small phone keeps Start visible without scrolling the console",
  );
  await page.getByLabel("Recording sport", { exact: true }).selectOption("ski");
  ok(
    (await page.getByLabel("Recording sport", { exact: true }).inputValue()) ===
      "ski",
    "Recorder offers an explicit activity sport selector",
  );
  await page.screenshot({ path: `${out}/record-small-phone.png` });
  ok(errors.length === 0, "Mobile experience has no uncaught browser errors");
  // Catch stylesheet/canvas regressions with WebGL enabled, while keeping tile outages deterministic.
  const mapContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const mapPage = await mapContext.newPage();
  await mapPage.route("https://**/*", (r) => r.abort());
  await mapPage.goto(process.env.SLOPESENSE_URL || "http://127.0.0.1:5173");
  await mapPage
    .getByRole("button", { name: "Explore Cypress Mountain", exact: true })
    .click();
  await mapPage.locator(".maplibregl-canvas").waitFor();
  ok(
    await mapPage
      .locator(".run-canvas")
      .evaluate(
        (el) =>
          el.clientHeight >= 300 &&
          Math.abs(el.clientHeight - el.parentElement.clientHeight) < 2,
      ),
    "Lazy-loaded WebGL map fills its container instead of collapsing",
  );
  await mapPage
    .locator(".trail-grid .trail-row")
    .filter({ hasText: "Panorama" })
    .click();
  await mapPage
    .locator(".map-toolbar")
    .getByRole("button", { name: "All runs", exact: true })
    .waitFor();
  ok(
    (await mapPage.locator(".run-map").isVisible()) &&
      ((await mapPage.locator(".terrain-canvas").count()) > 0 ||
        !(await mapPage.locator(".run-map").getAttribute("class")).includes(
          "is-loading",
        )),
    "Blocked basemap metadata still leaves an interactive local run map",
  );
  await mapPage.screenshot({ path: `${out}/webgl-outage-map.png` });
  await mapContext.close();
  console.log(`${checks} mobile experience checks passed.`);
} finally {
  await browser.close();
}
