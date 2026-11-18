import type { Meta, StoryObj } from "@storybook/react-vite"
import type * as React from "react"
import { expect } from "storybook/test"

import { windowOf } from "@/stories/phone"

/*
 * The colour roles in both themes, and the contrast WCAG 2.2 AA asks of
 * them: 4.5:1 for text (1.4.3), 3:1 for field edges, focus and chart
 * series (1.4.11).
 * Colours are resolved by painting them on a canvas, so alpha and oklch()
 * are composited by the browser exactly as on screen.
 */

const meta = { title: "Theme/Colours" } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

type Layer = { role: string; alpha?: number }
type Check = { fg: Layer; on: Layer[]; min: number }

const text = (fg: string, ...on: (string | Layer)[]): Check => ({
  fg: { role: fg },
  on: on.map((l) => (typeof l === "string" ? { role: l } : l)),
  min: 4.5,
})

/** Status text sits on the page, on cards, and on its own tint. */
const status = (role: string, tint: number): Check[] => [
  text(role, "background"),
  text(role, "card"),
  text(role, "muted"),
  text(role, "background", { role, alpha: tint }),
]

function checks(dark: boolean): Check[] {
  const tint = dark ? 0.2 : 0.1
  return [
    text("foreground", "background"),
    text("card-foreground", "card"),
    text("popover-foreground", "popover"),
    text("primary-foreground", "primary"),
    text("secondary-foreground", "secondary"),
    text("accent-foreground", "accent"),
    text("muted-foreground", "background"),
    text("muted-foreground", "card"),
    text("muted-foreground", "muted"),
    // The third grey: on the page, cards and the sidebar, not on muted.
    text("subtle-foreground", "background"),
    text("subtle-foreground", "card"),
    text("subtle-foreground", "sidebar"),
    text("sidebar-foreground", "sidebar"),
    text("sidebar-primary-foreground", "sidebar-primary"),
    text("sidebar-accent-foreground", "sidebar-accent"),
    ...["destructive", "success", "warning", "info"].flatMap((r) =>
      status(r, tint)
    ),
    // Code's tokens, where code is: the page, cards, the muted surface,
    // the sidebar (a request's command), and a diff's or a highlighted
    // line's tint on them.
    ...[
      "comment",
      "string",
      "keyword",
      "number",
      "function",
      "type",
      "tag",
      "property",
    ].flatMap((kind) =>
      ["background", "card", "muted", "sidebar"].flatMap((on) => [
        text(`code-${kind}`, on),
        text(`code-${kind}`, on, { role: "foreground", alpha: 0.06 }),
      ])
    ),
    ...["input", "ring", ...[1, 2, 3, 4, 5].map((n) => `chart-${n}`)].flatMap(
      (role) =>
        ["background", "card", "popover"].map((on) => ({
          fg: { role },
          on: [{ role: on }],
          min: 3,
        }))
    ),
  ]
}

const canvas = document.createElement("canvas")
canvas.width = canvas.height = 1
const ctx = canvas.getContext("2d", { willReadFrequently: true })!

/** A colour role as the browser computes it, its `color-mix()` mixed. */
function resolve(scope: Element, role: string): string {
  const probe = document.createElement("span")
  probe.style.color = `var(--${role})`
  scope.append(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
}

/** The sRGB pixel a stack of colour roles paints, bottom first. */
function paint(scope: Element, layers: Layer[]): [number, number, number] {
  ctx.globalAlpha = 1
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, 1, 1)
  for (const { role, alpha = 1 } of layers) {
    ctx.globalAlpha = alpha
    ctx.fillStyle = resolve(scope, role)
    ctx.fillRect(0, 0, 1, 1)
  }
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!]
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function ratio(scope: Element, { fg, on }: Check): number {
  const a = luminance(paint(scope, [...on, fg]))
  const b = luminance(paint(scope, on))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const label = ({ fg, on }: Check) =>
  `${fg.role} on ${on.map((l) => (l.alpha ? `${l.role}/${l.alpha * 100}` : l.role)).join(" + ")}`

/** A stack of colour roles as one CSS background, bottom last. */
function background(on: Layer[]): string {
  const [base, ...over] = on
  const layers = over.reverse().map(({ role, alpha = 1 }) => {
    const colour = `color-mix(in srgb, var(--${role}) ${alpha * 100}%, transparent)`
    return `linear-gradient(${colour}, ${colour})`
  })
  return [...layers, `var(--${base!.role})`].join(", ")
}

/**
 * Text checks show text; 3:1 checks show an edge, as fields use it. Each
 * is painted on its whole stack and says the contrast it measures.
 */
function Sample({ check }: { check: Check }) {
  const { fg, on, min } = check
  const value = ratio(document.documentElement, check).toFixed(1)
  return min < 4.5 ? (
    <span
      className="flex items-center gap-2 rounded-sm px-2"
      style={{
        background: background(on),
        color: `var(--${on[0]!.role}-foreground, var(--foreground))`,
      }}
    >
      <span
        aria-hidden
        className="size-4 rounded-sm border-2"
        style={{ borderColor: `var(--${fg.role})` }}
      />
      <span className="text-xs">{value}:1</span>
    </span>
  ) : (
    <span
      data-slot="theme-sample"
      className="rounded-sm px-2"
      style={{ color: `var(--${fg.role})`, background: background(on) }}
    >
      Aa {value}:1
    </span>
  )
}

function Matrix() {
  const dark = document.documentElement.classList.contains("dark")
  return (
    <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
      {checks(dark).map((check) => (
        <div key={label(check)} className="contents">
          <span>{label(check)}</span>
          <Sample check={check} />
        </div>
      ))}
    </div>
  )
}

/**
 * Every role pair the components use meets its WCAG minimum. The table
 * shows the current theme; the test measures both.
 */
export const Contrast: Story = {
  parameters: { layout: "padded" },
  render: () => <Matrix />,
  play: async ({ canvasElement }) => {
    await expect(failures(canvasElement)).toEqual([])
  },
}

/** The pairs under their minimum, in both themes. */
function failures(scope: Element): string[] {
  const html = document.documentElement
  const wasDark = html.classList.contains("dark")
  const found: string[] = []
  try {
    for (const dark of [false, true]) {
      html.classList.toggle("dark", dark)
      for (const check of checks(dark)) {
        const value = ratio(scope, check)
        if (value < check.min) {
          found.push(
            `${dark ? "dark" : "light"}: ${label(check)} ${value.toFixed(2)}:1`
          )
        }
      }
    }
  } finally {
    html.classList.toggle("dark", wasDark)
  }
  return found
}

/**
 * An app's palette, in a CSS file of its own: the base roles on the
 * root, for light and dark: docs/theme.md's "Palettes" has it.
 */
const warmPaper = `
:root[data-palette="warm"] {
  --background: oklch(0.985 0.008 85);
  --foreground: oklch(0.21 0.015 60);
  --primary: oklch(0.27 0.025 50);
  --accent: oklch(0.95 0.015 80);
  --sidebar: oklch(0.97 0.012 82);
  --border: oklch(0.9 0.02 80);
  --ring: oklch(0.55 0.03 70);
}
:root[data-palette="warm"].dark {
  --background: oklch(0.2 0.012 70);
  --foreground: oklch(0.93 0.015 85);
  --primary: oklch(0.9 0.02 85);
  --accent: oklch(0.28 0.015 70);
  --sidebar: oklch(0.165 0.01 70);
  --border: oklch(0.93 0.015 85 / 10%);
  --ring: oklch(0.7 0.02 75);
}`

/** Roles the theme derives from the base ones: they follow a palette. */
const derived = [
  "card",
  "popover",
  "secondary",
  "muted",
  "muted-foreground",
  "subtle-foreground",
  "input",
  "primary-foreground",
  "card-foreground",
  "sidebar-accent",
  "sidebar-primary",
  "sidebar-tree",
  "code-comment",
]

/**
 * An app's palette sets the base roles only (background, foreground,
 * primary, accent, sidebar, border, ring); the theme derives the rest
 * from them, so they follow it in light and dark, and every pair still
 * meets its minimum. The page's root is painted in its background too,
 * for a native shell's (iOS's under-page colour) to follow it.
 */
export const AppPalette: Story = {
  parameters: { layout: "padded" },
  render: () => <Matrix />,
  play: async ({ canvasElement }) => {
    const html = document.documentElement
    const wasDark = html.classList.contains("dark")
    const style = document.createElement("style")
    style.textContent = warmPaper
    document.head.append(style)
    try {
      for (const dark of [false, true]) {
        html.classList.toggle("dark", dark)
        delete html.dataset.palette
        const before = derived.map((role) => resolve(canvasElement, role))
        html.dataset.palette = "warm"
        const after = derived.map((role) => resolve(canvasElement, role))
        const unchanged = derived.filter((_, i) => before[i] === after[i])
        await expect(unchanged).toEqual([])
        await expect(getComputedStyle(html).backgroundColor).toBe(
          resolve(canvasElement, "background")
        )
      }
      await expect(failures(canvasElement)).toEqual([])
    } finally {
      delete html.dataset.palette
      style.remove()
      html.classList.toggle("dark", wasDark)
    }
  },
}

/**
 * Native controls (a video's, a scrollbar) are drawn in the theme's
 * scheme, not a white bar on a dark page.
 */
export const ColourScheme: Story = {
  render: () => <span>Scheme</span>,
  play: async () => {
    const html = document.documentElement
    const wasDark = html.classList.contains("dark")
    try {
      html.classList.toggle("dark", false)
      await expect(getComputedStyle(html).colorScheme).toBe("light")
      html.classList.toggle("dark", true)
      await expect(getComputedStyle(html).colorScheme).toBe("dark")
    } finally {
      html.classList.toggle("dark", wasDark)
    }
  },
}

/**
 * A shimmer's band is seen on any text it sweeps, in either theme: on the
 * text's own colour (a running title) as on muted and subtle text (a
 * running step), at 1.5:1 or more from the text.
 */
export const ShimmerBand: Story = {
  render: () => (
    <div className="flex flex-col gap-1 text-sm">
      {["foreground", "muted-foreground", "subtle-foreground"].map((role) => (
        <span
          key={role}
          className="shimmer"
          style={{ color: `var(--${role})` }}
        >
          Running a script ({role})
        </span>
      ))}
    </div>
  ),
  play: async () => {
    const html = document.documentElement
    const wasDark = html.classList.contains("dark")
    const lum = (colour: string) => {
      ctx.globalAlpha = 1
      ctx.fillStyle = colour
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      return luminance([r!, g!, b!])
    }
    try {
      for (const dark of [false, true]) {
        html.classList.toggle("dark", dark)
        for (const role of [
          "foreground",
          "muted-foreground",
          "subtle-foreground",
        ]) {
          const text = document.createElement("span")
          text.style.color = `var(--${role})`
          const band = document.createElement("span")
          band.style.color = "var(--shimmer-color)"
          text.append(band)
          html.append(text)
          const a = lum(getComputedStyle(text).color)
          const b = lum(getComputedStyle(band).color)
          text.remove()
          const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
          await expect(
            contrast,
            `${dark ? "dark" : "light"} ${role}`
          ).toBeGreaterThanOrEqual(1.5)
        }
      }
    } finally {
      html.classList.toggle("dark", wasDark)
    }
  },
}

/** A sample is painted on its whole stack: a status on its own tint shows. */
export const TintedSamples: Story = {
  parameters: { layout: "padded" },
  render: () => <Matrix />,
  play: async ({ canvasElement }) => {
    const tinted = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=theme-sample]"
      ),
    ].filter((sample) => getComputedStyle(sample).backgroundImage !== "none")
    // Each status on its tint; each code token on a line's tint, on the
    // four surfaces code is on.
    await expect(tinted).toHaveLength(4 + 8 * 4)
  },
}

/**
 * grid-cols-fill-<n>: as many columns as fit, each at least n spacing
 * steps wide (or the whole width, where that is less), sharing what is
 * left.
 */
export const GridFill: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div data-testid="wide" className="grid w-175 grid-cols-fill-54 gap-3">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
      <div data-testid="narrow" className="grid w-40 grid-cols-fill-54 gap-3">
        <div className="h-16 rounded-lg bg-muted" />
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const tracks = (element: HTMLElement) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").map(parseFloat)
    // 700px: 3 of at least 216px, 12px apart.
    const wide = tracks(canvas.getByTestId("wide"))
    await expect(wide).toHaveLength(3)
    for (const width of wide) await expect(width).toBeGreaterThanOrEqual(216)
    // 160px: one, the whole width.
    await expect(tracks(canvas.getByTestId("narrow"))).toEqual([160])
  },
}

/**
 * Room for what covers the window's edges: the home indicator below,
 * AgentApp's titlebar or the status bar above (pb-safe, pb-safe-or-<n>,
 * bottom-safe-offset-<n>, pt-safe-or-<n>, top-safe-offset-<n>). Here no
 * inset, and a 40px titlebar.
 */
export const SafeArea: Story = {
  render: () => (
    <div
      className="relative h-40 w-80"
      style={{ "--agent-app-titlebar": "40px" } as React.CSSProperties}
    >
      <div data-testid="pb" className="pb-safe-or-2" />
      <div data-testid="pt" className="pt-safe-or-2" />
      <div data-testid="top" className="absolute top-safe-offset-4" />
      <div data-testid="bottom" className="absolute bottom-safe-offset-4" />
    </div>
  ),
  play: async ({ canvas }) => {
    const style = (id: string) => getComputedStyle(canvas.getByTestId(id))
    await expect(style("pb").paddingBottom).toBe("8px")
    await expect(style("pt").paddingTop).toBe("40px")
    await expect(style("top").top).toBe("56px")
    await expect(style("bottom").bottom).toBe("16px")
  },
}

/**
 * Named where components had values of their own: a row's 16px icon
 * column (grid-cols-icon, -icon-end), the 1.5px line that marks (an
 * icon's stroke, a selected cell's edge: --line-mark), a transparent
 * image's checkerboard and an empty page's dot grid.
 */
export const Marks: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <div data-testid="icon" className="grid grid-cols-icon gap-x-2">
        <span className="size-4 rounded-full bg-muted-foreground" />
        <span>A line beside its icon</span>
      </div>
      <div data-testid="icon-end" className="grid grid-cols-icon-end gap-x-2">
        <span className="size-4 rounded-full bg-muted-foreground" />
        <span>And an end</span>
        <span className="text-muted-foreground">12s</span>
      </div>
      <div
        data-testid="line"
        className="h-8 rounded-md ring-(length:--line-mark) ring-foreground"
      />
      <div data-testid="checker" className="h-16 rounded-md bg-checkerboard" />
      <div data-testid="dots" className="h-16 rounded-md bg-dot-grid" />
    </div>
  ),
  play: async ({ canvas }) => {
    const style = (id: string) => getComputedStyle(canvas.getByTestId(id))
    await expect(style("icon").gridTemplateColumns).toMatch(/^16px \d/)
    await expect(style("icon-end").gridTemplateColumns).toMatch(
      /^16px [\d.]+px [\d.]+px$/
    )
    await expect(style("line").boxShadow).toContain("1.5px")
    for (const id of ["checker", "dots"])
      await expect(style(id).backgroundSize).toBe("16px 16px")
    await expect(style("checker").backgroundImage).toContain("conic-gradient")
    await expect(style("dots").backgroundImage).toContain("radial-gradient")
  },
}

/**
 * `short:`, a screen under 30rem tall (a phone on its side): what an app
 * moves or hides there, as a drawer's footer puts its buttons in a row.
 */
export const ShortScreen: Story = {
  ...windowOf("landscape", 844, 390),
  render: () => (
    <div data-testid="row" className="flex flex-col short:flex-row">
      <span>One</span>
      <span>Two</span>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      getComputedStyle(canvas.getByTestId("row")).flexDirection
    ).toBe("row")
  },
}

/**
 * Named highlights for the CSS Custom Highlight API, a range marked
 * without changing the text: `mark` as a search's matches, `mark-current`
 * as the one it is at (e.g. a quote's place in its source).
 */
export const Highlights: Story = {
  render: () => (
    <p data-testid="text" className="max-w-sm">
      The registry build fails only on the linux runner.
    </p>
  ),
  play: async ({ canvas }) => {
    const text = canvas.getByTestId("text").firstChild!
    const range = (from: number, to: number) => {
      const it = new Range()
      it.setStart(text, from)
      it.setEnd(text, to)
      return it
    }
    CSS.highlights.set("mark", new Highlight(range(4, 12)))
    CSS.highlights.set("mark-current", new Highlight(range(33, 38)))
    const rules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules)
    )
    const selectors = (list: CSSRule[]): string[] =>
      list.flatMap((rule) =>
        rule instanceof CSSStyleRule
          ? [rule.selectorText]
          : "cssRules" in rule
            ? selectors(Array.from((rule as CSSGroupingRule).cssRules))
            : []
      )
    const found = selectors(rules)
    await expect(found).toContain("::highlight(mark)")
    await expect(found).toContain("::highlight(mark-current)")
    CSS.highlights.delete("mark")
    CSS.highlights.delete("mark-current")
  },
}

/**
 * Lines and tints by name, not by pixels: shadow-mark-start, a current
 * row's mark at its start edge (--line-mark, the text's colour);
 * shadow-rule, a bar's rule below it, taking no room; --mark and
 * --mark-current, a search's tints, for a highlight of a component's own
 * name.
 */
export const LinesAndTints: Story = {
  render: () => (
    <div className="flex w-60 flex-col gap-4">
      <div data-testid="row" className="h-8 ps-3 shadow-mark-start">
        Current row
      </div>
      <div data-testid="bar" className="h-8 shadow-rule">
        Tabs
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const shadow = (id: string) =>
      getComputedStyle(canvas.getByTestId(id)).boxShadow
    await expect(shadow("row")).toMatch(/1\.5px 0px 0px 0px inset/)
    await expect(shadow("bar")).toMatch(/0px -1px 0px 0px inset/)
    await expect(canvas.getByTestId("bar").getBoundingClientRect().height).toBe(
      32
    )
    const root = getComputedStyle(document.documentElement)
    await expect(root.getPropertyValue("--mark")).toMatch(/14%/)
    await expect(root.getPropertyValue("--mark-current")).toMatch(/30%/)
  },
}
