import "../index.css"

import { type ReactElement } from "react"
import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import { commands } from "vitest/browser"

type Totals = { style: number; layout: number; script: number; task: number }
type Memory = { heap: number; nodes: number; layoutObjects: number }

declare module "vitest/browser" {
  interface BrowserCommands {
    browserTotals: () => Promise<Totals>
    browserMemory: () => Promise<Memory>
    throttle: (rate: number) => Promise<void>
    profileStart: () => Promise<void>
    profileStop: (name: string) => Promise<string>
    selectorsStart: () => Promise<void>
    selectorsStop: (
      top: number
    ) => Promise<
      [ms: number, attempts: number, matches: number, selector: string][]
    >
  }
}

/** Runs an update and renders it before returning (act is development-only). */
export const sync = (update: () => void) => flushSync(update)

let mounted: { root: Root; host: HTMLElement } | undefined

export function render(element: ReactElement): HTMLElement {
  unmount()
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  sync(() => root.render(element))
  mounted = { root, host }
  return host
}

export function unmount() {
  if (!mounted) return
  const { root, host } = mounted
  root.unmount()
  host.remove()
  mounted = undefined
}

/** Script and layout time of the steps measured so far. */
export const split = { script: 0, layout: 0 }

/** Times a synchronous step, including the layout it causes. */
export function time(step: () => void): number {
  const start = performance.now()
  step()
  const scripted = performance.now()
  void document.body.offsetHeight
  const end = performance.now()
  split.script += scripted - start
  split.layout += end - scripted
  return end - start
}

export const frame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve))

const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0

/** Median, 95th percentile and total, in milliseconds. */
export function summary(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b)
  const round = (n: number) => Math.round(n * 1000) / 1000
  return {
    n: samples.length,
    median: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    total: round(samples.reduce((sum, n) => sum + n, 0)),
  }
}

/** Prints a result where `pnpm perf` shows it. */
export function report(name: string, samples: number[]) {
  const result = summary(samples)
  const share = Math.round(
    (100 * split.layout) / (split.script + split.layout || 1)
  )
  console.log(
    `PERF ${name}: median ${result.median}ms p95 ${result.p95}ms total ${result.total}ms (n=${result.n}, layout ${share}%)`
  )
  split.script = 0
  split.layout = 0
  return result
}

console.log(`PERF React build: ${process.env.NODE_ENV}`)

/**
 * Time spent in animation frame, resize observer and mutation observer
 * callbacks since the last read: work that components defer out of the
 * update itself.
 */
export const deferred = { busy: 0 }

function timed<Args extends unknown[]>(callback: (...args: Args) => void) {
  return (...args: Args) => {
    const start = performance.now()
    try {
      callback(...args)
    } finally {
      deferred.busy += performance.now() - start
    }
  }
}

const requestFrame = window.requestAnimationFrame.bind(window)
window.requestAnimationFrame = (callback) => requestFrame(timed(callback))

for (const name of ["ResizeObserver", "MutationObserver"] as const) {
  const Observer = window[name] as unknown as new (
    callback: (...args: unknown[]) => void
  ) => object
  // @ts-expect-error a subclass that times the callback
  window[name] = class extends Observer {
    constructor(callback: (...args: unknown[]) => void) {
      super(timed(callback))
    }
  }
}

/**
 * Times a step and the deferred work it causes, over the next frames:
 * the update and its layout, then what runs in the frames after it.
 */
export async function timeWithFrames(step: () => void, frames = 3) {
  deferred.busy = 0
  const now = time(step)
  for (let i = 0; i < frames; i++) await frame()
  const total = now + deferred.busy
  deferred.busy = 0
  return total
}

/**
 * Runs a step and waits for the frames after it (or until `frames`
 * resolves), and returns what the browser spent on it: style, layout and
 * script, frames included, and the main thread's tasks in all.
 */
export async function measureFrames(
  step: () => void,
  frames: number | (() => Promise<unknown>) = 3
): Promise<Totals & { total: number }> {
  const before = await commands.browserTotals()
  step()
  if (typeof frames === "number") for (let i = 0; i < frames; i++) await frame()
  else await frames()
  const after = await commands.browserTotals()
  const style = after.style - before.style
  const layout = after.layout - before.layout
  const script = after.script - before.script
  const task = after.task - before.task
  return { style, layout, script, task, total: style + layout + script }
}

/** Prints the median of each part of measureFrames results. */
export function reportFrames(
  name: string,
  samples: (Totals & { total: number })[]
) {
  const median = (pick: (sample: Totals & { total: number }) => number) =>
    summary(samples.map(pick)).median
  console.log(
    `PERF ${name}: median ${median((s) => s.total)}ms (style ${median((s) => s.style)}, layout ${median((s) => s.layout)}, script ${median((s) => s.script)}; main thread ${median((s) => s.task)}; n=${samples.length}, frames included)`
  )
}

/**
 * Profiles a step's CPU (Chromium only): written to
 * `.vitest/profiles/<name>.cpuprofile` to open in DevTools.
 */
export async function profile<T>(name: string, step: () => Promise<T> | T) {
  await commands.profileStart()
  try {
    return await step()
  } finally {
    console.log(`PERF profile: ${await commands.profileStop(name)}`)
  }
}

/**
 * The selectors a step's style recalculation spent most on (Chromium
 * only): printed, the costliest first.
 */
export async function selectors(
  name: string,
  step: () => Promise<unknown> | unknown,
  top = 15
) {
  await commands.selectorsStart()
  try {
    await step()
  } finally {
    for (const [
      ms,
      attempts,
      matches,
      selector,
    ] of await commands.selectorsStop(top))
      console.log(
        `PERF selectors ${name}: ${ms}ms ${attempts} tried ${matches} matched  ${selector}`
      )
  }
}

/** What the page holds, garbage collected: heap, DOM nodes, layout objects. */
export const memory = () => commands.browserMemory()
