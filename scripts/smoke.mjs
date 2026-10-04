import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const base = process.env.SLOPESENSE_URL ?? "http://127.0.0.1:5174";
const out = process.env.SLOPESENSE_SCREENSHOTS ?? "test-results";
mkdirSync(out, { recursive: true });
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "darwin" &&
  existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const browser = await chromium.launch({
  headless: true,
  executablePath: chrome,
});
let checks = 0;
const ok = (condition, label) => {
  assert.ok(condition, label);
  checks++;
  console.log(`✓ ${label}`);
};
const key = "slopesense:v2";
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.startsWith(base) ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    )
      return route.continue();
    external.push(url);
    return route.abort();
  });
  const nav = (label) =>
    page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: label, exact: true })
      .click();
  const shot = async (name) => {
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `${out}/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  };
  const state = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const noOverflow = async (label) =>
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${label}: no horizontal overflow`,
    );
  const scrub = async (ratio) => {
    const slider = page.getByRole("slider", { name: "Replay position" });
    await slider.evaluate((el, r) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(el, Number(el.max) * r);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, ratio);
  };
  await page.goto(base);
  await page.waitForLoadState("networkidle");
  ok(
    await page.getByRole("heading", { name: /A better/ }).isVisible(),
    "First-launch onboarding",
  );
  await shot("01-onboarding-mobile");
  await page.getByRole("button", { name: "Explore Alex's demo" }).click();
  ok(
    (await state()).profile.ceiling === "blue",
    "Demo selection explicitly retains the Blue ceiling",
  );
  ok(
    (await page.locator(".mountain-card").count()) === 3,
    "All three mountains load",
  );
  ok((await state()).activities.length === 6, "Six demo history entries load");
  await noOverflow("Home");
  await shot("02-home-mobile");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("03-home-desktop");
  await noOverflow("Desktop home");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Where should I ride today?", exact: true })
    .click();
  ok(
    await page.getByText("Cypress is your best fit today.").isVisible(),
    "Mountain comparison ranks Cypress first",
  );
  await page
    .getByRole("button", { name: "Explore Cypress", exact: true })
    .click();
  for (const name of ["Grouse", "Mt Seymour", "Cypress"]) {
    await page
      .locator(".resort-switch")
      .getByRole("button", { name, exact: true })
      .click();
    ok(
      await page
        .getByRole("group", {
          name: new RegExp(`Interactive trail map for ${name}`),
        })
        .isVisible(),
      `${name} real trail map loads`,
    );
    ok(
      (await page.locator(".map-trail").count()) >= 10,
      `${name} has at least ten selectable mapped trails`,
    );
  }
  const transformBefore = await page
    .locator(".terrain-canvas>g")
    .getAttribute("transform");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  ok(
    (await page.locator(".terrain-canvas>g").getAttribute("transform")) !==
      transformBefore,
    "Map zoom updates transform",
  );
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select T-33, blue", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  ok(
    await page.getByRole("heading", { name: "T-33", exact: true }).isVisible(),
    "Keyboard-accessible map trail selection",
  );
  await page.getByText("Inside your 89% match").click();
  ok(
    await page.getByText("Ability fit", { exact: false }).isVisible(),
    "Deterministic score breakdown is inspectable",
  );
  await noOverflow("Mountain");
  await shot("04-mountain-mobile");
  await page
    .getByRole("button", { name: "Demo Replay Synthetic telemetry" })
    .click();
  await page
    .getByRole("button", { name: "Pause replay", exact: true })
    .waitFor();
  const riderBefore = await page
    .getByTestId("map-rider")
    .getAttribute("transform");
  await page.waitForTimeout(700);
  ok(
    (await page.getByTestId("map-rider").getAttribute("transform")) !==
      riderBefore,
    "Rider moves along mapped coordinates",
  );
  ok(
    Number(
      await page.getByRole("slider", { name: "Replay position" }).inputValue(),
    ) > 0,
    "Replay clock advances",
  );
  await page.getByRole("button", { name: "Pause replay", exact: true }).click();
  const paused = await page
    .getByRole("slider", { name: "Replay position" })
    .inputValue();
  await page.waitForTimeout(250);
  ok(
    (await page
      .getByRole("slider", { name: "Replay position" })
      .inputValue()) === paused,
    "Pause holds replay time",
  );
  await page
    .getByRole("button", { name: "Restart replay", exact: true })
    .click();
  ok(
    Number(
      await page.getByRole("slider", { name: "Replay position" }).inputValue(),
    ) === 0,
    "Restart returns to the trail start",
  );
  for (const rate of ["1×", "2×", "4×"]) {
    await page.getByRole("button", { name: rate, exact: true }).click();
    ok(
      (await page
        .getByRole("button", { name: rate, exact: true })
        .getAttribute("aria-pressed")) === "true",
      `${rate} playback rate selectable`,
    );
  }
  await scrub(0.35);
  ok(
    Number(
      await page.getByRole("slider", { name: "Replay position" }).inputValue(),
    ) > 30,
    "Timeline scrubbing updates time",
  );
  ok(
    await page.getByText("Gradient increasing", { exact: true }).isVisible(),
    "Gradient event appears as its samples are reached",
  );
  ok(
    (await page.locator(".telemetry-event").count()) > 0,
    "Objective telemetry events are visible",
  );
  for (const mode of [
    "elevation",
    "speed-time",
    "gradient",
    "speed-distance",
  ]) {
    await page.getByRole("combobox", { name: "Graph type" }).selectOption(mode);
    ok(
      await page.getByTestId("telemetry-chart").isVisible(),
      `${mode} graph renders`,
    );
  }
  await shot("05-replay-mobile");
  await noOverflow("Replay");
  // Natural completion through the animation loop, rather than a summary-only shortcut.
  await scrub(0.995);
  await page.getByRole("button", { name: "Play replay", exact: true }).click();
  await page.getByRole("region", { name: "Run complete" }).waitFor();
  ok(
    await page.getByRole("heading", { name: "That’s a wrap." }).isVisible(),
    "Replay finishes naturally into analytics summary",
  );
  ok(
    await page
      .getByRole("button", { name: "Save & find my next run" })
      .isDisabled(),
    "Feedback is required before saving",
  );
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  await page.getByRole("button", { name: "Save & find my next run" }).click();
  ok(
    (await state()).activities.length === 7,
    "Feedback saves exactly one completed activity",
  );
  ok(
    (await state()).activities.at(-1).feeling === "easy",
    "Easy feedback is persisted",
  );
  ok(
    await page.getByText("RIDER MODEL UPDATED", { exact: false }).isVisible(),
    "Rider model update is shown",
  );
  ok(
    await page
      .locator(".after-next")
      .getByRole("heading", { name: /Horizon/ })
      .isVisible(),
    "Next recommendation changes to Horizon",
  );
  await shot("06-completed-mobile");
  await page
    .getByRole("button", { name: "Explore next run", exact: true })
    .click();
  ok(
    await page
      .getByRole("heading", { name: "Horizon", exact: true })
      .isVisible(),
    "New recommendation opens its real trail",
  );
  await nav("Activity");
  ok(
    (await page.locator(".activity-row").count()) === 7,
    "Activity list includes saved replay",
  );
  await page
    .locator(".activity-row")
    .filter({ hasText: "Crazy Raven" })
    .first()
    .click();
  ok(
    await page
      .getByRole("heading", { name: "Compare your tracks." })
      .isVisible(),
    "Repeated-run comparison loads",
  );
  ok(
    await page
      .locator(".comparison-table")
      .getByText("Moving-speed variation", { exact: true })
      .isVisible(),
    "Comparison reports pace variation rather than invented improvement",
  );
  await page
    .getByRole("combobox", { name: "Compare with activity" })
    .selectOption({ index: 1 });
  await noOverflow("Comparison");
  await shot("07-comparison-mobile");
  await nav("Progress");
  ok(
    (await page.getByText("Not enough data yet", { exact: true }).count()) >= 2,
    "Unobserved firm and ungroomed skills remain unknown",
  );
  await shot("08-progress-mobile");
  await noOverflow("Progress");
  await nav("Profile");
  await page.getByRole("button", { name: "● Green", exact: true }).click();
  await page
    .getByRole("button", { name: "Save my preferences", exact: true })
    .click();
  ok(
    (await state()).profile.ceiling === "green",
    "Explicit profile ceiling change persists",
  );
  await nav("Home");
  await page
    .getByRole("textbox", { name: "Ask SlopeSense" })
    .fill("Give me a harder blue");
  await page
    .getByRole("button", { name: "Apply request", exact: true })
    .click();
  ok(
    (await state()).profile.ceiling === "green",
    "Natural-language challenge request cannot raise the ceiling",
  );
  ok(
    await page
      .locator(".ask-answer")
      .getByText(/No matching runs within your green ceiling/)
      .isVisible(),
    "Blue request under Green ceiling is refused by the engine",
  );
  await page
    .getByRole("button", { name: "Explore Cypress", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select T-33, blue", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  ok(
    await page
      .getByText(/This run is outside your selected terrain ceiling/)
      .isVisible(),
    "Out-of-limit trail is inspectable but cannot be recommended or replayed",
  );
  ok(
    (await page
      .getByRole("button", { name: "Demo Replay Synthetic telemetry" })
      .count()) === 0,
    "Out-of-limit action is not available",
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
  ok(
    (await state()).activities.length === 7 &&
      (await state()).profile.ceiling === "green",
    "Reload preserves feedback, history and profile",
  );
  await context.setOffline(true);
  await nav("Explore");
  ok(
    await page
      .getByRole("group", { name: /Interactive trail map/ })
      .isVisible(),
    "Already-loaded map works completely offline",
  );
  await nav("Activity");
  ok(
    (await page.locator(".activity-row").count()) === 7,
    "Stored activity remains available offline",
  );
  await context.setOffline(false);
  ok(external.length === 0, "Application makes no external service requests");
  await nav("Profile");
  await page
    .getByRole("button", { name: "Reset demo account", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  ok(
    (await state()).activities.length === 6 &&
      (await state()).profile.ceiling === "blue",
    "In-app reset restores the repeatable judge demo",
  );
  await page.evaluate((k) => localStorage.setItem(k, "broken JSON"), key);
  await page.reload();
  ok(
    await page.getByRole("button", { name: "Explore Alex's demo" }).isVisible(),
    "Corrupt local storage recovers without crashing",
  );
  await page.getByRole("button", { name: "Set up my own rider" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill("Jordan");
  await page.getByRole("button", { name: "Skis", exact: true }).click();
  await page.getByRole("button", { name: "beginner", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "● Green", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Take it easy", exact: true }).click();
  await page
    .getByRole("button", { name: "Find my next run", exact: true })
    .click();
  const fresh = await state();
  ok(
    fresh.profile.sport === "ski" &&
      fresh.profile.name === "Jordan" &&
      fresh.activities.length === 0,
    "Custom onboarding starts with no invented rider evidence",
  );
  await nav("Activity");
  ok(
    await page
      .getByRole("heading", { name: "Your first tracks are waiting." })
      .isVisible(),
    "Empty history is useful and actionable",
  );
  await nav("Progress");
  ok(
    (await page.getByText("Not enough data yet", { exact: true }).count()) ===
      7,
    "Empty model shows unknown for every skill dimension",
  );
  // Extra narrow viewport regression.
  await page.setViewportSize({ width: 360, height: 800 });
  await noOverflow("Narrow progress");
  await nav("Profile");
  await noOverflow("Narrow profile");
  await nav("Home");
  await noOverflow("Narrow home");
  ok(errors.length === 0, `No browser runtime errors: ${errors.join("; ")}`);
  console.log(`\n${checks} browser checks passed. Screenshots: ${out}`);
  await context.close();
} finally {
  await browser.close();
}
