/*
 * Forced colours (Windows high contrast) replace author colours with system
 * colours and drop backgrounds and shadows. shadcn's components show focus
 * with a box-shadow ring and states with fills; the stylesheet's
 * forced-colours block puts them back. These tests emulate the mode in
 * Chromium and check that every state still shows.
 */
import "../index.css"

import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest"
import { commands, userEvent } from "vitest/browser"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateForcedColors: (active: boolean) => Promise<void>
  }
}

let root: Root | undefined
let host: HTMLElement | undefined

function render(element: ReactElement): HTMLElement {
  host = document.createElement("div")
  document.body.append(host)
  const created = createRoot(host)
  root = created
  act(() => created.render(element))
  return host
}

/** The value a system colour resolves to in the current mode. */
function systemColor(name: string): string {
  const probe = document.createElement("span")
  probe.style.cssText = `forced-color-adjust: none; color: ${name}`
  document.body.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

beforeAll(async () => {
  await commands.emulateForcedColors(true)
})

afterAll(async () => {
  await commands.emulateForcedColors(false)
})

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
})

describe("forced colours", () => {
  test("the mode is active", () => {
    expect(matchMedia("(forced-colors: active)").matches).toBe(true)
  })

  test("keyboard focus shows as an outline", async () => {
    const view = render(<Button>Save</Button>)
    await userEvent.tab()
    const button = view.querySelector("button")!
    expect(document.activeElement).toBe(button)
    const style = getComputedStyle(button)
    expect(style.outlineStyle).toBe("solid")
    expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2)
  })

  test("disabled is GrayText, not faded", () => {
    const view = render(<Button disabled>Save</Button>)
    const style = getComputedStyle(view.querySelector("button")!)
    expect(style.color).toBe(systemColor("GrayText"))
    expect(style.opacity).toBe("1")
  })

  test("a pressed toggle is filled with Highlight", () => {
    const view = render(
      <Toggle defaultPressed aria-label="Pin">
        Pin
      </Toggle>
    )
    const style = getComputedStyle(view.querySelector("button")!)
    expect(style.backgroundColor).toBe(systemColor("Highlight"))
    expect(style.color).toBe(systemColor("HighlightText"))
  })

  test("the active tab is filled with Highlight", () => {
    const view = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const [active, other] = view.querySelectorAll("button")
    expect(getComputedStyle(active!).backgroundColor).toBe(
      systemColor("Highlight")
    )
    expect(getComputedStyle(other!).backgroundColor).not.toBe(
      systemColor("Highlight")
    )
  })
})
