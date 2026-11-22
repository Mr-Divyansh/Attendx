import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = (process.env.RATE_GPT_BASE_URL || "http://127.0.0.1:4173").replace(/\/+$/, "");
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({ headless: true });
let passed = 0;

function pass(label) {
  passed += 1;
  console.log("PASS " + label);
  
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    // Use a deterministic browser geolocation provider. Playwright's
    // context.setGeolocation() does not reliably emit watchPosition updates
    // across all runner/browser combinations, which made movement checks flaky.
    await context.addInitScript(() => {
      const watchers = new Map();
      let nextWatchId = 1;
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          watchPosition(success, error) {
            const id = nextWatchId++;
            watchers.set(id, success);
            window.__setWeatherTestPosition = (latitude, longitude) => {
              for (const callback of watchers.values()) {
                callback({
                  coords: { latitude, longitude, accuracy: 20 },
                  timestamp: Date.now(),
                });
              }
            };
            queueMicrotask(() => window.__setWeatherTestPosition(31.0, 76.0));
            return id;
          },
          clearWatch(id) {
            watchers.delete(id);
          },
        },
      });
    });

    const page = await context.newPage();
    const pageErrors = [];
    const weatherQueries = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.route("**/api/v1/meta/filters**", async (route) => {
      const url = new URL(route.request().url());
      const state = url.searchParams.get("state");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            states: ["Himachal Pradesh", "Uttar Pradesh"],
            districts: state === "Himachal Pradesh" ? ["Mandi", "Kangra"] : ["Aligarh", "Agra"],
            markets: [],
            coverage: { status: "catalogue", pagesScanned: 1, recordsScanned: 0, maxOffset: 0, total: 0 },
          },
        }),
      });
    });

    await page.route(
      /^https:\/\/api\.weatherapi\.com\/v1\/current\.json/,
      async (route) => {
        const query = new URL(route.request().url()).searchParams.get("q") || "";
        weatherQueries.push(query);
        const name = query === "auto:ip"
          ? "Approximate City"
          : query.includes("31.01")
            ? "Moved Location"
            : /^\\d/.test(query)
              ? "Dharampur"
              : query.includes(",")
                ? query.split(",")[0].trim()
                : query;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            location: {
              name,
              region: "Himachal Pradesh",
              country: "India",
              localtime: "2026-11-16 13:00",
            },
            current: {
              temp_c: 23,
              feelslike_c: 24,
              humidity: 48,
              wind_kph: 5,
              pressure_mb: 1012,
              condition: { text: "Clear", icon: "" },
            },
          }),
        });
      },
    );

    const response = await page.goto(baseUrl + "/weather.html", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    assert.equal(response?.status(), 200, viewport.name + ": weather page returns HTTP 200");
    await page.waitForSelector("#useMyLocationBtn");
    assert.equal(weatherQueries.length, 0, viewport.name + ": location is not requested automatically");
    pass(viewport.name + ": weather page opens without silently requesting location");

    await page.locator('[data-lang="hi"]').click();
    await page.waitForFunction(() =>
      document.documentElement.lang === "hi" &&
      document.querySelector("#weatherPageTitle")?.textContent?.trim() === "आपके आस-पास का मौसम",
    );
    await page.locator('[data-lang="en"]').click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    pass(viewport.name + ": English and Hindi weather translations switch correctly");

    await page.locator("#useMyLocationBtn").click();
    await page.waitForFunction(() =>
      document.querySelector("#weatherCity")?.textContent?.includes("Dharampur") &&
      document.querySelector("#weatherResult")?.hidden === false,
    );
    assert.equal(weatherQueries.at(-1), "31,76", viewport.name + ": device GPS coordinates are sent to the weather lookup");
    assert.match(await page.locator("#weatherStatus").innerText(), /live location tracking/i);
    assert.equal(await page.locator("#weatherLocationMeta").isVisible(), true, viewport.name + ": GPS accuracy and last-fix metadata are displayed");
    assert.match(await page.locator("#weatherLocationMeta").innerText(), /accuracy/i);
    pass(viewport.name + ": explicit device-location action loads weather from simulated browser coordinates");
    assert.equal(await page.locator("#stopLocationTrackingBtn").isVisible(), true, viewport.name + ": live tracking exposes a stop control");
    await page.waitForTimeout(15000);
    await page.evaluate(() => window.__setWeatherTestPosition(31.01, 76.01));
    await page.waitForFunction(() => document.querySelector("#weatherCity")?.textContent?.includes("Moved Location"), null, { timeout: 30000 });
    assert.ok(weatherQueries.length >= 2, viewport.name + ": meaningful movement triggers a fresh weather lookup");
    const movementRequestCount = weatherQueries.length;
    await page.evaluate(() => window.__setWeatherTestPosition(31.0101, 76.0101));
    await page.waitForTimeout(1200);
    assert.equal(weatherQueries.length, movementRequestCount, viewport.name + ": small movement does not cause unnecessary weather API requests");
    await page.locator("#stopLocationTrackingBtn").click();
    assert.equal(await page.locator("#useMyLocationBtn").isVisible(), true, viewport.name + ": stop restores the start control");
    assert.equal(await page.locator("#stopLocationTrackingBtn").isVisible(), false, viewport.name + ": stop hides its own control");
    const stoppedRequestCount = weatherQueries.length;
    await page.evaluate(() => window.__setWeatherTestPosition(31.03, 76.03));
    await page.waitForTimeout(1200);
    assert.equal(weatherQueries.length, stoppedRequestCount, viewport.name + ": stopped tracking does not send more weather requests");
    pass(viewport.name + ": movement refresh, request throttling and stop control work");

    await page.locator("#useApproxLocationBtn").click();
    await page.waitForFunction(() =>
      document.querySelector("#weatherStatus")?.textContent?.toLowerCase().includes("approximate"),
    );
    assert.equal(weatherQueries.at(-1), "auto:ip", viewport.name + ": approximate lookup uses the opt-in IP query");
    assert.match(await page.locator("#weatherCity").innerText(), /Approximate City/);
    pass(viewport.name + ": approximate location works only after the user clicks its separate action");

    const stateSelect = page.locator("#stateSelect");
    await page.waitForFunction(() => document.querySelector("#stateSelect")?.options.length === 3);
    assert.equal(await page.locator("#weatherSearchForm button[type='submit']").count(), 0, viewport.name + ": progressive picker has no manual submit button");
    await stateSelect.selectOption("Himachal Pradesh");
    await page.waitForFunction(() => weatherQueries.at(-1) === "Himachal Pradesh, India");
    await page.waitForFunction(() => document.querySelector("#districtSelect")?.options.length === 3);
    assert.equal(weatherQueries.at(-1), "Himachal Pradesh, India", viewport.name + ": selecting a state automatically refreshes weather");
    await page.locator("#districtSelect").selectOption("Mandi");
    await page.waitForFunction(() => weatherQueries.at(-1) === "Mandi, Himachal Pradesh, India");
    assert.equal(weatherQueries.at(-1), "Mandi, Himachal Pradesh, India", viewport.name + ": selecting a district automatically refreshes weather");
    await page.locator("#cityInput").fill("Sundernagar");
    await page.locator("#cityInput").press("Tab");
    await page.waitForFunction(() => weatherQueries.at(-1) === "Sundernagar, Mandi, Himachal Pradesh, India");
    await page.locator("#villageInput").fill("Deval Khas");
    await page.locator("#villageInput").press("Tab");
    await page.waitForFunction(() => weatherQueries.at(-1) === "Deval Khas, Sundernagar, Mandi, Himachal Pradesh, India");
    pass(viewport.name + ": state, district, city and village selections automatically refresh weather without a submit button");

    await page.locator("#locationInput").fill("Mandi");
    await page.locator("#locationInput").press("Enter");
    await page.waitForFunction(() => weatherQueries.at(-1) === "Mandi");
    assert.equal(weatherQueries.at(-1), "Mandi", viewport.name + ": manual city search sends the entered place");
    pass(viewport.name + ": manual weather search works with Enter");

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    }));
    assert.ok(
      dimensions.documentWidth <= dimensions.viewportWidth + 2,
      viewport.name + ": weather page must not overflow horizontally (" +
        dimensions.documentWidth + " > " + dimensions.viewportWidth + ")",
    );
    if (viewport.width <= 720) {
      await page.locator(".menu-toggle").click();
      assert.equal(await page.locator(".menu-toggle").getAttribute("aria-expanded"), "true");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".menu-toggle").getAttribute("aria-expanded"), "false");
      pass(viewport.name + ": mobile navigation opens and Escape closes it");
    }
    assert.deepEqual(pageErrors, [], viewport.name + ": weather page must not emit uncaught browser JavaScript errors");
    pass(viewport.name + ": no uncaught browser JavaScript errors");

    await context.close();

    if (viewport.name === "mobile") {
      const deniedContext = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      await deniedContext.addInitScript(() => {
        Object.defineProperty(navigator, "geolocation", {
          configurable: true,
          value: {
            watchPosition(_success, error) {
              queueMicrotask(() => error({ code: 1, message: "User denied location" }));
              return 99;
            },
            clearWatch() {},
          },
        });
      });
      const deniedPage = await deniedContext.newPage();
      const deniedPageErrors = [];
      deniedPage.on("pageerror", (error) => deniedPageErrors.push(error.message));
      await deniedPage.goto(baseUrl + "/weather.html", { waitUntil: "domcontentloaded" });
      await deniedPage.locator("#useMyLocationBtn").click();
      await deniedPage.waitForFunction(() => document.querySelector("#weatherError")?.hidden === false);
      assert.match(await deniedPage.locator("#weatherError").innerText(), /location is blocked for this site/i);
      assert.equal(await deniedPage.locator("#stopLocationTrackingBtn").isVisible(), false);
      assert.equal(await deniedPage.locator("#useMyLocationBtn").isVisible(), true);
      assert.deepEqual(deniedPageErrors, [], "denied location permission must not cause uncaught browser errors");
      pass("mobile: denied location permission shows actionable guidance and safely resets tracking controls");
      await deniedContext.close();

      // Simulate a Windows laptop with location permission granted but no GPS fix:
      // high-accuracy watch times out, then the browser's balanced provider succeeds.
      const fallbackContext = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      await fallbackContext.addInitScript(() => {
        let nextId = 1;
        const active = new Map();
        Object.defineProperty(navigator, "geolocation", {
          configurable: true,
          value: {
            watchPosition(success, error, options) {
              const id = nextId++;
              active.set(id, { success, error, options });
              if (options.enableHighAccuracy) {
                queueMicrotask(() => error({ code: 3, message: "High accuracy timed out" }));
              } else {
                queueMicrotask(() => success({
                  coords: { latitude: 32.11, longitude: 76.53, accuracy: 850 },
                  timestamp: Date.now(),
                }));
              }
              return id;
            },
            clearWatch(id) { active.delete(id); },
          },
        });
      });
      const fallbackPage = await fallbackContext.newPage();
      const fallbackQueries = [];
      await fallbackPage.route("https://api.weatherapi.com/v1/current.json**", async (route) => {
        const query = new URL(route.request().url()).searchParams.get("q") || "";
        fallbackQueries.push(query);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            location: { name: "Deval Khas", region: "Himachal Pradesh", country: "India", localtime: "2026-11-17 17:00" },
            current: { temp_c: 18, feelslike_c: 18, humidity: 50, wind_kph: 4, pressure_mb: 1015, condition: { text: "Clear", icon: "" } },
          }),
        });
      });
      await fallbackPage.goto(baseUrl + "/weather.html", { waitUntil: "domcontentloaded" });
      await fallbackPage.locator("#useMyLocationBtn").click();
      await fallbackPage.waitForFunction(() => document.querySelector("#weatherCity")?.textContent?.includes("Deval Khas"));
      assert.equal(fallbackQueries.length, 1, "balanced browser location must request weather once");
      assert.equal(fallbackQueries[0], "32.11,76.53");
      assert.equal(await fallbackPage.locator("#weatherLocationMeta").isVisible(), true);
      assert.match(await fallbackPage.locator("#weatherLocationMeta").innerText(), /850/);
      pass("mobile: high-accuracy timeout retries browser network-assisted geolocation without IP fallback");
      await fallbackContext.close();
    }
  }

  console.log("\\nWeather browser checks: " + passed + " passed, 0 failed");
} finally {
  await browser.close();
}
