import { playwright } from "@vitest/browser-playwright"
import type { CDPSession } from "playwright"
import { defineConfig, mergeConfig } from "vitest/config"
import type { BrowserCommand } from "vitest/node"
import viteConfig from "./vite.config.ts"
import { firefoxLaunchOptions } from "./vitest.firefox.ts"

const browser = (process.env.PERF_BROWSER ?? "chromium") as
  "chromium" | "firefox" | "webkit"

const sessions = new WeakMap<object, Promise<CDPSession>>()

/** A DevTools session on the page, its metrics enabled. */
function cdp(page: Parameters<BrowserCommand<[]>>[0]["page"]) {
  let session = sessions.get(page)
  if (!session) {
    session = page
      .context()
      .newCDPSession(page)
      .then(async (created) => {
        await created.send("Performance.enable")
        return created
      })
    sessions.set(page, session)
  }
  return session
}

async function metrics(session: CDPSession) {
  const { metrics } = await session.send("Performance.getMetrics")
  return (name: string) =>
    metrics.find((metric) => metric.name === name)?.value ?? 0
}

/**
 * The browser's own totals, in milliseconds: time spent recalculating
 * style, in layout and running script, including the work of rendering
 * frames, which no callback in the page sees, and all the main thread's
 * tasks (`task`): the script counted misses the tests' frame's own.
 */
const browserTotals: BrowserCommand<[]> = async ({ page }) => {
  const value = await metrics(await cdp(page))
  return {
    style: 1000 * value("RecalcStyleDuration"),
    layout: 1000 * value("LayoutDuration"),
    script: 1000 * value("ScriptDuration"),
    task: 1000 * value("TaskDuration"),
  }
}

/**
 * What the page holds once garbage is collected: its JavaScript heap in
 * bytes, its DOM nodes and its layout objects.
 */
const browserMemory: BrowserCommand<[]> = async ({ page }) => {
  const session = await cdp(page)
  // Twice: DOM nodes let go in one collection are freed in the next.
  await session.send("HeapProfiler.collectGarbage")
  await session.send("HeapProfiler.collectGarbage")
  const value = await metrics(session)
  return {
    heap: value("JSHeapUsedSize"),
    nodes: value("Nodes"),
    layoutObjects: value("LayoutObjects"),
  }
}

/** Slows the page's CPU by `rate` (1 to undo), as a slower machine is. */
const throttle: BrowserCommand<[rate: number]> = async ({ page }, rate) => {
  const session = await cdp(page)
  await session.send("Emulation.setCPUThrottlingRate", { rate })
}

// Benchmarks of the components' hot paths (scrolling, typing, streaming),
// in Chromium. Not part of `pnpm check`: run `pnpm perf` before and after a
// change and compare.
export default mergeConfig(
  viteConfig,
  defineConfig({
    // React's production build: development checks would dominate.
    mode: "production",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    oxc: { jsx: { development: false } },
    test: {
      name: "perf",
      include: ["src/perf/**/*.perf.tsx"],
      testTimeout: 120_000,
      browser: {
        enabled: true,
        headless: true,
        viewport: { width: 1280, height: 800 },
        provider: playwright(),
        // PERF_BROWSER=firefox or webkit to compare engines; only Chromium
        // has browserTotals.
        instances: [
          browser === "firefox"
            ? {
                browser,
                provider: playwright({
                  launchOptions: {
                    ...firefoxLaunchOptions(),
                    // Times to the microsecond, not rounded to the
                    // millisecond.
                    firefoxUserPrefs: {
                      "privacy.reduceTimerPrecision": false,
                      "privacy.reduceTimerPrecision.unconditional": false,
                    },
                  },
                }),
              }
            : { browser },
        ],
        commands: { browserTotals, browserMemory, throttle },
      },
    },
  })
)
