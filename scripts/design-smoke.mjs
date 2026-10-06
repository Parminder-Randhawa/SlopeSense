import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launchBrowser, disableWebGL } from "./browser-test-utils.mjs";
const base = process.env.SLOPESENSE_URL || "http://127.0.0.1:5173";
const out = process.env.SLOPESENSE_SCREENSHOTS || "test-results/design";
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
let count = 0;
const check = (test, label) => {
  assert.ok(test, label);
  count++;
  console.log("✓ " + label);
};
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://**/*", (r) => r.abort());
  await page.addInitScript(disableWebGL);
  await page.goto(base);
  const nav = async (name) => {
    const mobile = page.getByRole("navigation", { name: "Mobile navigation" });
    const main = (await mobile.isVisible())
      ? mobile
      : page.getByRole("navigation", { name: "Main navigation" });
    await main.getByRole("button", { name, exact: true }).click();
  };
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await nav("Home");
    await page.getByRole("heading", { name: "Find your next line." }).waitFor();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${width}px home fits viewport`,
    );
    check(
      (await page.locator(".mountain-beacon").count()) === 0,
      `${width}px has no colored mountain pointers`,
    );
    const art = await page.locator(".range-artwork").boundingBox();
    check(
      Math.abs(art.width - art.height) < 2 && art.width <= 950,
      `${width}px immersive artwork keeps native aspect`,
    );
    await nav("Record");
    await page
      .getByRole("button", { name: "Choose a run", exact: true })
      .click();
    const start = await page
      .getByRole("button", { name: "Start activity", exact: true })
      .boundingBox();
    const consoleBox = await page.locator(".record-console").boundingBox();
    check(
      Math.abs(
        start.x + start.width / 2 - (consoleBox.x + consoleBox.width / 2),
      ) < 2,
      `${width}px record button precisely centered`,
    );
    await page
      .getByRole("button", { name: "Choose recording run" })
      .scrollIntoViewIfNeeded();
    const before = await page.locator(".record-console").boundingBox();
    await page.getByRole("button", { name: "Choose recording run" }).click();
    await page.getByRole("dialog").waitFor();
    const after = await page.locator(".record-console").boundingBox();
    check(
      Math.abs(before.x - after.x) < 2 &&
        Math.abs(before.y - after.y) < 2 &&
        Math.abs(before.width - after.width) < 2,
      `${width}px picker opens without shifting background`,
    );
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${width}px dialog fits viewport`,
    );
    await page.getByRole("button", { name: "Close run picker" }).click();
    const restored = await page.locator(".record-console").boundingBox();
    check(
      Math.abs(before.y - restored.y) < 2,
      `${width}px closing picker preserves scroll`,
    );
    for (const name of ["Explore", "Progress", "Profile"]) {
      await nav(name);
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}px ${name} fits viewport`,
      );
    }
    await nav("Home");
    await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav("Explore");

  await page.getByRole("group", { name: /Interactive trail map/ }).waitFor();
  const initialView = await page
    .locator(".terrain-canvas>g")
    .getAttribute("transform");
  await page
    .getByRole("button", { name: "Select Crazy Raven, blue", exact: true })
    .press("Enter");
  await page
    .locator(".map-toolbar")
    .getByRole("button", { name: "All runs", exact: true })
    .waitFor();
  await page.waitForFunction(
    (initial) =>
      document.querySelector(".terrain-canvas>g")?.getAttribute("transform") !==
      initial,
    initialView,
  );
  const selected = await page
    .locator(".terrain-canvas>g")
    .getAttribute("transform");
  check(
    (await page
      .getByRole("button", { name: "Zoom in", exact: true })
      .count()) === 0,
    "Explore has no free zoom controls",
  );
  const blank = await page.locator(".terrain-canvas").evaluate((svg) => {
    const b = svg.getBoundingClientRect();
    for (let y = 70; y < b.height - 45; y += 15)
      for (let x = 10; x < b.width - 10; x += 15) {
        const el = document.elementFromPoint(b.x + x, b.y + y);
        if (el === svg || el?.tagName.toLowerCase() === "rect") return { x, y };
      }
    return null;
  });
  check(Boolean(blank), "Focused map retains tappable empty space");
  await page.locator(".terrain-canvas").click({ position: blank });
  await page
    .locator(".map-toolbar")
    .getByRole("button", { name: "All runs", exact: true })
    .waitFor({ state: "hidden" });
  await page.waitForFunction(
    (initial) =>
      document.querySelector(".terrain-canvas>g")?.getAttribute("transform") ===
      initial,
    initialView,
  );
  const overview = await page
    .locator(".terrain-canvas>g")
    .getAttribute("transform");
  check(
    overview !== selected,
    "Tapping beside a focused run restores overview",
  );
  await page
    .getByRole("button", { name: "Select Crazy Raven, blue", exact: true })
    .press("Enter");
  await page
    .locator(".map-toolbar")
    .getByRole("button", { name: "All runs", exact: true })
    .click();
  await page.waitForFunction(
    (initial) =>
      document.querySelector(".terrain-canvas>g")?.getAttribute("transform") ===
      initial,
    initialView,
  );
  check(
    (await page.locator(".terrain-canvas>g").getAttribute("transform")) ===
      overview,
    "All runs button restores overview camera",
  );
  check(
    (await page
      .getByRole("button", { name: "Runs only", exact: true })
      .count()) === 0,
    "Removed map style switch stays absent",
  );
  await nav("Profile");
  const demoControl = page.getByRole("switch", { name: "Demo mode" });
  await demoControl.click();
  await page.getByText("18 demo activities · this device").waitFor();
  check(
    await page.getByRole("region", { name: "Riding overview" }).isVisible(),
    "Profile shows calculated riding overview",
  );
  check(
    await page
      .getByRole("heading", { name: "Recent rides & replays" })
      .isVisible(),
    "Replays are directly accessible from Profile",
  );
  check(
    await page
      .locator("aside > :last-child")
      .getByRole("switch", { name: "Demo mode" })
      .isVisible(),
    "Small demo control is last in Settings",
  );
  await page.locator(".profile-recent button").first().click();
  check(
    await page
      .getByRole("button", { name: "Play replay", exact: true })
      .isVisible(),
    "Profile recent ride opens its replay",
  );
  check(errors.length === 0, `No runtime errors: ${errors.join("; ")}`);
  console.log(`${count} design checks passed.`);
  await context.close();
} finally {
  await browser.close();
}
