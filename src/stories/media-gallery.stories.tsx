import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import {
  expect,
  fireEvent,
  fn,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"

import {
  MediaGallery,
  MediaGalleryAction,
  MediaGalleryProvider,
  type MediaImage,
} from "@/components/media-gallery"
import { Button, buttonVariants } from "@/components/ui/button"
import { tone } from "@/stories/samples"
import { coarseHitSize } from "@/stories/touch"
import { holdDecode } from "@/stories/decode"
import { quiet } from "@/stories/wait"

const act = fn()

const meta = {
  title: "Components/Media Gallery",
  component: MediaGallery,
  parameters: { layout: "padded" },
  beforeEach: () => {
    act.mockClear()
  },
  decorators: [
    (Story) => (
      <div className="w-188 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaGallery>

export default meta
type Story = StoryObj<typeof meta>

/** A theme colour as the page computes it, e.g. `bg-muted`'s. */
function themed(
  className: string,
  property: "backgroundColor" | "color" | "borderColor"
) {
  const probe = document.createElement("div")
  probe.className = className
  document.body.append(probe)
  const value = getComputedStyle(probe)[property]
  probe.remove()
  return value
}

/** A picture of a size, with its name on it. */
const picture = (
  alt: string,
  width: number,
  height: number,
  hue: number
): MediaImage => ({
  alt,
  width,
  height,
  src: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${hue} 55% 72%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.min(width, height) / 8}" text-anchor="middle" dominant-baseline="middle" fill="#1a1a1a">${alt}</text></svg>`
  )}`,
})

const screens = [
  picture("Sign-in page", 1600, 900, 210),
  picture("Settings page", 1600, 900, 150),
  picture("Empty inbox", 900, 1600, 40),
  picture("Error dialog", 1200, 1200, 0),
  picture("Search results", 1600, 900, 270),
  picture("Profile", 900, 1600, 90),
  picture("Billing", 1600, 900, 320),
  picture("Onboarding", 1600, 900, 180),
  picture("Dark mode", 1600, 900, 240),
]

/**
 * What the style sheets declare for an item's frame (its `::after`) while
 * the button in it is hovered.
 */
function frameHoverStyle(item: Element) {
  const declared: Record<string, string> = {}
  const visit = (rules: CSSRuleList, parent: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const selector = parent
          ? rule.selectorText.replaceAll("&", parent)
          : rule.selectorText
        if (/(?<!\\):hover/.test(selector) && selector.includes("::after")) {
          try {
            const own = selector.replace(/::after$/, "")
            // Hovered: its button matches `:hover`, as the pointer would.
            const open = item.querySelector("[data-slot=media-gallery-open]")
            if (open && item.matches(own.replace(/(?<!\\):hover/, "")))
              for (const property of Array.from(rule.style))
                declared[property] = rule.style.getPropertyValue(property)
          } catch {
            // A selector this browser does not take.
          }
        }
        visit(rule.cssRules, selector)
      } else if ("cssRules" in rule)
        visit((rule as CSSGroupingRule).cssRules, parent)
    }
  }
  for (const sheet of Array.from(document.styleSheets))
    try {
      visit(sheet.cssRules, "")
    } catch {
      // Another origin's.
    }
  return declared
}

const body = within(document.body)
const items = (canvasElement: HTMLElement) =>
  Array.from(
    canvasElement.querySelectorAll<HTMLElement>(
      "[data-slot=media-gallery-item]"
    )
  )
/** The box of an image's picture, in its card. */
const pictureBox = (item: Element) => {
  const box = item
    .querySelector("[data-slot=media-gallery-picture]")!
    .getBoundingClientRect()
  return { width: Math.round(box.width), height: Math.round(box.height) }
}

/**
 * One image at its own shape, no taller than 240px nor wider than 6 of
 * 12 columns, its place kept
 * before it loads. It opens in a viewer; Escape returns to it.
 */
export const Single: Story = {
  args: { items: [screens[0]!] },
  play: async ({ canvas }) => {
    const item = canvas.getByRole("button", { name: "Sign-in page" })
    // 1600 × 900, before the image has loaded: lower than 240px, across
    // 6 of the column's 12 (368px) less the card's padding and edge.
    const box = item.getBoundingClientRect()
    await expect(Math.round(box.height)).toBe(192)
    await expect(Math.round(box.width)).toBe(342)

    // Clicked as in Safari, where a click does not focus a button.
    fireEvent.click(item)
    await expect(item).not.toHaveFocus()
    const dialog = await body.findByRole("dialog")
    await expect(dialog).toHaveAccessibleName("Sign-in page")
    await expect(
      within(dialog).queryByRole("button", { name: "Next image" })
    ).toBeNull()
    // Copied and opened from there too, beside its close button, as high.
    const middle = (element: Element) => {
      const { top, height } = element.getBoundingClientRect()
      return Math.round(top + height / 2)
    }
    // Measured once it has zoomed in.
    await quiet(dialog)
    const close = within(dialog).getByRole("button", { name: "Close" })
    for (const action of [
      within(dialog).getByRole("button", { name: "Copy image" }),
      within(dialog).getByRole("link", { name: "Open in new tab" }),
    ])
      await expect(middle(action)).toBe(middle(close))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(item).toHaveFocus())
  },
}

/** Narrower than the image, its card is as wide as there is room for. */
export const SingleNarrow: Story = {
  args: { items: [screens[0]!] },
  decorators: [
    (Story) => (
      <div className="w-60">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    // In 240px, 6 columns are narrower than a card's least, 160px: that
    // less the card's padding and edge, at its shape.
    const box = canvas
      .getByRole("button", { name: "Sign-in page" })
      .getBoundingClientRect()
    await expect(Math.round(box.width)).toBe(134)
    await expect(Math.round(box.height)).toBe(75)
  },
}

// A ThumbHash's image, as an app draws one: a few pixels, blurred large.
const blurred = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="hsl(210 40% 70%)"/><rect width="8" height="4" fill="hsl(210 40% 55%)"/></svg>'
)}`
const small = picture("Sign-in page", 400, 225, 210).src!
let decoding: ReturnType<typeof holdDecode> | undefined

/**
 * Till it is drawn, its thumbnail over its placeholder stand in for it,
 * at its shape; then they are gone. Of copies (`srcSet`), the browser
 * loads the one for the width it is shown at.
 */
export const StandIn: Story = {
  args: {
    items: [
      {
        ...screens[0]!,
        thumbnail: small,
        placeholder: blurred,
        srcSet: `${small} 400w, ${screens[0]!.src} 1600w`,
      },
    ],
  },
  beforeEach: () => {
    decoding = holdDecode()
    return () => decoding?.restore()
  },
  play: async ({ canvasElement }) => {
    const [item] = items(canvasElement)
    const box = item!.querySelector<HTMLElement>(
      "[data-slot=media-gallery-picture]"
    )!
    const image = item!.querySelector("img")!
    await expect(image).toHaveAttribute("sizes", "427px")
    await expect(image.srcset).toContain("1600w")
    const layers = getComputedStyle(box).backgroundImage
    await expect(layers.indexOf(small)).toBeGreaterThan(-1)
    await expect(layers.indexOf(small)).toBeLessThan(layers.indexOf(blurred))
    await expect(pictureBox(item!)).toEqual({ width: 342, height: 192 })
    decoding!.release()
    await waitFor(() =>
      expect(getComputedStyle(box).backgroundImage).toBe("none")
    )
  },
}

/**
 * Its height its own, read from its width and shape, not a percentage of
 * its box's: WebKit lays every flex box around an image of a percentage
 * height out again at each layout, and in a long conversation each frame
 * of scrolling took 100ms and more. Its box made square, it stays at its
 * shape.
 */
export const ImageOwnHeight: Story = {
  args: { items: [screens[0]!] },
  play: async ({ canvasElement }) => {
    const [item] = items(canvasElement)
    const box = item!.querySelector<HTMLElement>(
      "[data-slot=media-gallery-picture]"
    )!
    box.style.aspectRatio = "1"
    const image = item!.querySelector("img")!
    await expect(Math.round(box.getBoundingClientRect().height)).toBe(342)
    await expect(Math.round(image.getBoundingClientRect().height)).toBe(192)
  },
}

/**
 * Without its size, it is square until it loads, then at its own shape:
 * read from the image.
 */
export const NaturalSize: Story = {
  args: {
    items: [{ ...screens[0]!, width: undefined, height: undefined }],
  },
  play: async ({ canvasElement }) => {
    const [item] = items(canvasElement)
    // 1600 × 900 across 6 columns, as with its size given.
    await waitFor(() =>
      expect(pictureBox(item!)).toEqual({ width: 342, height: 192 })
    )
  },
}

/**
 * More images are square thumbnails, the last saying how many more there
 * are. The viewer goes through them all with the arrow keys or its
 * buttons, round from the last to the first, and closing it returns to
 * the thumbnail it was opened from.
 */
export const Many: Story = {
  args: { items: screens },
  play: async ({ canvas, canvasElement }) => {
    const buttons = canvas.getAllByRole("button")
    await expect(buttons).toHaveLength(6)
    await expect(buttons[5]).toHaveAccessibleName("Profile, 3 more")
    // On the grid: each 3 of the column's 12 (176px), 16px apart.
    const [first, second] = items(canvasElement).map((item) =>
      item.getBoundingClientRect()
    )
    await expect(first!.width).toBe(176)
    await expect(first!.height).toBe(176)
    await expect(second!.left - first!.right).toBe(16)
    // The number over the last one reads: what is under it is dimmed and
    // blurred.
    const more = within(buttons[5]!).getByText("+3")
    await expect(getComputedStyle(more).backgroundColor).toMatch(
      /^(rgba\(0, 0, 0, 0\.6\)|oklab\(0 0 0 \/ 0\.6\))$/
    )
    await expect(getComputedStyle(more).backdropFilter).toMatch(/^blur/)
    // Hovered, each says it opens, quietly: its frame's ring darker.
    for (const item of items(canvasElement))
      await expect(frameHoverStyle(item)).toHaveProperty("--tw-ring-color")

    await userEvent.click(buttons[2]!)
    const popup = await body.findByRole("dialog")
    const dialog = within(popup)
    // The keys work once focus is in it.
    await waitFor(() =>
      expect(popup.contains(document.activeElement)).toBe(true)
    )
    await expect(dialog.getByText("3 of 9")).toBeInTheDocument()
    // Under a finger, its buttons' places are as large as one.
    for (const name of ["Previous image", "Next image"]) {
      const size = coarseHitSize(dialog.getByRole("button", { name }))
      await expect(size.width).toBeGreaterThanOrEqual(44)
      await expect(size.height).toBeGreaterThanOrEqual(44)
    }
    await userEvent.keyboard("{ArrowRight}")
    await expect(dialog.getByText("4 of 9")).toBeInTheDocument()
    await expect(body.getByRole("dialog")).toHaveAccessibleName("Error dialog")
    await userEvent.click(dialog.getByRole("button", { name: "Next image" }))
    await expect(dialog.getByText("5 of 9")).toBeInTheDocument()
    for (let step = 0; step < 5; step++) await userEvent.keyboard("{ArrowLeft}")
    await expect(dialog.getByText("9 of 9")).toBeInTheDocument()
    await expect(body.getByRole("dialog")).toHaveAccessibleName("Dark mode")

    await userEvent.click(dialog.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(buttons[2]).toHaveFocus())
  },
}

/**
 * In the viewer, an image of a known size takes the place it is shown in
 * as it is said to be, not as it loads: nothing jumps when it does. (Here
 * its file is smaller than it says, so the two differ.)
 */
export const ViewerKnownSize: Story = {
  args: {
    items: [
      {
        ...picture("Sign-in page", 320, 180, 210),
        width: 1600,
        height: 900,
      },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign-in page" }))
    const dialog = within(await body.findByRole("dialog"))
    const image = dialog.getByRole("img", { name: "Sign-in page" })
    await expect(image).toHaveAttribute("width", "1600")
    await expect(image).toHaveAttribute("height", "900")
    // As wide as the viewer, or as 75vh tall, at its shape.
    const frame = image.parentElement!.getBoundingClientRect()
    const box = image.getBoundingClientRect()
    const expected = Math.min(1600, frame.width, (innerHeight * 0.75 * 16) / 9)
    await expect(Math.abs(box.width - expected)).toBeLessThan(1)
    await expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02)
  },
}

/** An image that cannot load says what it was, and still opens. */
export const Failed: Story = {
  args: {
    items: [
      { ...screens[0]!, src: "/missing.png", alt: "Deploy log" },
      screens[1]!,
    ],
  },
  play: async ({ canvas }) => {
    // Once it has failed to load: a request to the server, slower while
    // every story runs.
    await waitFor(
      () =>
        expect(canvas.getByRole("img", { name: "Deploy log" })).toHaveAttribute(
          "data-slot",
          "media-gallery-failed"
        ),
      { timeout: 5000 }
    )
    await userEvent.click(canvas.getByRole("button", { name: "Deploy log" }))
    const dialog = within(await body.findByRole("dialog"))
    await waitFor(
      () =>
        expect(dialog.getByRole("img", { name: "Deploy log" })).toHaveAttribute(
          "data-slot",
          "media-gallery-failed"
        ),
      { timeout: 5000 }
    )
    // Said, in a frame of a video's shape: the viewer does not shrink
    // to a strip.
    const failed = dialog.getByRole("img", { name: "Deploy log" })
    await expect(failed).toHaveTextContent("This image cannot be shown")
    const { width, height } = failed.getBoundingClientRect()
    await expect(Math.abs(width / height - 16 / 9)).toBeLessThan(0.02)
    await expect(getComputedStyle(failed).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)"
    )
  },
}

const served = (image: MediaImage, name: string): MediaImage => ({
  ...image,
  // As a server's smaller copy would be.
  thumbnail: picture(`${name} (small)`, 160, 90, 0).src,
  crossOrigin: "use-credentials",
})

/**
 * Images from the app's server: thumbnails from its smaller copies, the
 * viewer from the full ones, each fetched as the app says (here with the
 * reader's cookies).
 */
export const Served: Story = {
  args: {
    items: [served(screens[0]!, "Sign-in"), served(screens[1]!, "Settings")],
  },
  play: async ({ canvas, args }) => {
    const first = args.items[0] as MediaImage
    const thumbnail = canvas.getByRole("img", { name: "Sign-in page" })
    await expect(thumbnail).toHaveAttribute("src", first.thumbnail)
    await expect(thumbnail).toHaveAttribute("crossorigin", "use-credentials")
    await expect(thumbnail).toHaveAttribute("loading", "lazy")

    await userEvent.click(canvas.getByRole("button", { name: "Sign-in page" }))
    const dialog = within(await body.findByRole("dialog"))
    const full = dialog.getByRole("img", { name: "Sign-in page" })
    await expect(full).toHaveAttribute("src", first.src)
    await expect(full).toHaveAttribute("crossorigin", "use-credentials")
  },
}

/** One image on its own is shown from its full copy, not its thumbnail. */
export const ServedSingle: Story = {
  args: { items: [served(screens[0]!, "Sign-in")] },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByRole("img", { name: "Sign-in page" })
    ).toHaveAttribute("src", args.items[0]!.src)
  },
}

/** With `onOpen`, a click is the app's: e.g. a `MediaViewer` beside. */
export const Open: Story = {
  args: { items: screens.slice(0, 3), onOpen: act },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Empty inbox" }))
    await expect(act).toHaveBeenCalledWith(screens[2], 2)
    await expect(body.queryByRole("dialog")).toBeNull()
  },
}

const prompt = "A misty grey landscape, soft light, no people"

/** A soft grey picture, as the mockups draw one. */
const landscape = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><radialGradient id="a" cx="70%" cy="30%" r="40%"><stop offset="0" stop-color="#bdbdbd"/><stop offset="1" stop-color="#e4e4e4"/></radialGradient><radialGradient id="b" cx="25%" cy="80%" r="35%"><stop offset="0" stop-color="#c4c4c4"/><stop offset="1" stop-color="#e4e4e4" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/></svg>`
)}`

const actions = (
  <>
    <MediaGalleryAction label="Edit" onClick={() => act("edit")}>
      <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
    </MediaGalleryAction>
    <MediaGalleryAction label="Download" onClick={() => act("download")}>
      <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
    </MediaGalleryAction>
  </>
)

/**
 * Images an image model made, each in its card at its own shape
 * (`layout="flow"`): one made, its model, size and cost under it, the
 * app's actions beside them before copying and opening it; the
 * other still being made, in the shape asked for, saying so and for how
 * long.
 */
export const Generated: Story = {
  args: {
    layout: "flow",
    items: [
      {
        src: landscape,
        alt: prompt,
        width: 1536,
        height: 1024,
        title: "gpt-image-2",
        description: "3:2 · 2K",
        end: "$0.06",
        actions,
      },
      {
        status: "pending",
        elapsed: "8s",
        alt: prompt,
        width: 1024,
        height: 1536,
        description: "2 of 2",
        actions,
      },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    const [made, making] = items(canvasElement)
    // One of two: 6 of 12 columns each, 1536 × 1024 across the card,
    // before it has loaded; its title and caption under it.
    await expect(pictureBox(made!)).toEqual({ width: 342, height: 228 })
    await expect(made!.getBoundingClientRect().width).toBe(368)
    await expect(
      making!.getBoundingClientRect().left - made!.getBoundingClientRect().right
    ).toBe(16)
    await waitFor(() => expect(canvas.getByText("gpt-image-2")).toBeVisible())
    await waitFor(() =>
      expect(canvas.getByText("3:2 · 2K · $0.06")).toBeVisible()
    )

    // Its actions beside them, the app's first, each in a place as large
    // as a finger.
    const actions = within(
      made!.querySelector<HTMLElement>("[data-slot=media-gallery-actions]")!
    )
    const edit = actions.getByRole("button", { name: "Edit" })
    await waitFor(() => expect(edit).toBeVisible())
    await expect(coarseHitSize(edit).width).toBeGreaterThanOrEqual(44)
    await userEvent.click(edit)
    await expect(act).toHaveBeenCalledWith("edit")

    // Every image is copied, as PNG (this one an SVG, drawn again)...
    const write = spyOn(navigator.clipboard, "write").mockResolvedValue()
    await userEvent.click(actions.getByRole("button", { name: "Copy image" }))
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    const [copied] = write.mock.calls[0]![0]
    await expect(copied!.types).toEqual(["image/png"])
    await expect((await copied!.getType("image/png")).type).toBe("image/png")
    await waitFor(async () =>
      expect(
        await actions.findByRole("button", { name: "Copied" })
      ).toBeVisible()
    )
    write.mockRestore()
    // ...and opened in a new tab.
    const open = actions.getByRole("link", { name: "Open in new tab" })
    await expect(open).toHaveAttribute("href", landscape)
    await expect(open).toHaveAttribute("target", "_blank")

    // The one being made says so; its actions are not there yet.
    const status = canvas.getByRole("status")
    await expect(status).toHaveTextContent("Generating · 8s")
    await expect(making).toHaveAttribute("aria-busy", "true")
    await expect(
      making!.querySelector("[data-slot=media-gallery-actions]")
    ).toBeNull()
    // 1024 × 1536, taller than wide: 320px high, at its own shape (not
    // the card's width), in a card wide enough for its title.
    await expect(pictureBox(making!)).toEqual({ width: 213, height: 320 })
  },
}

/**
 * While it is made, a placeholder of the shape asked for (here only its
 * shape is known), its words shimmering; where the reader asks for less
 * motion, they are still.
 */
export const Pending: Story = {
  args: {
    items: [{ status: "pending", alt: prompt, elapsed: "12s", aspectRatio: 1 }],
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(/^Generating/)
    const [item] = items(canvasElement)
    await expect(pictureBox(item!)).toEqual({ width: 240, height: 240 })
    const words = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-gallery-pending] > span"
    )!
    await expect(getComputedStyle(words).animationName).toBe("tw-shimmer")
    // Nothing to open while it is made.
    await expect(canvas.queryByRole("button")).toBeNull()
  },
}

/**
 * Deferred: not loaded until the reader asks, its size on the button; the
 * app gives its `src` then. Its place is kept at its shape.
 */
function DeferredImage() {
  const [loaded, setLoaded] = React.useState(false)
  return (
    <MediaGallery
      items={[
        {
          ...screens[0]!,
          ...(loaded
            ? {}
            : {
                src: undefined,
                status: "deferred" as const,
                fileSize: "2.4 MB",
                onLoadRequest: () => setLoaded(true),
              }),
        },
      ]}
    />
  )
}

export const Deferred: Story = {
  args: {
    items: [
      {
        ...screens[0]!,
        src: undefined,
        status: "deferred",
        fileSize: "2.4 MB",
        onLoadRequest: act,
      },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector("img")).toBeNull()
    const [item] = items(canvasElement)
    await expect(pictureBox(item!).height).toBe(192)
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Load image 2.4 MB" })
      ).toBeVisible()
    )
  },
}

/** Asked for, the app gives its `src`: it loads in its place. */
export const DeferredLoad: Story = {
  args: { items: [] },
  render: () => <DeferredImage />,
  play: async ({ canvas }) => {
    const load = canvas.getByRole("button", { name: "Load image 2.4 MB" })
    await userEvent.click(load)
    await waitFor(async () =>
      expect(
        await canvas.findByRole("button", { name: "Sign-in page" })
      ).toBeVisible()
    )
  },
}

/** In thumbnails, a deferred one's button is its icon, its size under it. */
export const DeferredThumbnails: Story = {
  args: {
    items: [
      screens[0]!,
      {
        ...screens[1]!,
        src: undefined,
        status: "deferred",
        fileSize: "8.1 MB",
        onLoadRequest: act,
      },
      { ...screens[3]!, src: undefined, status: "pending" },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Load image, 8.1 MB" })
    )
    await expect(act).toHaveBeenCalledOnce()
    // The viewer has only the one that is there.
    await userEvent.click(canvas.getByRole("button", { name: "Sign-in page" }))
    const dialog = within(await body.findByRole("dialog"))
    await expect(
      dialog.queryByRole("button", { name: "Next image" })
    ).toBeNull()
  },
}

/** One that could not be made says so; it has no actions. */
export const CouldNotBeMade: Story = {
  args: {
    items: [
      {
        status: "error",
        alt: prompt,
        width: 1536,
        height: 1024,
        title: "gpt-image-2",
        description: "3:2 · 2K",
        actions,
      },
    ],
  },
  play: async ({ canvas }) => {
    const failed = canvas.getByRole("img", { name: prompt })
    await expect(failed).toHaveTextContent("This image cannot be shown")
    await expect(canvas.queryByRole("button", { name: "Edit" })).toBeNull()
  },
}

/** On a phone: no wider than the message. */
export const Phone: Story = {
  ...Generated,
  decorators: [
    (Story) => (
      <div className="w-89.5">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    for (const item of items(canvasElement))
      await expect(item.getBoundingClientRect().width).toBeLessThanOrEqual(358)
  },
}

const recording = tone(3)
const poster = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="hsl(210 40% 30%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="72" text-anchor="middle" dominant-baseline="middle" fill="white">Deploy, 12:04</text></svg>`
)}`
const captions = `data:text/vtt,${encodeURIComponent(
  "WEBVTT\n\n00:00.000 --> 00:03.000\nThe deploy starts.\n"
)}`

/**
 * A recording: its title, the app's words about it and its length, the
 * app's actions, and media-viewer's controls under it (play, where it
 * is, a seek bar, sound); its transcript when asked.
 */
export const Audio: Story = {
  args: {
    items: [
      {
        kind: "audio",
        src: recording,
        title: "Voice message.wav",
        description: "Voice message",
        transcript: "Can you check why the deploy got slow this week?",
        actions: (
          <Button variant="ghost" size="icon-xs" aria-label="Download">
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
          </Button>
        ),
      },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    const audio = canvasElement.querySelector("audio")!
    await expect(audio).not.toHaveAttribute("controls")
    // Its metadata loads once it is near the viewport.
    await waitFor(() => expect(audio).toHaveAttribute("preload", "metadata"))
    const bar = canvas.getByRole("group", { name: "Voice message.wav" })
    await waitFor(() =>
      expect(within(bar).getByRole("button", { name: "Play" })).toBeVisible()
    )
    await waitFor(() => expect(within(bar).getByRole("slider")).toBeVisible())
    await waitFor(
      () =>
        expect(
          canvasElement.querySelector(
            "[data-slot=media-gallery-player-description]"
          )
        ).toHaveTextContent("Voice message · 0:03"),
      { timeout: 3000 }
    )
    await expect(bar).toHaveTextContent("0:03")
    // 6 of the column's 12 columns, as an image.
    await expect(
      canvasElement
        .querySelector("[data-slot=media-gallery-player]")!
        .getBoundingClientRect().width
    ).toBe(368)
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Download" })).toBeVisible()
    )
    // Under a finger, its small buttons' places are as large as one.
    for (const name of ["Download", "Transcript"]) {
      const size = coarseHitSize(canvas.getByRole("button", { name }))
      await expect(size.width).toBeGreaterThanOrEqual(44)
      await expect(size.height).toBeGreaterThanOrEqual(44)
    }

    await expect(canvas.queryByText(/check why the deploy/)).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Transcript" }))
    await waitFor(async () =>
      expect(await canvas.findByText(/check why the deploy/)).toBeVisible()
    )
  },
}

/**
 * A video at its own shape in a black frame, no taller than 400px, its
 * place kept before it loads, with its captions.
 */
export const Video: Story = {
  args: {
    items: [
      {
        kind: "video",
        src: recording,
        poster,
        width: 1280,
        height: 720,
        title: "deploy.webm",
        description: "Screen recording",
        captions: [{ src: captions, label: "English", language: "en" }],
        // A download, a link.
        actions: (
          <a
            href={recording}
            download="deploy.webm"
            aria-label="Download"
            className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
          >
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
          </a>
        ),
      },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    // Under a finger, a link's place is as large as a button's.
    const download = coarseHitSize(
      canvas.getByRole("link", { name: "Download" })
    )
    await expect(download.width).toBeGreaterThanOrEqual(44)
    await expect(download.height).toBeGreaterThanOrEqual(44)
    const frame = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-gallery-player-frame]"
    )!
    const box = frame.getBoundingClientRect()
    await expect(Math.round((box.width / box.height) * 9)).toBe(16)
    // 9 of the column's 12 columns, as a user's message.
    await expect(
      canvasElement
        .querySelector("[data-slot=media-gallery-player]")!
        .getBoundingClientRect().width
    ).toBe(560)
    const video = canvasElement.querySelector("video")!
    await expect(video).toHaveAccessibleName("deploy.webm")
    const track = video.querySelector("track")
    await expect(track).toHaveAttribute("kind", "captions")
    await expect(track).toHaveAttribute("srclang", "en")
    await expect(video).not.toHaveAttribute("controls")
    // Its controls over it, as media-viewer's.
    const bar = frame.querySelector<HTMLElement>("[data-slot=media-bar]")!
    await waitFor(() =>
      expect(within(bar).getByRole("button", { name: "Play" })).toBeVisible()
    )
    await waitFor(() => expect(bar).toHaveTextContent("0:03"), {
      timeout: 3000,
    })
  },
}

/** A tall video keeps to 400px; the frame is black beside it. */
export const TallVideo: Story = {
  args: {
    items: [
      {
        kind: "video",
        src: recording,
        width: 720,
        height: 1280,
        title: "deploy.webm",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-gallery-player-frame]"
    )!
    await expect(Math.round(frame.getBoundingClientRect().height)).toBe(400)
  },
}

/** A length the app knows is shown before anything loads. */
export const KnownDuration: Story = {
  args: {
    items: [
      {
        kind: "audio",
        src: recording,
        title: "Standup.wav",
        duration: 3725,
        mediaProps: { preload: "none" },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector("[data-slot=media-gallery-player-duration]")
    ).toHaveTextContent("1:02:05")
    await expect(
      canvasElement.querySelector("[data-slot=media-bar]")
    ).toHaveTextContent("1:02:05")
  },
}

/**
 * Videos and recordings have an image's states: being made, a placeholder
 * of the shape asked for (a recording's where its controls go) saying so
 * and for how long; deferred, a button with its size; one that could not
 * be made says so. Nothing loads until it is there.
 */
export const PlayerStates: Story = {
  args: {
    items: [
      {
        kind: "video",
        status: "pending",
        elapsed: "12s",
        width: 1280,
        height: 720,
        title: "A drone shot over grey hills",
        description: "veo-3",
      },
      {
        kind: "video",
        status: "deferred",
        fileSize: "8.1 MB",
        onLoadRequest: () => act("video"),
        aspectRatio: 9 / 16,
        duration: 65,
        title: "deploy.webm",
      },
      {
        kind: "audio",
        status: "pending",
        elapsed: "3s",
        title: "Release notes, read aloud",
      },
      {
        kind: "audio",
        status: "deferred",
        fileSize: "1.2 MB",
        onLoadRequest: () => act("audio"),
        title: "Standup.wav",
      },
      { kind: "video", status: "error", title: "Lost.webm" },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector("audio, video")).toBeNull()
    const players = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=media-gallery-player]"
      )
    )
    await expect(players.map((player) => player.dataset.status)).toEqual([
      "pending",
      "deferred",
      "pending",
      "deferred",
      "error",
    ])
    await expect(players[0]).toHaveAttribute("aria-busy", "true")
    const statuses = canvas.getAllByRole("status")
    await expect(statuses[0]).toHaveTextContent("Generating · 12s")
    await expect(statuses[1]).toHaveTextContent("Generating · 3s")
    // At the shape asked for: 16:9, and a tall one no taller than 400px.
    const frame = (player: HTMLElement) =>
      player
        .querySelector("[data-slot=media-gallery-player-frame]")!
        .getBoundingClientRect()
    const wide = frame(players[0]!)
    await expect(Math.round((wide.width / wide.height) * 9)).toBe(16)
    await expect(Math.round(frame(players[1]!).height)).toBe(400)
    // Its length, known before it loads.
    await expect(players[1]).toHaveTextContent("1:05")
    await userEvent.click(
      canvas.getByRole("button", { name: "Load video 8.1 MB" })
    )
    await expect(act).toHaveBeenCalledWith("video")
    await userEvent.click(
      canvas.getByRole("button", { name: "Load recording 1.2 MB" })
    )
    await expect(act).toHaveBeenCalledWith("audio")
    await expect(players[4]).toHaveTextContent("This video cannot be played")
    await expect(players[4]).toHaveAttribute("data-status", "error")
  },
}

/** What cannot be played says so, in place of its controls. */
export const PlayerFailed: Story = {
  args: {
    items: [
      { kind: "audio", src: "/missing.wav", title: "Lost.wav" },
      { kind: "video", src: "/missing.webm", title: "Lost.webm" },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(async () =>
      expect(
        await canvas.findByText("This recording cannot be played")
      ).toBeVisible()
    )
    await waitFor(async () =>
      expect(
        await canvas.findByText("This video cannot be played")
      ).toBeVisible()
    )
    await expect(canvasElement.querySelector("audio, video")).toBeNull()
    for (const player of canvasElement.querySelectorAll(
      "[data-slot=media-gallery-player]"
    )) {
      await expect(player).toHaveAttribute("data-status", "error")
      // Said in greys: the card keeps its hairline, its words muted.
      await expect(getComputedStyle(player).borderColor).toBe(
        themed("border", "borderColor")
      )
      const said = player.querySelector<HTMLElement>(
        "[data-slot=media-gallery-player-description]"
      )!
      await expect(getComputedStyle(said).color).toBe(
        themed("text-muted-foreground", "color")
      )
    }
    // A video's frame, as an image that cannot be shown: greys, not black.
    const failed = canvasElement.querySelector<HTMLElement>(
      "[data-slot=media-gallery-player-frame] [data-slot=media-gallery-failed]"
    )!
    await expect(getComputedStyle(failed).backgroundColor).toBe(
      themed("bg-muted/50", "backgroundColor")
    )
    await expect(getComputedStyle(failed.querySelector("svg")!).color).toBe(
      themed("text-muted-foreground", "color")
    )
  },
}

/**
 * Images, a video and a recording in one gallery, in their order: the
 * images in a row, each player a card of its own.
 */
export const Mixed: Story = {
  args: {
    items: [
      screens[0]!,
      screens[1]!,
      {
        kind: "video",
        src: recording,
        poster,
        width: 1280,
        height: 720,
        title: "deploy.webm",
        description: "Screen recording",
      },
      { kind: "audio", src: recording, title: "Voice message.wav" },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    const rows = canvasElement.querySelector(
      "[data-slot=media-gallery]"
    )!.children
    await expect(rows).toHaveLength(3)
    await expect(rows[0]).toHaveAttribute("data-slot", "media-gallery-images")
    await expect(rows[1]).toHaveAttribute("data-kind", "video")
    await expect(rows[2]).toHaveAttribute("data-kind", "audio")
    // The viewer has the images only.
    await userEvent.click(canvas.getByRole("button", { name: "Sign-in page" }))
    const dialog = within(await body.findByRole("dialog"))
    await expect(dialog.getByText("1 of 2")).toBeInTheDocument()
  },
}

const pausing = () => {
  const pause = spyOn(HTMLMediaElement.prototype, "pause")
  return () => pause.mockRestore()
}

/** In one gallery, playing one pauses the one playing. */
export const OneAtATime: Story = {
  args: {
    items: [
      { kind: "audio", src: recording, title: "First.wav" },
      { kind: "audio", src: recording, title: "Second.wav" },
    ],
  },
  beforeEach: pausing,
  play: async ({ canvasElement }) => {
    const pause = HTMLMediaElement.prototype.pause as unknown as ReturnType<
      typeof spyOn
    >
    const [first, second] = canvasElement.querySelectorAll("audio")
    fireEvent(first!, new Event("play"))
    await expect(pause).not.toHaveBeenCalled()
    fireEvent(second!, new Event("play"))
    await expect(pause).toHaveBeenCalledOnce()
    await expect(pause.mock.contexts[0]).toBe(first)
    // Playing the same again pauses nothing.
    fireEvent(second!, new Event("play"))
    await expect(pause).toHaveBeenCalledOnce()
  },
}

/** In a `MediaGalleryProvider`, so across galleries of a conversation. */
export const OneAtATimeAcross: Story = {
  args: { items: [] },
  beforeEach: pausing,
  render: () => (
    <MediaGalleryProvider>
      <div className="flex flex-col gap-3">
        <MediaGallery
          items={[{ kind: "audio", src: recording, title: "First.wav" }]}
        />
        <MediaGallery
          items={[{ kind: "audio", src: recording, title: "Second.wav" }]}
        />
      </div>
    </MediaGalleryProvider>
  ),
  play: OneAtATime.play!,
}

function GoTo() {
  const media = React.useRef<HTMLMediaElement>(null)
  const [ended, setEnded] = React.useState(false)
  return (
    <div className="flex flex-col gap-3">
      <MediaGallery
        items={[
          {
            kind: "audio",
            src: recording,
            title: "Standup.wav",
            mediaProps: { ref: media, onEnded: () => setEnded(true) },
          },
        ]}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (media.current) media.current.currentTime = 2
          }}
        >
          Go to 0:02
        </Button>
        {ended && <span>Ended</span>}
      </div>
    </div>
  )
}

/**
 * The app controls a player through `mediaProps`: its `ref` to go to a
 * time, as a link in an answer might, and its events.
 */
export const Controlled: Story = {
  args: { items: [] },
  render: () => <GoTo />,
  play: async ({ canvas, canvasElement }) => {
    const audio = canvasElement.querySelector("audio")!
    await waitFor(() => expect(audio.readyState).toBeGreaterThan(0))
    await userEvent.click(canvas.getByRole("button", { name: "Go to 0:02" }))
    await waitFor(() => expect(audio.currentTime).toBe(2))
    fireEvent.ended(audio)
    await waitFor(async () =>
      expect(await canvas.findByText("Ended")).toBeVisible()
    )
  },
}

/** Its words, for other languages. */
export const Labels: Story = {
  args: {
    items: [
      ...screens,
      {
        kind: "audio",
        src: "/missing.wav",
        title: "Sprachnachricht.wav",
        transcript: "Warum ist das Deployment langsamer geworden?",
      },
    ],
    max: 4,
    labels: {
      more: (n) => `${n} weitere`,
      position: (image, images) => `Bild ${image} von ${images}`,
      previous: "Vorheriges Bild",
      next: "Nächstes Bild",
      failed: () => "Diese Aufnahme kann nicht abgespielt werden",
      transcript: "Transkript",
      close: "Schließen",
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const buttons = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=media-gallery-open]"
      )
    )
    await expect(buttons).toHaveLength(4)
    await expect(buttons[3]).toHaveAccessibleName("Error dialog, 5 weitere")
    await waitFor(async () =>
      expect(
        await canvas.findByText("Diese Aufnahme kann nicht abgespielt werden")
      ).toBeVisible()
    )
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Transkript" })).toBeVisible()
    )
    await userEvent.click(buttons[0]!)
    const dialog = within(await body.findByRole("dialog"))
    await expect(
      dialog.getByRole("button", { name: "Schließen" })
    ).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Nächstes Bild" }))
    await expect(dialog.getByText("Bild 2 von 9")).toBeInTheDocument()
  },
}
