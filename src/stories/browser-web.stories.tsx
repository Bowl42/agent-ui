import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowExpand01Icon,
  Cancel01Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons"
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"

import {
  Browser,
  resolveWebAddress,
  useBrowser,
  type BrowserPage,
  type BrowserWebContent,
} from "@/components/browser"
import { Button } from "@/components/ui/button"

/** A made-up site, as a dev server would serve it. */
const site = `<!doctype html><html><head><title>Pricing</title><style>
:root{color-scheme:light dark;--fg:#18181b;--fg2:#6b6b73;--bg:#fff;--line:#ebebed;--card:#fafafa}
@media (prefers-color-scheme:dark){:root{--fg:#ededef;--fg2:#a1a1a8;--bg:#0f0f10;--line:#252528;--card:#141415}}
body{margin:0;font:13px/1.5 system-ui,-apple-system,sans-serif;color:var(--fg);background:var(--bg)}
nav{display:flex;align-items:center;gap:18px;height:44px;padding:0 20px;border-bottom:1px solid var(--line);font-size:12px}
nav i{width:18px;height:18px;border-radius:5px;background:var(--fg)}
nav a{color:var(--fg2);text-decoration:none}
nav .in{margin-left:auto;border:1px solid var(--line);border-radius:8px;padding:3px 10px;color:var(--fg);font-size:13px}
main{padding:48px 32px 24px}
h1{font-size:26px;line-height:32px;letter-spacing:-.03em;font-weight:600;margin:0 0 10px;max-width:9em}
p{color:var(--fg2);margin:0 0 18px;max-width:380px}
.cta{display:flex;gap:8px}
.cta button{height:32px;padding:0 12px;border-radius:8px;font:500 13px system-ui,-apple-system,sans-serif;cursor:pointer}
.cta-primary{background:var(--fg);color:var(--bg);border:0}
.cta-secondary{border:1px solid var(--line);background:none;color:var(--fg)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:32px}
.cards div{height:96px;border-radius:10px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
</style></head><body>
<nav><i></i><a href="#">Product</a><a href="#">Pricing</a><a href="#">Docs</a><a class="in" href="#">Sign in</a></nav>
<main><h1>Ship faster with smaller bundles.</h1>
<p>A vendor chunk that caches, CSS per route, and nothing you don't import.</p>
<div class="cta"><button class="cta-primary" type="button">Get started</button><button class="cta-secondary" type="button">Read the docs</button></div>
<div class="cards"><div></div><div></div><div></div></div></main>
</body></html>`

/**
 * The site at an address of this page's origin: its frame's document is
 * the story's to read, as a dev server's proxied by the app would be.
 */
const siteUrl = URL.createObjectURL(new Blob([site], { type: "text/html" }))

const webPage = (content: Partial<BrowserWebContent> = {}): BrowserPage => ({
  id: "browser",
  title: "Browser",
  location: "http://localhost:5173/pricing",
  content: { type: "web", url: siteUrl, running: true, ...content },
})

const changes: BrowserPage = {
  id: "changes",
  title: "Changes",
  count: 3,
  content: {
    type: "diff",
    diff: [
      "--- a/vite.config.ts",
      "+++ b/vite.config.ts",
      "@@ -8 +8 @@",
      "-    cssCodeSplit: false,",
      "+    cssCodeSplit: true,",
    ].join("\n"),
  },
}

const files: BrowserPage = {
  id: "files",
  title: "Files",
  location: "~/agentui",
  content: {
    type: "files",
    files: [{ name: "vite.config.ts", path: "vite.config.ts" }],
  },
}

const terminal: BrowserPage = {
  id: "terminal",
  title: "Terminal",
  content: { type: "terminal", output: "$ pnpm dev\n" },
}

const consoleMessages: BrowserWebContent["console"] = [
  {
    id: "1",
    level: "error",
    text: "TypeError: Cannot read properties of undefined (reading 'price')",
    source: "pricing.tsx:41",
    count: 3,
  },
  {
    id: "2",
    level: "error",
    text: "404 GET /api/plans?region=eu",
    source: "fetch",
  },
  {
    id: "3",
    level: "info",
    text: "[vite] hot updated: /src/pages/pricing.tsx",
    source: "client:223",
  },
  { id: "4", level: "log", text: "[vite] connected.", source: "client:912" },
]

const requests: BrowserWebContent["network"] = [
  {
    id: "1",
    method: "GET",
    url: "/pricing",
    status: 200,
    time: 41,
    size: 2210,
  },
  {
    id: "2",
    method: "GET",
    url: "/src/pages/pricing.tsx",
    status: 304,
    time: 6,
    size: 0,
  },
  {
    id: "3",
    method: "GET",
    url: "/api/plans?region=eu",
    status: 404,
    time: 88,
    size: 112,
  },
  { id: "4", method: "POST", url: "/api/events", status: 0, time: 2004 },
  { id: "5", method: "GET", url: "/api/session" },
]

const picked = fn()
const tookOver = fn()
const asked = fn()

/** The panel's browser, as wide as the panel, its web page shown. */
function Demo({
  page,
  ...props
}: Omit<
  React.ComponentProps<typeof Browser>,
  "browser" | "onPickElement" | "onTakeOver" | "onAskAgent"
> & { page: BrowserPage }) {
  const browser = useBrowser({
    defaultValue: {
      tabs: [changes, files, page, terminal].map((each) => ({
        id: each.id,
        pages: [each],
        index: 0,
        // The app's fixed areas: no close buttons.
        pinned: true,
      })),
      active: page.id,
    },
  })
  // The page as the story changes it, e.g. its error cleared.
  const { update } = browser
  const first = React.useRef(page)
  React.useEffect(() => {
    if (page !== first.current) update(page)
  }, [update, page])
  return (
    <div
      data-testid="frame"
      className="h-190 w-140.5 max-w-full overflow-hidden rounded-xl border"
    >
      <Browser
        browser={browser}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Expand"
              className="text-muted-foreground"
            >
              <HugeiconsIcon icon={ArrowExpand01Icon} strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              className="text-muted-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </>
        }
        onPickElement={(page, element, request, { screenshot }) =>
          picked(page.id, element.selector, request, screenshot)
        }
        onTakeOver={(page) => tookOver(page.id)}
        onAskAgent={(page, message) => asked(page.id, message.id)}
        {...props}
      />
    </div>
  )
}

const meta = {
  title: "Components/Browser/Web page",
  component: Demo,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

/** Loaded, once its frame has. */
async function loaded(canvasElement: HTMLElement) {
  // A frame's page loads late while the machine is busy.
  const frame = await waitFor(
    () => {
      const frame = canvasElement.querySelector<HTMLIFrameElement>(
        "iframe[title=Browser]"
      )
      expect(frame?.contentDocument?.querySelector(".cta-primary")).toBeTruthy()
      return frame!
    },
    { timeout: 5000 }
  )
  await waitFor(() =>
    expect(
      canvasElement.querySelector(
        "[data-slot=browser-web-page] [data-slot=spinner]"
      )
    ).toBeNull()
  )
  return frame
}

/**
 * Browsing: the address, a dot while the server runs, and four tools,
 * pointing at an element, the viewport, the console and more.
 */
export const Browsing: Story = {
  args: { page: webPage({ console: consoleMessages }) },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement)
    await expect(canvas.getByRole("textbox", { name: "Address" })).toHaveValue(
      "http://localhost:5173/pricing"
    )
    await expect(canvas.getByRole("img", { name: "Running" })).toBeVisible()
    await expect(
      canvas.getByRole("tab", { name: "Changes 3" })
    ).toBeInTheDocument()
    for (const name of [
      "Point at an element",
      "Viewport",
      "Console, 2 errors",
      "More",
    ])
      await expect(canvas.getByRole("button", { name })).toBeVisible()
    // The page's frame sits right under the toolbar, as wide as the panel.
    const toolbar = canvasElement
      .querySelector("[data-slot=browser-toolbar]")!
      .getBoundingClientRect()
    const stage = canvasElement
      .querySelector("[data-slot=browser-stage]")!
      .getBoundingClientRect()
    await expect(Math.round(stage.top)).toBe(Math.round(toolbar.bottom))
    await expect(Math.round(stage.width)).toBe(Math.round(toolbar.width))

    await userEvent.click(canvas.getByRole("button", { name: "More" }))
    const body = within(document.body)
    const link = await body.findByRole("menuitem", {
      name: "Open in a new window",
    })
    await expect(link).toHaveAttribute("target", "_blank")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    // At rest, as it is drawn.
    ;(document.activeElement as HTMLElement | null)?.blur()
  },
}

/**
 * The agent drives the page: a bar says so and what it does, a line
 * goes round the page, its pointer and the element it acts on show, and
 * the reader's input waits until they take over.
 */
export const AgentUsing: Story = {
  args: {
    page: webPage({
      agent: {
        action: "Clicking “Get started”",
        cursor: { x: 108, y: 266, label: "Click" },
        target: { x: 32, y: 224, width: 94, height: 32 },
      },
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement)
    const status = canvas.getByRole("status")
    await expect(status).toHaveTextContent("Agent is using the browser")
    await expect(status).toHaveTextContent("Clicking “Get started”")
    await expect(canvas.getByText("Click")).toBeVisible()
    // Over the frame: its input waits.
    const layer = canvasElement.querySelector(
      "[data-slot=browser-agent-layer]"
    )!
    const frame = canvasElement.querySelector("iframe")!.getBoundingClientRect()
    const box = layer.getBoundingClientRect()
    await expect(box.width).toBe(frame.width)
    await expect(box.height).toBe(frame.height)
    const takeOver = canvas.getByRole("button", { name: "Take over" })
    const background = getComputedStyle(takeOver).backgroundColor
    const alpha = Number(
      background.match(/\/\s*([\d.]+)\s*\)/)?.[1] ??
        background.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1]
    )
    await expect(alpha).toBeCloseTo(0.15, 2)
    await expect(getComputedStyle(takeOver).fontWeight).toBe("400")
    tookOver.mockClear()
    await userEvent.click(canvas.getByRole("button", { name: "Take over" }))
    await expect(tookOver).toHaveBeenCalledWith("browser")
  },
}

/** Where on the screen an element of the frame's page is. */
function centerOf(frame: HTMLIFrameElement, selector: string) {
  const element = frame.contentDocument!.querySelector(selector)!
  const box = element.getBoundingClientRect()
  const at = frame.getBoundingClientRect()
  return {
    clientX: at.left + box.left + box.width / 2,
    clientY: at.top + box.top + box.height / 2,
  }
}

/**
 * Pointing at an element: the one under the pointer is outlined and
 * named, with its size; a click picks it, and what the reader writes
 * about it goes to the app with its selector.
 */
export const PointAtElement: Story = {
  args: { page: webPage() },
  play: async ({ canvas, canvasElement }) => {
    const frame = await loaded(canvasElement)
    const tool = canvas.getByRole("button", { name: "Point at an element" })
    await expect(tool).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(tool)
    await expect(tool).toHaveAttribute("aria-pressed", "true")
    const layer = await waitFor(() =>
      canvasElement.querySelector<HTMLElement>("[data-slot=browser-pick-layer]")
    )
    await expect(layer).not.toBeNull()
    const at = centerOf(frame, ".cta-primary")
    fireEvent.pointerMove(layer!, at)
    const chip = await waitFor(() => {
      const chip = canvasElement.querySelector("[data-slot=browser-chip]")
      expect(chip).toHaveTextContent(".cta-primary")
      return chip!
    })
    await expect(chip).toHaveTextContent("a")
    await expect(chip).toHaveTextContent(/\d+ × 32/)

    // The outline dashed in the app's ink, seen on a page of either theme.
    const outline = canvasElement.querySelector<HTMLElement>(
      "[data-slot=browser-outline][data-variant=pick]"
    )!
    await expect(getComputedStyle(outline).borderTopStyle).toBe("dashed")
    const ink = document.createElement("span")
    ink.style.color = "color-mix(in oklab, var(--foreground) 70%, transparent)"
    outline.append(ink)
    await expect(getComputedStyle(outline).borderTopColor).toBe(
      getComputedStyle(ink).color
    )
    ink.remove()

    fireEvent.click(layer!, at)
    const card = await canvas.findByRole("form", { name: "button.cta-primary" })
    // 300px, 16px under the chip; the request on the card, 13px, no box.
    await expect(card.getBoundingClientRect().width).toBe(304)
    await expect(
      Math.abs(
        card.getBoundingClientRect().top -
          canvasElement
            .querySelector("[data-slot=browser-chip]")!
            .getBoundingClientRect().bottom -
          16
      )
    ).toBeLessThanOrEqual(1)
    const request = within(card).getByRole("textbox", { name: "Request" })
    await expect(getComputedStyle(request).fontSize).toBe("13px")
    await expect(getComputedStyle(request).borderTopWidth).toBe("0px")
    await waitFor(() => expect(request).toHaveFocus())
    picked.mockClear()
    await userEvent.type(request, "Make this as tall as Read the docs")
    // With a screenshot, a toggle; Enter is said in Add to chat.
    const screenshot = within(card).getByRole("button", {
      name: "With a screenshot",
    })
    await expect(screenshot).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(screenshot)
    await expect(screenshot).toHaveAttribute("aria-pressed", "true")
    await expect(
      within(card).getByRole("button", { name: "Add to chat" })
    ).toHaveTextContent("Add to chat↵")
    await userEvent.click(request)
    await userEvent.keyboard("{Enter}")
    await expect(picked).toHaveBeenCalledWith(
      "browser",
      "button.cta-primary",
      "Make this as tall as Read the docs",
      true
    )
    // Done: no longer pointing.
    await expect(tool).toHaveAttribute("aria-pressed", "false")
    await expect(
      canvasElement.querySelector("[data-slot=browser-pick-layer]")
    ).toBeNull()

    // Escape leaves it.
    await userEvent.click(tool)
    await userEvent.keyboard("{Escape}")
    await expect(tool).toHaveAttribute("aria-pressed", "false")
  },
}

/**
 * The console in a drawer under the page: its errors marked, filtered
 * by their words; an error goes to the agent.
 */
export const Console: Story = {
  args: { page: webPage({ console: consoleMessages }) },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement)
    const button = canvas.getByRole("button", { name: "Console, 2 errors" })
    await userEvent.click(button)
    await expect(button).toHaveAttribute("aria-pressed", "true")
    await expect(
      canvas.getByRole("region", { name: "Console" }).getBoundingClientRect()
        .height
    ).toBe(256)
    const drawer = within(canvas.getByRole("region", { name: "Console" }))
    const list = drawer.getByRole("list", { name: "Console" })
    await expect(within(list).getAllByRole("listitem")).toHaveLength(4)
    // A line each, 28px with its rule: a long one cut, whole in its
    // tooltip; its kind heavier, and how many times in a pill.
    const [first] = within(list).getAllByRole("listitem")
    await expect(first!.getBoundingClientRect().height).toBe(28)
    const text = first!.querySelector<HTMLElement>(
      "[data-slot=browser-console-text]"
    )!
    await expect(text).toHaveAttribute("title", consoleMessages![0]!.text)
    await expect(
      getComputedStyle(within(text).getByText("TypeError:")).fontWeight
    ).toBe("600")
    await expect(
      first!.querySelector("[data-slot=browser-console-count]")
    ).toHaveTextContent("3")

    asked.mockClear()
    const ask = drawer.getAllByRole("button", { name: "Ask agent" })
    await expect(ask).toHaveLength(2)
    await userEvent.click(ask[0]!)
    await expect(asked).toHaveBeenCalledWith("browser", "1")

    // The drawer's filter: 128×24, its words 12px at any width.
    const filter = drawer.getByRole("textbox", { name: "Filter" })
    const field = filter.closest("[data-slot=viewer-filter]")!
    await expect(field.getBoundingClientRect().width).toBe(128)
    await expect(field.getBoundingClientRect().height).toBe(24)
    await expect(getComputedStyle(filter).fontSize).toBe("12px")
    await userEvent.type(filter, "vite")
    await expect(within(list).getAllByRole("listitem")).toHaveLength(2)

    await userEvent.click(drawer.getByRole("button", { name: "Close console" }))
    await expect(canvas.queryByRole("region", { name: "Console" })).toBeNull()
    await expect(button).toHaveAttribute("aria-pressed", "false")
  },
}

/**
 * With the page's requests, a Network tab beside the console's: method,
 * address, status, time and size, the failed ones darker; the filter
 * works in either.
 */
export const Network: Story = {
  args: { page: webPage({ console: consoleMessages, network: requests }) },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Console, 2 errors" })
    )
    await expect(
      canvas.getByRole("region", { name: "Console" }).getBoundingClientRect()
        .height
    ).toBe(256)
    const drawer = within(canvas.getByRole("region", { name: "Console" }))
    const tabs = drawer.getByRole("tablist")
    // Each with its count: of errors, of requests.
    await expect(
      within(tabs)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual(["Console2", "Network5"])
    await expect(
      drawer.getByRole("list", { name: "Console" })
    ).toBeInTheDocument()

    await userEvent.click(within(tabs).getByRole("tab", { name: /Network/ }))
    const table = drawer.getByRole("table", { name: "Network" })
    const rows = () => within(table).getAllByRole("row").slice(1)
    await expect(rows()).toHaveLength(5)
    await expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent)
    ).toEqual(["Method", "URL", "Status", "Time", "Size"])
    const [ok, , missing, failed, pending] = rows()
    await expect(ok).toHaveTextContent(/GET.*\/pricing.*200.*41 ms.*2\.2 KB/)
    await expect(missing).toHaveAttribute("data-failed")
    await expect(failed).toHaveTextContent(/Failed.*2\.00 s/)
    await expect(failed).toHaveAttribute("data-failed")
    await expect(pending).toHaveTextContent("Pending")
    await expect(ok).not.toHaveAttribute("data-failed")

    await userEvent.type(drawer.getByRole("textbox", { name: "Filter" }), "api")
    await expect(rows()).toHaveLength(3)
    // Kept as the reader left it, by tab.
    await userEvent.click(drawer.getByRole("button", { name: "Close console" }))
    await userEvent.click(
      canvas.getByRole("button", { name: "Console, 2 errors" })
    )
    await expect(
      within(canvas.getByRole("region", { name: "Console" })).getByRole("tab", {
        name: /Network/,
      })
    ).toHaveAttribute("aria-selected", "true")
  },
}

/** Only requests, no console: the drawer is theirs. */
export const NetworkOnly: Story = {
  args: { page: webPage({ network: requests }) },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Console" }))
    const drawer = within(canvas.getByRole("region", { name: "Network" }))
    await expect(drawer.queryByRole("tablist")).toBeNull()
    await expect(
      within(drawer.getByRole("table", { name: "Network" })).getAllByRole("row")
    ).toHaveLength(6)
  },
}

/**
 * With `onRefreshNetwork`, the Network tab has a Refresh: the app reads
 * the requests again and gives them in the page's `network`. Not on the
 * console's tab.
 */
export const RefreshNetwork: Story = {
  args: {
    page: webPage({ console: consoleMessages, network: requests }),
    onRefreshNetwork: fn(),
  },
  play: async ({ args, canvas, canvasElement }) => {
    await loaded(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Console, 2 errors" })
    )
    await expect(
      canvas.getByRole("region", { name: "Console" }).getBoundingClientRect()
        .height
    ).toBe(256)
    const drawer = within(canvas.getByRole("region", { name: "Console" }))
    await expect(
      drawer.queryByRole("button", { name: "Refresh requests" })
    ).toBeNull()
    await userEvent.click(drawer.getByRole("tab", { name: /Network/ }))
    await userEvent.click(
      await drawer.findByRole("button", { name: "Refresh requests" })
    )
    await expect(args.onRefreshNetwork).toHaveBeenCalledWith(
      expect.objectContaining({ id: "browser" })
    )
    // The console's panel gone, not still going, when the page is checked.
    await waitFor(() => expect(drawer.getAllByRole("tabpanel")).toHaveLength(1))
  },
}

/** A device's viewport: on a dotted canvas, scaled to fit, its size under it. */
export const Device: Story = {
  args: { page: webPage() },
  play: async ({ canvas, canvasElement }) => {
    await loaded(canvasElement)
    await expect(canvas.getByRole("button", { name: "Console" })).toBeDisabled()
    const body = within(document.body)
    // Its menu, once it has the focus, a frame after it opens: an item
    // clicked before then is not taken.
    const viewportMenu = async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Viewport" }))
      const menu = await body.findByRole("menu")
      await waitFor(() =>
        expect(menu.contains(document.activeElement)).toBe(true)
      )
      await waitFor(() => {
        expect(menu.getBoundingClientRect().width).toBe(240)
        expect(menu.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          canvasElement
            .querySelector("[data-slot=browser-toolbar]")!
            .getBoundingClientRect().bottom + 4
        )
      })
      return within(menu)
    }
    const initialMenu = await viewportMenu()
    await expect(
      initialMenu.getByRole("menuitemradio", { name: /Fill the panel/ })
    ).toHaveTextContent("560")
    await expect(initialMenu.getByText("R", { selector: "kbd" })).toBeVisible()
    const dark = initialMenu.getByRole("switch", { name: "Dark color scheme" })
    await expect(dark).not.toBeChecked()
    await userEvent.click(dark)
    await expect(dark).toBeChecked()
    await expect(canvasElement.querySelector("iframe")!.style.colorScheme).toBe(
      "dark"
    )
    await expect(body.getByRole("menu")).toBeVisible()
    await userEvent.click(dark)
    await expect(canvasElement.querySelector("iframe")!.style.colorScheme).toBe(
      ""
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await userEvent.click(
      (await viewportMenu()).getByRole("menuitemradio", { name: /Phone/ })
    )
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    const stage = canvasElement.querySelector("[data-slot=browser-stage]")!
    await expect(stage).toHaveAttribute("data-device", "phone")
    const size = canvasElement.querySelector("[data-slot=browser-device-size]")!
    await waitFor(() => expect(size.textContent).toMatch(/^390 × 844 · \d+%$/))
    const deviceElement = canvasElement.querySelector(
      "[data-slot=browser-device]"
    )!
    // The theme's nearest radius step to 28px is 26px.
    await expect(getComputedStyle(deviceElement).borderRadius).toBe("26px")
    await expect(size.getBoundingClientRect().height).toBe(24)
    await expect(size.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      stage.getBoundingClientRect().bottom
    )
    await expect(size.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      stage.getBoundingClientRect().top
    )
    // Scaled to fit the panel.
    const device = canvasElement
      .querySelector("[data-slot=browser-device]")!
      .getBoundingClientRect()
    await expect(device.height).toBeLessThanOrEqual(
      stage.getBoundingClientRect().height
    )

    await userEvent.click(
      (await viewportMenu()).getByRole("menuitem", { name: /^Rotate/ })
    )
    await waitFor(() => expect(size.textContent).toMatch(/^844 × 390/))
    // Once its menu has gone, and back.
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await userEvent.click(
      (await viewportMenu()).getByRole("menuitem", { name: /^Rotate/ })
    )
    await waitFor(() => expect(size.textContent).toMatch(/^390 × 844/))
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    // The R key does it in the open menu.
    await viewportMenu()
    await userEvent.keyboard("r")
    await waitFor(() => expect(size.textContent).toMatch(/^844 × 390/))
  },
}

/**
 * Nothing runs at the address: which one, the app's button to start it,
 * another address, and recent ones.
 */
export const NotRunning: Story = {
  args: {
    page: webPage({ running: false, url: "http://localhost:5173/" }),
    notRunningActions: () => (
      <Button>
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
        Run pnpm dev
      </Button>
    ),
    recent: [
      { address: "localhost:6006", meta: "Storybook" },
      { address: "example.com", meta: "1d" },
    ],
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Nothing is running on localhost:5173")
    ).toBeVisible()
    await expect(canvas.getByRole("img", { name: "Not running" })).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Run pnpm dev" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Point at an element" })
    ).toBeDisabled()
    await userEvent.click(
      canvas.getByRole("button", { name: "Open another address" })
    )
    await expect(canvas.getByRole("textbox", { name: "Address" })).toHaveFocus()
    // A recent address opens in the tab.
    await userEvent.click(
      within(canvas.getByRole("region", { name: "Recent" })).getByRole(
        "button",
        { name: /example\.com/ }
      )
    )
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Address" })).toHaveValue(
        "https://example.com/"
      )
    )
    // And back.
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await waitFor(() =>
      expect(
        canvas.getByText("Nothing is running on localhost:5173")
      ).toBeVisible()
    )
    // A local one, a host and its port, is http.
    await userEvent.click(
      within(canvas.getByRole("region", { name: "Recent" })).getByRole(
        "button",
        { name: /localhost:6006/ }
      )
    )
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Address" })).toHaveValue(
        "http://localhost:6006/"
      )
    )
  },
}

const resolved = fn()

/**
 * The app's `resolveAddress` takes every address: typed, or a recent one
 * picked. Here a word is a search of the app's; the rest falls back to
 * `resolveWebAddress`.
 */
export const ResolveAddress: Story = {
  args: {
    page: webPage({ running: false, url: "http://localhost:5173/" }),
    recent: [{ address: "pricing page", meta: "A search" }],
    labels: { addressPlaceholder: "Search or enter address" },
    resolveAddress: (address) => {
      resolved(address)
      return /\s/.test(address.trim())
        ? {
            id: `search:${address}`,
            title: address,
            location: `https://search.example/?q=${encodeURIComponent(address)}`,
            content: {
              type: "web",
              url: `https://search.example/?q=${encodeURIComponent(address)}`,
              running: false,
            },
          }
        : resolveWebAddress(address)
    },
  },
  beforeEach: () => {
    resolved.mockClear()
  },
  play: async ({ canvas }) => {
    const address = () => canvas.getByRole("textbox", { name: "Address" })
    await expect(address()).toHaveAttribute(
      "placeholder",
      "Search or enter address"
    )
    // Picked from the recent ones.
    await userEvent.click(
      within(canvas.getByRole("region", { name: "Recent" })).getByRole(
        "button",
        { name: /pricing page/ }
      )
    )
    await expect(resolved).toHaveBeenLastCalledWith("pricing page")
    await waitFor(() =>
      expect(address()).toHaveValue("https://search.example/?q=pricing%20page")
    )
    // Typed.
    await userEvent.click(address())
    await userEvent.keyboard("127.0.0.1:3000{Enter}")
    await expect(resolved).toHaveBeenLastCalledWith("127.0.0.1:3000")
    await waitFor(() => expect(address()).toHaveValue("http://127.0.0.1:3000/"))
  },
}

const reloaded = fn()

/**
 * A page that did not load (the app's `error`): which address, why, and
 * Retry, which loads it again and tells the app (`onReload`), here to
 * clear the error.
 */
export const LoadFailed: Story = {
  args: { page: webPage() },
  beforeEach: () => {
    reloaded.mockClear()
  },
  render: function Render(args) {
    const [error, setError] = React.useState<string | undefined>(
      "The server answered 502 Bad Gateway."
    )
    const page = React.useMemo(() => webPage(error ? { error } : {}), [error])
    return (
      <Demo
        {...args}
        page={page}
        onReload={(page) => {
          reloaded(page.id)
          setError(undefined)
        }}
      />
    )
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByText("Could not load localhost:5173")
    ).toBeVisible()
    await expect(
      canvas.getByText("The server answered 502 Bad Gateway.")
    ).toBeVisible()
    await expect(canvasElement.querySelector("iframe")).toBeNull()
    // Nothing on it to point at.
    await expect(
      canvas.getByRole("button", { name: "Point at an element" })
    ).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }))
    await expect(reloaded).toHaveBeenCalledWith("browser")
    await loaded(canvasElement)
    await expect(canvas.queryByText("Could not load localhost:5173")).toBeNull()
  },
}
