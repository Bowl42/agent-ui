import { expect, test } from "vitest"
import { commands } from "vitest/browser"

import {
  LongConversation,
  instrument,
  screenshots,
} from "@/stories/long-conversation"

import { frame, render } from "./harness"

async function settle(frames = 20) {
  for (let i = 0; i < frames; i++) await frame()
}

test("long conversation: scrolling 300 tool-heavy turns", async () => {
  const host = render(<LongConversation />)
  const viewport = host.querySelector<HTMLElement>(
    "[data-slot=message-scroller-viewport]"
  )!
  await settle(30)
  const probe = instrument(viewport)
  // As a slower machine: 6× slower.
  // Chromium only (DevTools); elsewhere at its own speed.
  await commands.throttle(6).catch(() => {})
  const times: number[] = []
  const run = async (label: string, delta: number, steps: number) => {
    probe.counts.rects = 0
    probe.counts.inFrames = 0
    probe.counts.writes = 0
    times.length = 0
    let last = performance.now()
    for (let step = 0; step < steps; step++) {
      probe.scrollBy(delta)
      await frame()
      const now = performance.now()
      times.push(now - last)
      last = now
    }
    await settle(10)
    const sorted = [...times].sort((a, b) => a - b)
    const p = (q: number) =>
      Math.round(sorted[Math.floor((sorted.length - 1) * q)]! * 10) / 10
    const result = {
      rectsPerFrame: Math.round((probe.counts.rects / steps) * 10) / 10,
      beforeLayoutPerFrame:
        Math.round((probe.counts.inFrames / steps) * 10) / 10,
      writes: probe.counts.writes,
      p50: p(0.5),
      p95: p(0.95),
      over50: times.filter((time) => time > 50).length,
    }
    console.log(`PERF long conversation ${label}: ${JSON.stringify(result)}`)
    return result
  }
  // Up into turns not yet seen, then back down over them, then up again.
  const first = await run("up, first time", -120, 150)
  const down = await run("down, over seen turns", 120, 150)
  const again = await run("up, over seen turns", -120, 150)
  probe.restore()
  await commands.throttle(1).catch(() => {})
  // Over turns already measured, nothing changes size: no correction,
  // and nothing read before a frame's layout.
  expect(down.writes).toBe(0)
  expect(again.writes).toBe(0)
  expect(down.beforeLayoutPerFrame).toBe(0)
  expect(again.beforeLayoutPerFrame).toBe(0)
  expect(first.beforeLayoutPerFrame).toBe(0)
})

// An agent's screenshots in a conversation: each a 2880×1800 image in a
// card in a flex box ten deep. Sized by its percentage height, an image
// made WebKit lay every flex box around it out again at each layout:
// frames of 100ms and more as one scrolled.
test("long conversation: scrolling 40 turns with two screenshots each", async () => {
  const shots = await screenshots(80)
  const host = render(<LongConversation count={40} screenshots={shots} />)
  const viewport = host.querySelector<HTMLElement>(
    "[data-slot=message-scroller-viewport]"
  )!
  await settle(30)
  const times: number[] = []
  for (const delta of [200, -200]) {
    let last = performance.now()
    for (let step = 0; step < 75; step++) {
      viewport.scrollTop += delta
      await frame()
      const now = performance.now()
      times.push(now - last)
      last = now
    }
  }
  const sorted = [...times].sort((a, b) => a - b)
  const p = (q: number) =>
    Math.round(sorted[Math.floor((sorted.length - 1) * q)]! * 10) / 10
  const result = {
    p50: p(0.5),
    p95: p(0.95),
    over50: times.filter((time) => time > 50).length,
    images: host.querySelectorAll("[data-slot=media-gallery-item] img").length,
  }
  console.log(`PERF long conversation, screenshots: ${JSON.stringify(result)}`)
  for (const url of shots) URL.revokeObjectURL(url)
  expect(result.images).toBeGreaterThan(0)
  expect(result.p50).toBeLessThan(25)
})
