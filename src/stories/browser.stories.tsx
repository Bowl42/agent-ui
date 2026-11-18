import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight02Icon,
  CommandLineIcon,
  Folder01Icon,
  Globe02Icon,
} from "@hugeicons/core-free-icons"
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { coarseHitSize } from "@/stories/touch"

import {
  Browser,
  BrowserToolbar,
  BrowserToolbarButton,
  browserFileFrom,
  browserFileType,
  resolveWebAddress,
  useBrowser,
  type BrowserContent,
  type BrowserFile,
  type BrowserPage,
  type BrowserState,
} from "@/components/browser"
import { DiffFileList } from "@/components/diff-block"
import { tone } from "@/stories/samples"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { frames, rendered } from "@/stories/wait"
import { factsOf } from "@/stories/viewer-menus"

const green = "\u001b[32m"
const reset = "\u001b[0m"

const web: BrowserPage = {
  id: "browser",
  title: "Browser",
  location: "http://localhost:5173/",
  content: {
    type: "web",
    url: `data:text/html,${encodeURIComponent(
      "<!doctype html><title>Browser</title><body style='font-family:sans-serif'><h1>Hello from the dev server</h1></body>"
    )}`,
  },
}

const code: BrowserPage = {
  id: "file:src/images.ts",
  title: "images.ts",
  location: "src/images.ts",
  content: {
    type: "code",
    language: "ts",
    code: "export function cacheKey(image: Image) {\n  return hash(image.content)\n}\n",
  },
}

const diff: BrowserPage = {
  id: "changes",
  title: "Changes",
  content: {
    type: "diff",
    // The text of a unified diff, as git writes it; or the files
    // parseUnifiedDiff read from it.
    diff: [
      "diff --git a/src/images.ts b/src/images.ts",
      "index 3b18e51..a9c5d2f 100644",
      "--- a/src/images.ts",
      "+++ b/src/images.ts",
      "@@ -1,3 +1,3 @@",
      " export function cacheKey(image: Image) {",
      "-  return image.path + Date.now()",
      "+  return hash(image.content)",
      " }",
    ].join("\n"),
  },
}

const terminal: BrowserPage = {
  id: "terminal",
  title: "pnpm build",
  content: {
    type: "terminal",
    output: `$ pnpm build\n${green}✓${reset} built in 41s\n`,
  },
}

const image: BrowserPage = {
  id: "screenshot",
  title: "Sign-in page",
  content: {
    type: "image",
    alt: "Sign-in page",
    src: `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="hsl(210 55% 72%)"/><text x="50%" y="50%" font-family="sans-serif" font-size="96" text-anchor="middle" dominant-baseline="middle" fill="#1a1a1a">Sign-in page</text></svg>`
    )}`,
  },
}

const recording: BrowserPage = {
  id: "recording",
  title: "Voice note",
  content: { type: "audio", src: tone(3) },
}

const tree: BrowserFile[] = [
  {
    name: "src",
    path: "src",
    children: [
      { name: "images.ts", path: "src/images.ts" },
      { name: "deploy.ts", path: "src/deploy.ts" },
    ],
  },
  { name: "package.json", path: "package.json" },
]

const files: BrowserPage = {
  id: "files",
  title: "Files",
  location: "~/agent-ui",
  content: { type: "files", files: tree },
}

// A page's picture, its corners transparent, so the checkerboard shows.
const picture = (light: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067"><defs><radialGradient id="g" cx="70%" cy="30%" r="60%"><stop offset="0" stop-color="hsl(240 4% ${light - 25}%)"/><stop offset="1" stop-color="hsl(240 4% ${light}%)"/></radialGradient></defs><rect x="40" y="40" width="1520" height="987" rx="48" fill="url(#g)"/><rect x="140" y="150" width="520" height="48" rx="10" fill="white" opacity=".8"/><rect x="140" y="230" width="380" height="32" rx="8" fill="white" opacity=".6"/></svg>`
  )}`

const hero: BrowserPage = {
  id: "file:public/assets/hero.png",
  title: "hero.png",
  location: "public/assets/hero.png",
  content: {
    type: "image",
    src: picture(88),
    alt: "The pricing page's hero",
    details: ["PNG", "412 KB"],
    download: picture(88),
  },
}

const demo: BrowserPage = {
  id: "file:public/assets/demo.mp4",
  title: "demo.mp4",
  location: "public/assets/demo.mp4",
  content: { type: "video", src: tone(4), details: ["MP4", "8.1 MB"] },
}

// A waveform's peaks, as the app would have measured them.
const peaks = Array.from({ length: 96 }, (_, index) =>
  Math.max(0.1, Math.abs(Math.sin(index * 0.7) * Math.cos(index * 0.13)))
)

const narration: BrowserPage = {
  id: "file:public/audio/narration.mp3",
  title: "narration.mp3",
  location: "public/audio/narration.mp3",
  content: {
    type: "audio",
    src: tone(48, 220),
    heading: "Release notes, read aloud",
    description: "eleven-v3 · generated 12:04",
    peaks,
    transcript: [
      {
        start: 0,
        text: "This release moves the conversation onto one surface.",
      },
      {
        start: 9,
        text: "The composer now queues a message while a turn runs.",
      },
      { start: 17, text: "Command enter interrupts the current turn instead." },
    ],
    details: ["MP3", "768 KB"],
  },
}

const releaseNotes: BrowserPage = {
  id: "file:docs/release-notes.pdf",
  title: "release-notes.pdf",
  location: "docs/release-notes.pdf",
  content: {
    type: "pdf",
    pages: [1, 2, 3].map((number) => ({
      width: 612,
      height: 792,
      content: (
        <div className="px-14 py-16 text-[14px] leading-[22px] text-zinc-700">
          <h4 className="mb-1 text-[23px] leading-8 font-semibold text-zinc-900">
            {`Release v0.1.9 · ${number}`}
          </h4>
          <p>The composer now queues a message while a turn runs.</p>
        </div>
      ),
    })),
    details: ["1.4 MB"],
  },
}

const plans: BrowserPage = {
  id: "file:data/plans.csv",
  title: "plans.csv",
  location: "data/plans.csv",
  content: {
    type: "table",
    csv: "plan,region,price,seats\nStarter,eu,9,1204\nStarter,us,9,3881\nTeam,eu,29,612\nTeam,us,29,1940\nScale,eu,99,88\n",
    details: ["CSV"],
  },
}

const dev: BrowserPage = {
  id: "terminal:dev",
  title: "pnpm dev",
  content: {
    type: "terminal",
    output: `~/agent-ui ❯ pnpm dev\n\n  ${green}VITE v7.2.1${reset}  ready in 412 ms\n\n  ➜  Local:   http://localhost:5173/\n`,
    live: true,
    status: "Running · 12m",
    sessions: [
      { id: "zsh", title: "zsh", output: "~/agent-ui ❯ ", status: "Exited 0" },
    ],
  },
}

const now = Date.now()
const assets: BrowserPage = {
  id: "files:assets",
  title: "assets",
  location: "agent-ui/public/assets",
  content: {
    type: "files",
    view: "grid",
    files: [
      {
        name: "hero.png",
        path: "public/assets/hero.png",
        thumbnail: <img src={picture(88)} alt="" />,
        caption: "1600 × 1067",
        modified: now,
        size: 412_000,
      },
      {
        name: "plans.csv",
        path: "data/plans.csv",
        caption: "5 rows",
        modified: now - 3_600_000,
        size: 2_210,
      },
      {
        name: "narration.mp3",
        path: "public/audio/narration.mp3",
        caption: "0:48",
        size: 768_000,
      },
    ],
  },
}

/** What the app loads for a file, as a page: its viewer's, or code. */
const filePage = (file: BrowserFile): BrowserPage =>
  [hero, plans, narration].find((page) => page.location === file.path) ?? {
    id: `file:${file.path}`,
    title: file.name,
    location: file.path,
    content: { type: "code", language: "ts", code: `// ${file.path}\n` },
  }

const tab = (id: string, page: BrowserPage) => ({
  id,
  pages: [page],
  index: 0,
})

function Demo({
  defaultValue,
  onOpenFile = true,
  actions,
  width,
  onMarkImage,
  height,
  more,
  children,
}: {
  defaultValue: BrowserState
  onOpenFile?: boolean
  /** At the end of its bar. */
  actions?: React.ReactNode
  /** Its frame's width, e.g. a phone's sheet's; and height. */
  width?: number
  height?: number
  onMarkImage?: React.ComponentProps<typeof Browser>["onMarkImage"]
  /** More of the browser's props, e.g. what viewers do. */
  more?: Partial<React.ComponentProps<typeof Browser>>
  /** Below it, with its browser: e.g. buttons that change a page. */
  children?: (browser: ReturnType<typeof useBrowser>) => React.ReactNode
}) {
  const browser = useBrowser({ defaultValue })
  return (
    <div className="flex flex-col gap-3">
      <div
        data-testid="frame"
        style={{
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
        }}
        className="h-[32rem] w-2xl max-w-full overflow-hidden rounded-lg border"
      >
        <Browser
          {...more}
          browser={browser}
          actions={actions}
          onMarkImage={onMarkImage}
          {...(onOpenFile
            ? {
                onOpenFile: (
                  file: BrowserFile,
                  { newTab }: { newTab: boolean }
                ) =>
                  newTab
                    ? browser.open(filePage(file))
                    : browser.navigate(filePage(file)),
              }
            : {})}
        />
      </div>
      {children?.(browser)}
    </div>
  )
}

const meta = {
  title: "Components/Browser",
  component: Demo,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

const all: BrowserState = {
  tabs: [
    tab("web", web),
    tab("code", code),
    tab("diff", diff),
    tab("terminal", terminal),
    tab("image", image),
    tab("audio", recording),
    tab("files", files),
  ],
  active: "web",
}

/**
 * Pages in tabs, each with its type's icon: a web page, code, a diff, a
 * terminal's output, an image, a recording and files. The address bar
 * says where each is; only a web page's can be changed.
 */
export const Pages: Story = {
  args: { defaultValue: all },
  play: async ({ canvas, canvasElement }) => {
    const tabs = within(canvas.getByRole("tablist", { name: "Open pages" }))
    await expect(tabs.getAllByRole("tab")).toHaveLength(7)
    // Its bar is the page's: it is rendered again for each.
    const address = () => canvas.getByRole("textbox", { name: "Address" })

    // A web page: in a frame, loading, then loaded.
    const frame = canvas.getByTitle("Browser")
    await expect(frame.tagName).toBe("IFRAME")
    await waitFor(() =>
      expect(
        frame
          .closest("[data-slot=browser-page]")!
          .querySelector("[data-slot=spinner]")
      ).toBeNull()
    )
    await expect(address()).toHaveValue("http://localhost:5173/")
    await expect(address()).not.toHaveAttribute("readonly")
    // As read while it is not edited: no scheme, its host apart.
    const shown = canvasElement.querySelector(
      "[data-slot=browser-address-text]"
    )!
    await expect(shown).toHaveTextContent(/^localhost:5173$/)
    await expect(shown).toHaveAttribute("aria-hidden", "true")
    await expect(canvas.getByRole("button", { name: "Reload" })).toBeVisible()
    // Elsewhere, from its menu.
    await userEvent.click(canvas.getByRole("button", { name: "More" }))
    await expect(
      await within(document.body).findByRole("menuitem", {
        name: "Open in a new window",
      })
    ).toHaveAttribute("target", "_blank")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(within(document.body).queryByRole("menu")).toBeNull()
    )

    // Code, numbered.
    await userEvent.click(tabs.getByRole("tab", { name: "images.ts" }))
    // The tab shown's: the others are kept, hidden, and inert (the one
    // left is still shown for a frame or so). Shown once the tab picked
    // is, so looked for until then.
    const page = () =>
      within(
        canvasElement.querySelector<HTMLElement>(
          "[data-slot=browser-page]:not([inert])"
        )!
      )
    // A code block's line, its text in the highlighter's pieces.
    const line = (text: string) =>
      [
        ...canvasElement.querySelectorAll<HTMLElement>(
          "[data-slot=browser-page]:not([inert]) [data-slot=code-block-line]"
        ),
      ].find((line) => line.textContent.includes(text))
    await waitFor(() => expect(line("return hash")).toBeVisible())
    // In a viewer: no address, nor its name again (its tab's, where it
    // is on the tab's hover); its language and length below.
    await expect(canvas.queryByRole("textbox", { name: "Address" })).toBeNull()
    await expect(page().queryByRole("navigation", { name: /^Path/ })).toBeNull()
    await expect(
      within(canvas.getByRole("tab", { name: "images.ts" })).getByText(
        "images.ts"
      )
    ).toHaveAttribute("title", expect.stringContaining("src/images.ts"))
    await expect(
      canvasElement.querySelector(
        "[data-slot=browser-page]:not([inert]) [data-slot=viewer-facts]"
      )
    ).toHaveTextContent("TS · 3 lines")
    // Its CodeViewer, embedded: no box in the frame, its tools in the
    // viewer's toolbar, Wrap in the status bar as a diff's.
    await expect(
      canvasElement.querySelector(
        "[data-slot=browser-page]:not([inert]) [data-slot=code-block]"
      )
    ).toBeNull()
    await expect(
      within(
        canvasElement.querySelector<HTMLElement>(
          "[data-slot=browser-page]:not([inert]) [data-slot=viewer-toolbar]"
        )!
      ).getByRole("button", { name: "Find" })
    ).toBeVisible()
    const wrap = page().getByRole("button", { name: "Wrap" })
    await userEvent.click(wrap)
    await expect(wrap).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.queryByRole("button", { name: "Reload" })).toBeNull()

    // A diff: a line removed, one added.
    await userEvent.click(tabs.getByRole("tab", { name: "Changes" }))
    await waitFor(() => expect(page().getByText("src/images.ts")).toBeVisible())
    await expect(line("image.path")).toHaveAttribute("data-variant", "removed")
    await expect(line("hash(image")).toHaveAttribute("data-variant", "added")
    await expect(
      canvasElement.querySelector(
        "[data-slot=browser-page]:not([inert]) [data-slot=viewer-facts]"
      )
    ).toHaveTextContent("1 file · +1 −1")

    // A terminal, in its viewer: its colours, not its escape codes; no
    // address bar, the viewer's own toolbar.
    await userEvent.click(tabs.getByRole("tab", { name: "pnpm build" }))
    const output = await waitFor(() =>
      page().getByLabelText("pnpm build", { selector: "pre" })
    )
    await expect(output).toHaveTextContent("built in 41s")
    // Highlighted once its highlighter has loaded: slower while every
    // story runs.
    await waitFor(() => expect(output.textContent).not.toMatch(/\[32m/), {
      timeout: 5000,
    })
    await expect(canvas.queryByRole("textbox", { name: "Address" })).toBeNull()

    // An image, in its viewer: its words for those who do not see it.
    await userEvent.click(tabs.getByRole("tab", { name: "Sign-in page" }))
    await waitFor(() =>
      expect(page().getByRole("img", { name: "Sign-in page" })).toBeVisible()
    )
    await expect(
      page().getByRole("button", { name: /^Zoom \d+%$/ })
    ).toBeVisible()

    // A recording, in its viewer.
    await userEvent.click(tabs.getByRole("tab", { name: "Voice note" }))
    await waitFor(() =>
      expect(page().getByRole("button", { name: "Play" })).toBeVisible()
    )

    // Files, in their viewer: directories open and close.
    await userEvent.click(tabs.getByRole("tab", { name: "Files" }))
    const src = await waitFor(() =>
      page().getByRole("treeitem", { name: /^src/ })
    )
    await expect(src).toHaveAttribute("aria-expanded", "false")
    src.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(src).toHaveAttribute("aria-expanded", "true")
    await expect(
      page().getByRole("treeitem", { name: /^deploy\.ts/ })
    ).toBeVisible()
  },
}

/** A row of a page's files, by its name. */
const row = (canvas: ReturnType<typeof within>, name: string) =>
  canvas.getByRole("treeitem", {
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  })

/**
 * Going through pages in a tab: a file opened from the files goes in
 * their tab, back returns, forward goes again; ⌘ or Ctrl opens it in a
 * new tab after; a page already open goes to its tab.
 */
export const Navigate: Story = {
  args: {
    defaultValue: {
      tabs: [tab("files", files), tab("web", web)],
      active: "files",
    },
    children: (browser) => (
      <Button variant="outline" onClick={() => browser.open(web)}>
        Open the preview
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    const tabs = within(canvas.getByRole("tablist", { name: "Open pages" }))
    // Files, in their viewer: nothing to go back or forward to.
    await expect(canvas.queryByRole("button", { name: "Back" })).toBeNull()
    await expect(canvas.queryByRole("button", { name: "Forward" })).toBeNull()

    // Back, its directories are as the reader left them, its file picked.
    row(canvas, "src").focus()
    await userEvent.keyboard("{ArrowRight}")
    await userEvent.dblClick(row(canvas, "deploy.ts"))
    await expect(
      await canvas.findByRole("region", { name: "deploy.ts" })
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(await waitFor(() => row(canvas, "src"))).toHaveAttribute(
      "aria-expanded",
      "true"
    )
    await expect(row(canvas, "deploy.ts")).toHaveAttribute(
      "aria-selected",
      "true"
    )
    // Forward, in the viewer's toolbar.
    row(canvas, "src").focus()
    await userEvent.keyboard("{ArrowLeft}")
    await userEvent.click(canvas.getByRole("button", { name: "Forward" }))
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(await waitFor(() => row(canvas, "src"))).toHaveAttribute(
      "aria-expanded",
      "false"
    )

    // Enter opens a file too.
    row(canvas, "package.json").focus()
    await userEvent.keyboard("{Enter}")
    await expect(tabs.getAllByRole("tab")).toHaveLength(2)
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("package.json")
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("Files")
    await userEvent.click(canvas.getByRole("button", { name: "Forward" }))
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("package.json")
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))

    // A new tab, after this one: ⌘ or Ctrl, or a middle click.
    fireEvent.click(await waitFor(() => row(canvas, "package.json")), {
      ctrlKey: true,
    })
    await expect(
      tabs.getAllByRole("tab").map((tab) => tab.textContent)
    ).toEqual(["Files", "package.json", "Browser"])
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("package.json")

    // Open already: to its tab, not another.
    await userEvent.click(
      canvas.getByRole("button", { name: "Open the preview" })
    )
    await expect(tabs.getAllByRole("tab")).toHaveLength(3)
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("Browser")
  },
}

/**
 * Closing tabs: Delete on a tab, a middle click or its ×; the tab after
 * it is shown, or before it. With none, it says nothing is open.
 */
export const CloseTabs: Story = {
  args: {
    defaultValue: {
      tabs: [tab("code", code), tab("diff", diff), tab("terminal", terminal)],
      active: "diff",
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const tabs = within(canvas.getByRole("tablist"))
    const changes = tabs.getByRole("tab", { name: "Changes" })
    await expect(changes).toHaveAttribute(
      "aria-keyshortcuts",
      "Delete Control+Shift+PageUp Control+Shift+PageDown Control+\\"
    )
    changes.focus()
    await userEvent.keyboard("{Delete}")
    await expect(tabs.getAllByRole("tab")).toHaveLength(2)
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("pnpm build")

    const close = (name: string) =>
      tabs
        .getByRole("tab", { name })
        .querySelector<HTMLElement>("[data-slot=browser-tab-close]")!
    await userEvent.click(close("pnpm build"))
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("images.ts")
    await userEvent.click(close("images.ts"))
    await expect(canvas.queryByRole("tablist")).toBeNull()
    await expect(canvas.getByText("Nothing open")).toBeVisible()
    // No empty bar of tabs over it.
    await expect(
      canvasElement.querySelector("[data-slot=browser-bar]")
    ).toBeNull()
  },
}

/**
 * A web page's address, changed: the tab goes there; back returns. What
 * is not a web address goes nowhere.
 */
export const Address: Story = {
  args: { defaultValue: { tabs: [tab("web", web)], active: "web" } },
  play: async ({ canvas }) => {
    const address = canvas.getByRole("textbox", { name: "Address" })
    await userEvent.click(address)
    // Focusing it selects it, to type over.
    await userEvent.keyboard("example.com{Enter}")
    await expect(canvas.getByRole("textbox", { name: "Address" })).toHaveValue(
      "https://example.com/"
    )
    await expect(
      within(canvas.getByRole("tablist")).getByRole("tab", { selected: true })
    ).toHaveAccessibleName("example.com")
    await expect(canvas.getByRole("button", { name: "Back" })).toBeEnabled()
    // Not a web address: it stays.
    await userEvent.click(canvas.getByRole("textbox", { name: "Address" }))
    await userEvent.keyboard("javascript:alert(1){Enter}")
    await expect(
      within(canvas.getByRole("tablist")).getByRole("tab", { selected: true })
    ).toHaveAccessibleName("example.com")
    // The same address again: the same page, not one more to go back from.
    await userEvent.clear(canvas.getByRole("textbox", { name: "Address" }))
    await userEvent.keyboard("https://example.com/{Enter}")
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(
      within(canvas.getByRole("tablist")).getByRole("tab", { selected: true })
    ).toHaveAccessibleName("Browser")
  },
}

/**
 * A tab `pinned`, one of the app's fixed areas: no ×, and neither Delete,
 * a middle click nor its menu closes it, so it is never lost; a page the
 * reader opened beside it closes as any.
 */
export const PinnedTabs: Story = {
  args: {
    defaultValue: {
      tabs: [
        { ...tab("changes", diff), pinned: true },
        { ...tab("files", files), pinned: true },
        tab("code", code),
      ],
      active: "changes",
    },
  },
  play: async ({ canvas }) => {
    const tabs = () =>
      within(canvas.getByRole("tablist", { name: "Open pages" }))
    const changes = tabs().getByRole("tab", { name: "Changes" })
    await expect(
      changes.querySelector("[data-slot=browser-tab-close]")
    ).toBeNull()
    // The strip scrolls sideways only: nothing of a tab's reaches below it.
    const strip = canvas.getByRole("tablist", { name: "Open pages" })
    await expect(strip.scrollHeight).toBe(strip.clientHeight)
    await expect(changes).not.toHaveAttribute(
      "aria-keyshortcuts",
      expect.stringContaining("Delete")
    )
    changes.focus()
    await userEvent.keyboard("{Delete}")
    await fireEvent(
      changes,
      new MouseEvent("auxclick", { bubbles: true, button: 1 })
    )
    await expect(tabs().getAllByRole("tab")).toHaveLength(3)
    fireEvent.contextMenu(changes)
    const menu = within(await within(document.body).findByRole("menu"))
    await expect(menu.queryByRole("menuitem", { name: /^Close/ })).toBeNull()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(within(document.body).queryByRole("menu")).toBeNull()
    )
    // The reader's own page closes.
    tabs().getByRole("tab", { name: "images.ts" }).focus()
    await userEvent.keyboard("{Delete}")
    await expect(tabs().getAllByRole("tab")).toHaveLength(2)
  },
}

/**
 * Local addresses, typed without a scheme, are http: a host and its port
 * is not a scheme. Emptied, the bar says what it takes.
 */
export const LocalAddresses: Story = {
  args: {
    defaultValue: { tabs: [tab("web", web)], active: "web" },
    // Each address as the default resolves it, but a blank page in it:
    // not whatever this machine serves there, which may take the focus.
    more: {
      resolveAddress: (address: string) => {
        const page = resolveWebAddress(address)
        return page && { ...page, content: { type: "web", url: "about:blank" } }
      },
    },
  },
  play: async ({ canvas }) => {
    const address = () => canvas.getByRole("textbox", { name: "Address" })
    await expect(address()).toHaveAttribute("placeholder", "Enter an address")
    for (const [typed, url] of [
      ["localhost:5173/pricing", "http://localhost:5173/pricing"],
      ["127.0.0.1:3000", "http://127.0.0.1:3000/"],
      ["devbox:8080", "http://devbox:8080/"],
      ["example.com:8443", "https://example.com:8443/"],
    ] as const) {
      await userEvent.click(address())
      await userEvent.keyboard(`${typed}{Enter}`)
      await waitFor(() => expect(address()).toHaveValue(url))
    }
    await userEvent.clear(address())
    await expect(address()).toHaveValue("")
    await expect(address()).toHaveAttribute("placeholder", "Enter an address")
  },
}

/**
 * A page that changes where it is open, e.g. a command's output as it
 * comes: the same page, not another to go back from.
 */
export const Live: Story = {
  args: {
    defaultValue: {
      tabs: [
        tab("terminal", {
          ...terminal,
          content: { type: "terminal", output: "$ pnpm test\n", live: true },
        }),
      ],
      active: "terminal",
    },
    children: (browser) => (
      <Button
        variant="outline"
        onClick={() => {
          const shown = browser.state.tabs[0]!.pages[0]!
          if (shown.content.type !== "terminal") return
          browser.update({
            ...shown,
            content: {
              ...shown.content,
              output: `${shown.content.output}${green}✓${reset} test ${shown.content.output.split("\n").length}\n`,
            },
          })
        }}
      >
        More output
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "More output" }))
    await userEvent.click(canvas.getByRole("button", { name: "More output" }))
    await expect(canvas.getByText(/test 3/)).toBeVisible()
    // Nothing to go back to.
    await expect(canvas.queryByRole("button", { name: "Back" })).toBeNull()
  },
}

/** Without `onOpenFile`, files are shown, not opened. */
export const FilesOnly: Story = {
  args: {
    defaultValue: { tabs: [tab("files", files)], active: "files" },
    onOpenFile: false,
  },
  play: async ({ canvas }) => {
    await userEvent.dblClick(row(canvas, "package.json"))
    await expect(row(canvas, "package.json")).toHaveAttribute(
      "aria-selected",
      "true"
    )
    await expect(
      within(canvas.getByRole("tablist", { name: "Open pages" })).getAllByRole(
        "tab"
      )
    ).toHaveLength(1)
  },
}

/**
 * More tabs than a phone's sheet shows: they scroll, faded at an edge
 * with more beyond it; the tab picked comes into view clear of the fade,
 * the one beside it faded, not cut to a sliver. Under a finger, a tab's ×
 * is as wide as one.
 */
export const ManyTabs: Story = {
  args: { defaultValue: { ...all, active: "terminal" }, width: 360 },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist", { name: "Open pages" })
    const tabs = within(list)
    const clear = async (name: string) => {
      const tab = tabs.getByRole("tab", { name })
      await waitFor(() => expect(tab).toHaveAttribute("aria-selected", "true"))
      // Clear of the fade on a side with more beyond it, or at its end.
      await waitFor(() => {
        const box = list.getBoundingClientRect()
        const at = tab.getBoundingClientRect()
        expect(at.left).toBeGreaterThanOrEqual(
          box.left + (list.hasAttribute("data-more-left") ? 32 : 0) - 1
        )
        expect(at.right).toBeLessThanOrEqual(
          box.right - (list.hasAttribute("data-more-right") ? 32 : 0) + 1
        )
      })
    }
    await clear("pnpm build")
    await expect(list).toHaveAttribute("data-more-left")
    await expect(list).toHaveAttribute("data-more-right")
    await expect(getComputedStyle(list).maskImage).toMatch(/gradient/)

    await userEvent.click(tabs.getByRole("tab", { name: "Files" }))
    await clear("Files")
    await expect(list).not.toHaveAttribute("data-more-right")
    await userEvent.click(tabs.getByRole("tab", { name: "Changes" }))
    await clear("Changes")

    // Back at the start, nothing beyond it to fade.
    list.scrollLeft = 0
    await waitFor(() => expect(list).not.toHaveAttribute("data-more-left"))

    const close = tabs
      .getByRole("tab", { name: "Changes" })
      .querySelector<HTMLElement>("[data-slot=browser-tab-close]")!
    await expect(coarseHitSize(close).width).toBeGreaterThanOrEqual(44)
  },
}

/** Its tabs, by pane: "code,diff | terminal", and the one shown. */
const layout = (state: BrowserState) =>
  (state.panes
    ? state.panes
        .map((pane) =>
          state.tabs
            .filter((tab) => tab.pane === pane.id)
            .map((tab) => tab.id)
            .join(",")
        )
        .join(" | ")
    : state.tabs.map((tab) => tab.id).join(",")) + ` (${state.active})`

/** A drag of a tab, as the browser sees it. */
function dragTab(tab: HTMLElement) {
  const data = new DataTransfer()
  const at = (type: string, target: Element, x = 0, y = 0) =>
    target.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
        clientX: x,
        clientY: y,
      })
    )
  at("dragstart", tab)
  return {
    data,
    /** Over a place, then dropped there. */
    async to(target: Element, x: number, y: number) {
      // The drop target shows once the drag has started.
      await waitFor(() =>
        expect(
          document.querySelector("[data-slot=browser-drop]")
        ).not.toBeNull()
      )
      const over = target.matches("[data-slot=browser-pages]")
        ? target.querySelector("[data-slot=browser-drop]")!
        : target
      at("dragover", over, x, y)
      await frames()
      return {
        drop: () => {
          at("drop", over, x, y)
          at("dragend", tab)
        },
      }
    },
  }
}

const middle = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { x: left + width / 2, y: top + height / 2, left, width }
}

/**
 * Tabs are dragged to reorder them, beside a pane's pages to split the
 * browser, or onto another pane's; a pane left with none goes. A tab's
 * menu and keys do the same. `open` and `navigate` go to the pane the
 * reader was last in.
 */
export const Panes: Story = {
  args: {
    defaultValue: {
      tabs: [tab("code", code), tab("diff", diff), tab("terminal", terminal)],
      active: "code",
    },
    actions: (
      <Button variant="ghost" size="icon-sm" aria-label="Panel menu">
        <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
      </Button>
    ),
    children: (browser) => (
      <>
        <Button variant="outline" onClick={() => browser.open(web)}>
          Open the preview
        </Button>
        <output data-testid="layout">{layout(browser.state)}</output>
      </>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    const state = () => canvas.getByTestId("layout").textContent
    const tab = (name: string) => canvas.getByRole("tab", { name })
    const pages = () =>
      Array.from(
        canvasElement.querySelectorAll<HTMLElement>("[data-slot=browser-pages]")
      )

    // Reordered: Changes dragged before Code, the place shown as it goes.
    let drag = dragTab(tab("Changes"))
    const code = middle(tab("images.ts"))
    let over = await drag.to(canvas.getByRole("tablist"), code.left + 2, code.y)
    await waitFor(() =>
      expect(tab("images.ts")).toHaveAttribute("data-drop-before")
    )
    over.drop()
    await waitFor(() => expect(state()).toBe("diff,code,terminal (diff)"))
    await expect(tab("images.ts")).not.toHaveAttribute("data-drop-before")
    await waitFor(() =>
      expect(canvasElement.querySelector("[data-slot=browser-drop]")).toBeNull()
    )
    // And on by a key, past the tab after it, and back.
    tab("Changes").focus()
    await userEvent.keyboard("{Control>}{Shift>}{PageDown}{/Shift}{/Control}")
    await waitFor(() => expect(state()).toBe("code,diff,terminal (diff)"))
    await userEvent.keyboard("{Control>}{Shift>}{PageUp}{/Shift}{/Control}")
    await waitFor(() => expect(state()).toBe("diff,code,terminal (diff)"))

    // Beside the pages, on their right: a new pane, its tablist named.
    drag = dragTab(tab("pnpm build"))
    let area = middle(pages()[0]!)
    over = await drag.to(pages()[0]!, area.left + area.width - 4, area.y)
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=browser-drop] [data-side]")
      ).toHaveAttribute("data-side", "end")
    )
    over.drop()
    await waitFor(() => expect(state()).toBe("diff,code | terminal (terminal)"))
    await expect(
      canvas.getByRole("tablist", { name: "Open pages, pane 1" })
    ).toBeVisible()
    await expect(
      within(
        canvas.getByRole("tablist", { name: "Open pages, pane 2" })
      ).getByRole("tab", { selected: true })
    ).toHaveAccessibleName("pnpm build")
    await expect(
      canvas.getByRole("separator", { name: "Pane width" })
    ).toBeVisible()
    // Each pane has its page shown, side by side.
    await expect(pages()).toHaveLength(2)
    await expect(middle(pages()[1]!).left).toBeGreaterThan(
      middle(pages()[0]!).left
    )

    // Opened where the reader was last: the second pane.
    await userEvent.click(
      canvas.getByRole("button", { name: "Open the preview" })
    )
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff,code \| terminal,browser-tab-\d+ \(browser-tab-\d+\)$/
      )
    )
    // In the first pane's page, the reader is there.
    await userEvent.click(pages()[0]!)
    await waitFor(() => expect(state()).toMatch(/\((diff|code)\)$/))
    await userEvent.click(tab("Changes"))
    await waitFor(() => expect(state()).toMatch(/\(diff\)$/))
    // The browser's actions, once: at the end of the last pane's bar.
    const actions = canvas.getAllByRole("button", { name: "Panel menu" })
    await expect(actions).toHaveLength(1)
    await expect(actions[0]!.closest("[data-slot=browser-pane]")).toBe(
      canvasElement.querySelectorAll("[data-slot=browser-pane]")[1]
    )

    // Onto the other pane's pages: moved there, the first pane's last.
    drag = dragTab(tab("images.ts"))
    area = middle(pages()[1]!)
    over = await drag.to(pages()[1]!, area.x, area.y)
    over.drop()
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff \| terminal,browser-tab-\d+,code \(code\)$/
      )
    )
    // Not beside its own pane, where it is alone: nothing to drop.
    drag = dragTab(tab("Changes"))
    area = middle(pages()[0]!)
    await drag.to(pages()[0]!, area.left + 4, area.y)
    await expect(
      canvasElement.querySelector("[data-slot=browser-drop] [data-side]")
    ).toBeNull()
    // Nor on its own pane's pages.
    over = await drag.to(pages()[0]!, area.x, area.y)
    await expect(
      canvasElement.querySelector("[data-slot=browser-drop] [data-side]")
    ).toBeNull()
    over.drop()

    // By the keyboard: back through its pane, then into the one before.
    tab("images.ts").focus()
    await userEvent.keyboard("{Control>}{Shift>}{PageUp}{/Shift}{/Control}")
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff \| terminal,code,browser-tab-\d+ \(code\)$/
      )
    )
    await waitFor(() => expect(tab("images.ts")).toHaveFocus())
    await userEvent.keyboard("{Control>}{Shift>}{PageUp}{/Shift}{/Control}")
    await userEvent.keyboard("{Control>}{Shift>}{PageUp}{/Shift}{/Control}")
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff,code \| terminal,browser-tab-\d+ \(code\)$/
      )
    )
    await waitFor(() => expect(tab("images.ts")).toHaveFocus())
    // From the end of its pane, on into the next, first.
    await userEvent.keyboard("{Control>}{Shift>}{PageDown}{/Shift}{/Control}")
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff \| code,terminal,browser-tab-\d+ \(code\)$/
      )
    )
    await waitFor(() => expect(tab("images.ts")).toHaveFocus())
    await userEvent.keyboard("{Control>}{Shift>}{PageUp}{/Shift}{/Control}")
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff,code \| terminal,browser-tab-\d+ \(code\)$/
      )
    )

    // By its menu: to the other pane.
    fireEvent.contextMenu(tab("images.ts"))
    const menu = within(await within(document.body).findByRole("menu"))
    await expect(
      menu.getByRole("menuitem", { name: /^Move left/ })
    ).toBeEnabled()
    await userEvent.click(
      menu.getByRole("menuitem", { name: "Move to pane 2" })
    )
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff \| terminal,browser-tab-\d+,code \(code\)$/
      )
    )
    // The focus goes with it, in a frame: then on to another.
    await waitFor(() => expect(tab("images.ts")).toHaveFocus())
    // Once the menu has gone and, a frame later, given its trigger the
    // focus back.
    await waitFor(() =>
      expect(within(document.body).queryByRole("menu")).toBeNull()
    )
    await frames()

    // A new pane by Ctrl+\, of a tab not alone in its own.
    tab("pnpm build").focus()
    await userEvent.keyboard("{Control>}\\{/Control}")
    await waitFor(() =>
      expect(state()).toMatch(
        /^diff \| browser-tab-\d+,code \| terminal \(terminal\)$/
      )
    )

    // Not by a tab alone in its pane, nor by its menu.
    fireEvent.contextMenu(tab("pnpm build"))
    const alone = within(await within(document.body).findByRole("menu"))
    await expect(
      alone.getByRole("menuitem", { name: /^Move to a new pane/ })
    ).toHaveAttribute("aria-disabled", "true")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(within(document.body).queryByRole("menu")).toBeNull()
    )
    tab("pnpm build").focus()
    await userEvent.keyboard("{Control>}\\{/Control}")
    await rendered()
    await expect(state()).toMatch(/ \| terminal \(terminal\)$/)

    // Its panes go as their last tabs close, back to one.
    tab("pnpm build").focus()
    await userEvent.keyboard("{Delete}")
    await waitFor(() =>
      expect(state()).toMatch(/^diff \| browser-tab-\d+,code \(/)
    )
    tab("Changes").focus()
    await userEvent.keyboard("{Delete}")
    await waitFor(() => expect(canvas.getAllByRole("tablist")).toHaveLength(1))
    await expect(canvas.getByRole("tablist")).toHaveAccessibleName("Open pages")
  },
}

/**
 * Too narrow for its panes side by side (280 pixels each), e.g. in a
 * phone's sheet: the pane the reader is in, and "1/2" at the end of its
 * bar to go to another. Wider again, they are side by side.
 */
export const NarrowPanes: Story = {
  args: {
    width: 360,
    defaultValue: {
      tabs: [
        {
          ...tab("notes", {
            id: "notes",
            title: "Notes",
            content: {
              type: "custom",
              element: <input aria-label="Note" className="m-3 border" />,
            },
          }),
          pane: "left",
        },
        { ...tab("diff", diff), pane: "left" },
        { ...tab("web", web), pane: "right" },
      ],
      active: "notes",
      panes: [
        { id: "left", active: "notes" },
        { id: "right", active: "web" },
      ],
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const frame = canvas.getByTestId("frame")
    await waitFor(() => expect(canvas.getAllByRole("tablist")).toHaveLength(1))
    await expect(canvas.getByRole("tab", { name: "Notes" })).toBeVisible()
    // The pane shown is as wide as the browser.
    const pane = canvasElement.querySelector("[data-slot=browser-pane]")!
    await expect(pane.getBoundingClientRect().width).toBeCloseTo(
      frame.clientWidth,
      0
    )
    // What the reader typed, and the web page's frame: they stay, as the
    // pane is hidden, and the browser widens and narrows.
    const note = canvas.getByRole("textbox", { name: "Note" })
    await userEvent.type(note, "kept")
    const page = canvasElement.querySelector("iframe")!

    const switcher = canvas.getByRole("button", { name: "Pane 1/2" })
    await expect(switcher).toHaveTextContent("1/2")
    await userEvent.click(switcher)
    const menu = within(await within(document.body).findByRole("menu"))
    await expect(
      menu.getByRole("menuitemradio", { name: "1 Notes" })
    ).toBeChecked()
    await userEvent.click(
      menu.getByRole("menuitemradio", { name: "2 Browser" })
    )
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Browser" })).toBeVisible()
    )
    await expect(canvas.queryByRole("tab", { name: "Notes" })).toBeNull()
    await expect(page).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Pane 2/2" })
    ).toHaveTextContent("2/2")

    // Wide enough: side by side, no switcher.
    frame.style.width = "640px"
    await waitFor(() => expect(canvas.getAllByRole("tablist")).toHaveLength(2))
    await expect(
      canvas.queryByRole("button", { name: /^Pane \d\// })
    ).toBeNull()
    // Narrow again: still the pane the reader went to.
    frame.style.width = "360px"
    await waitFor(() => expect(canvas.getAllByRole("tablist")).toHaveLength(1))
    await expect(canvas.getByRole("tab", { name: "Browser" })).toBeVisible()

    // By the keyboard this time.
    canvas.getByRole("button", { name: "Pane 2/2" }).focus()
    await userEvent.keyboard("{Enter}")
    // Once it has the focus, a frame after it opens, as a reader would.
    const opened = await within(document.body).findByRole("menu")
    await waitFor(() =>
      expect(opened.contains(document.activeElement)).toBe(true)
    )
    await userEvent.click(
      within(opened).getByRole("menuitemradio", { name: "1 Notes" })
    )
    await waitFor(() => expect(note).toBeVisible())
    await expect(note).toBe(canvas.getByRole("textbox", { name: "Note" }))
    await expect(note).toHaveValue("kept")
    // The same frame, never made again.
    await expect(canvasElement.querySelector("iframe")).toBe(page)
  },
}

/**
 * An image page is a `MediaViewer`: zoomed and moved; a `markable` one's
 * areas marked and sent to the app's `onMarkImage`, with its page.
 */
export const MarkImage: Story = {
  args: {
    defaultValue: {
      tabs: [
        tab("image", {
          ...image,
          content: {
            ...(image.content as Extract<BrowserContent, { type: "image" }>),
            markable: true,
          },
        }),
      ],
      active: "image",
    },
    onMarkImage: fn(),
  },
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Mark" }))
    const frame = canvas.getByRole("group", { name: "Sign-in page" })
    const shown = canvasElement.querySelector("[data-slot=image-editor] img")!
    const { left, top, width, height } = shown.getBoundingClientRect()
    const at = (type: string, x: number, y: number) =>
      frame.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: "mouse",
          clientX: left + x * width,
          clientY: top + y * height,
        })
      )
    at("pointerdown", 0.25, 0.25)
    at("pointermove", 0.5, 0.5)
    at("pointerup", 0.5, 0.5)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Edit this" })
    )
    await expect(args.onMarkImage).toHaveBeenCalledTimes(1)
    const [page, marks, size] = (args.onMarkImage as ReturnType<typeof fn>).mock
      .calls[0]!
    await expect(page).toMatchObject({ id: "screenshot" })
    await expect(marks).toHaveLength(1)
    await expect(size).toEqual({ width: 1600, height: 900 })
  },
}

/** An image not `markable` cannot be marked. */
export const ImageNotMarkable: Story = {
  args: {
    defaultValue: { tabs: [tab("image", image)], active: "image" },
    onMarkImage: fn(),
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /^Zoom \d+%$/ })).toBeVisible()
    )
    await expect(canvas.queryByRole("button", { name: "Mark" })).toBeNull()
  },
}

/**
 * A tab's id may be anything, e.g. a file's path with quotes and
 * backslashes: moved by its keys, it keeps the focus all the same.
 */
export const PathIds: Story = {
  args: {
    defaultValue: {
      tabs: [
        tab('file:primary:a"b.txt', code),
        tab("file:primary:c\\d'].ts", diff),
      ],
      active: 'file:primary:a"b.txt',
    },
    children: (browser) => (
      <output data-testid="layout">{layout(browser.state)}</output>
    ),
  },
  play: async ({ canvas }) => {
    const state = () => canvas.getByTestId("layout").textContent
    const code = canvas.getByRole("tab", { name: "images.ts" })
    code.focus()
    await userEvent.keyboard("{Control>}{Shift>}{PageDown}{/Shift}{/Control}")
    await waitFor(() =>
      expect(state()).toBe(
        'file:primary:c\\d\'].ts,file:primary:a"b.txt (file:primary:a"b.txt)'
      )
    )
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "images.ts" })).toHaveFocus()
    )
    await userEvent.keyboard("{Control>}\\{/Control}")
    await waitFor(() => expect(canvas.getAllByRole("tablist")).toHaveLength(2))
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "images.ts" })).toHaveFocus()
    )
  },
}

/**
 * Files and directories are dragged out, e.g. into a `Composer`: as the
 * browser's own type (`browserFileType`, read by `browserFileFrom`) and
 * as their path in text.
 */
export const DragFiles: Story = {
  args: { defaultValue: { tabs: [tab("files", files)], active: "files" } },
  play: async ({ canvas }) => {
    const dragged = (row: HTMLElement) => {
      const data = new DataTransfer()
      row.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, dataTransfer: data })
      )
      return data
    }
    const src = row(canvas, "src")
    await expect(src).toHaveAttribute("draggable", "true")
    const directory = dragged(src)
    await expect(directory.types).toContain(browserFileType)
    await expect(browserFileFrom(directory)).toEqual({
      name: "src",
      path: "src",
      directory: true,
    })
    await expect(directory.getData("text/plain")).toBe("src")
    await expect(browserFileFrom(dragged(row(canvas, "package.json")))).toEqual(
      { name: "package.json", path: "package.json", directory: false }
    )

    // Not from a drag of something else.
    const text = new DataTransfer()
    text.setData("text/plain", "src")
    await expect(browserFileFrom(text)).toBeUndefined()
    text.setData(browserFileType, JSON.stringify({ name: 1 }))
    await expect(browserFileFrom(text)).toBeUndefined()
  },
}

/**
 * A view of the app's own that knows its history, e.g. a native web view
 * of a desktop app: without the browser's toolbar (`toolbar: false`),
 * with its own made of `BrowserToolbar`, so it looks the same.
 */
function NativeView() {
  const [at, setAt] = React.useState(1)
  const pages = ["https://example.com/", "https://example.com/docs"]
  return (
    <div className="flex h-full flex-col">
      <BrowserToolbar>
        <BrowserToolbarButton
          label="Back"
          disabled={at === 0}
          onClick={() => setAt(at - 1)}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </BrowserToolbarButton>
        <BrowserToolbarButton
          label="Forward"
          disabled={at === pages.length - 1}
          onClick={() => setAt(at + 1)}
        >
          <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} />
        </BrowserToolbarButton>
        <InputGroup>
          <InputGroupAddon>
            <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
          </InputGroupAddon>
          <InputGroupInput aria-label="Address" value={pages[at]} readOnly />
        </InputGroup>
      </BrowserToolbar>
      <p className="p-3 text-sm">The app's view of {pages[at]}</p>
    </div>
  )
}

export const OwnToolbar: Story = {
  args: {
    defaultValue: {
      tabs: [
        tab("native", {
          id: "native",
          title: "example.com",
          toolbar: false,
          content: { type: "custom", element: <NativeView /> },
        }),
        tab("web", web),
      ],
      active: "native",
    },
  },
  play: async ({ canvas, canvasElement }) => {
    // One toolbar: the view's own.
    await expect(
      canvasElement.querySelectorAll("[data-slot=browser-toolbar]")
    ).toHaveLength(1)
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(canvas.getByRole("textbox", { name: "Address" })).toHaveValue(
      "https://example.com/"
    )
    // Other pages keep the browser's (the view's, hidden, once the tab
    // picked is shown).
    await userEvent.click(canvas.getByRole("tab", { name: "Browser" }))
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Address" })).toHaveValue(
        "http://localhost:5173/"
      )
    )
  },
}

/** Nothing open. */
const startActions = {
  terminal: fn(),
  files: fn(),
}

const site = (id: string, title: string, url: string): BrowserPage => ({
  id,
  title,
  location: url,
  content: { type: "web", url: "about:blank" },
})

/** A new tab's things to do, places and recent pages: the app's. */
const start: React.ComponentProps<typeof Browser>["start"] = {
  actions: [
    {
      id: "terminal",
      label: "Terminal",
      icon: <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />,
      shortcut: "⌃`",
      onSelect: startActions.terminal,
    },
    {
      id: "files",
      label: "Files",
      icon: <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
      shortcut: "⌘P",
      onSelect: startActions.files,
    },
  ],
  suggested: [
    { page: site("dev", "Dev server", "http://localhost:5173/") },
    { page: site("storybook", "Storybook", "http://localhost:6006/") },
    { page: site("docs", "Docs", "https://example.com/docs") },
    { page: code },
  ],
  recent: [
    { page: image, description: "Image", time: "9:21 PM" },
    { page: diff, description: "Last turn", time: "8:50 PM" },
    { page: terminal, description: "Terminal", time: "8:46 PM" },
  ],
}

/**
 * With a `start`, a "+" after the tabs opens a new tab: its address bar
 * empty and focused, under it the app's things to do, places and recent
 * pages. One picked goes in the tab; back returns to it.
 */
export const NewTab: Story = {
  args: {
    defaultValue: { tabs: [tab("code", code)], active: "code" },
    more: { start },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "New tab" }))
    const opened = canvas.getByRole("tab", { name: "New tab" })
    await expect(opened).toHaveAttribute("aria-selected", "true")
    await expect(canvas.getByRole("textbox", { name: "Address" })).toHaveFocus()
    await expect(canvas.getByRole("textbox", { name: "Address" })).toHaveValue(
      ""
    )
    // Focused as it opens, not by the keyboard: no ring round it; one,
    // thin, where the keyboard brings the focus back.
    const address = canvas.getByRole("textbox", { name: "Address" })
    const pill = address.closest<HTMLElement>("[data-slot=browser-address]")!
    const ringed = () => {
      const style = getComputedStyle(pill)
      return {
        ring: style.boxShadow.includes("3px"),
        outline:
          style.outlineStyle === "none" ? 0 : parseFloat(style.outlineWidth),
      }
    }
    await waitFor(() => expect(ringed()).toEqual({ ring: false, outline: 0 }))
    await userEvent.tab({ shift: true })
    await userEvent.tab()
    await waitFor(() => expect(ringed()).toEqual({ ring: false, outline: 1 }))
    // The conversation's column (docs/grid.md): 784px at most, 16px in.
    const page = document.querySelector("[data-slot=browser-start]")!
    const column = page.firstElementChild!
    await expect(getComputedStyle(column).paddingInlineStart).toBe("16px")
    await expect(column.getBoundingClientRect().width).toBeLessThanOrEqual(784)
    await userEvent.click(canvas.getByRole("button", { name: /^Terminal/ }))
    await expect(startActions.terminal).toHaveBeenCalled()
    await expect(
      canvas.getByRole("button", { name: /^Terminal/ })
    ).toHaveAttribute("aria-keyshortcuts", "⌃`")
    // A recent page, in the tab; back to the new tab's page.
    const recent = within(canvas.getByRole("region", { name: "Recent" }))
    await userEvent.click(recent.getByRole("button", { name: /Sign-in page/ }))
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Sign-in page" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    )
    await expect(canvas.queryByRole("tab", { name: "New tab" })).toBeNull()
    await userEvent.click(canvas.getAllByRole("button", { name: "Back" })[0]!)
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "New tab" })).toBeVisible()
    )
    // A second new tab is another, not the first again.
    await userEvent.click(canvas.getByRole("button", { name: "New tab" }))
    await expect(canvas.getAllByRole("tab", { name: "New tab" })).toHaveLength(
      2
    )
  },
}

/** Nothing open, with a `start`: its page, an address bar of its own. */
export const EmptyStart: Story = {
  args: { defaultValue: { tabs: [], active: null }, more: { start } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("Nothing open")).toBeNull()
    const suggested = within(canvas.getByRole("region", { name: "Suggested" }))
    await userEvent.click(suggested.getByRole("button", { name: "Docs" }))
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Docs" })).toBeVisible()
    )
  },
}

/**
 * The pointer resting on a tab, its card: its title and where it is,
 * whole, and the page's `preview`, e.g. the files a diff changes. From
 * one tab to the next, it follows; dragging a tab closes it.
 */
export const TabCard: Story = {
  args: {
    defaultValue: {
      tabs: [
        tab("web", web),
        tab("diff", {
          ...diff,
          preview: (
            <DiffFileList
              variant="card"
              files={[
                {
                  name: "src/images.ts",
                  status: "modified",
                  added: 1,
                  removed: 1,
                },
              ]}
            />
          ),
        }),
      ],
      active: "web",
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const card = () =>
      canvasElement.ownerDocument.querySelector<HTMLElement>(
        "[data-slot=browser-tab-card]"
      )
    await userEvent.hover(canvas.getByRole("tab", { name: "Changes" }))
    await waitFor(() => expect(card()).toBeVisible(), { timeout: 3000 })
    await expect(card()).toHaveTextContent("Changes")
    await expect(
      card()!.querySelector("[data-slot=diff-file-list]")
    ).not.toBeNull()
    await userEvent.hover(canvas.getByRole("tab", { name: "Browser" }))
    await waitFor(() =>
      expect(card()).toHaveTextContent("http://localhost:5173/")
    )
    // Not by the keyboard: its tab says its title.
    await userEvent.unhover(canvas.getByRole("tab", { name: "Browser" }))
    await waitFor(() =>
      expect(
        canvasElement.ownerDocument.querySelector(
          "[data-slot=browser-tab-card]"
        )
      ).toBeNull()
    )
    canvas.getByRole("tab", { name: "Changes" }).focus()
    await frames(20)
    await expect(
      canvasElement.ownerDocument.querySelector("[data-slot=browser-tab-card]")
    ).toBeNull()
  },
}

export const Empty: Story = {
  args: { defaultValue: { tabs: [], active: null } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("Nothing open")).toBeVisible()
    await expect(canvas.queryByRole("toolbar")).toBeNull()
    await expect(
      canvasElement.querySelector("[data-slot=browser-bar]")
    ).toBeNull()
  },
}

/** Nothing open, the app's actions still at the end of a bar, unlined. */
export const EmptyWithActions: Story = {
  args: {
    defaultValue: { tabs: [], active: null },
    actions: (
      <Button variant="ghost" size="icon-sm" aria-label="Panel menu">
        <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
      </Button>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("Nothing open")).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Panel menu" })
    ).toBeVisible()
    const bar = canvasElement.querySelector("[data-slot=browser-bar]")!
    await expect(getComputedStyle(bar).borderBottomWidth).toBe("0px")
  },
}

const viewers: BrowserState = {
  tabs: [
    tab("files", assets),
    tab("image", hero),
    tab("video", demo),
    tab("audio", narration),
    tab("pdf", releaseNotes),
    tab("table", plans),
    tab("terminal", dev),
  ],
  active: "files",
}

const addedToChat = fn()
const stopped = fn()
const cleared = fn()
const newTerminal = fn()

/** The page shown's. */
const shownPage = (canvasElement: HTMLElement) =>
  within(
    canvasElement.querySelector<HTMLElement>(
      "[data-slot=browser-page]:not([inert])"
    )!
  )

/**
 * Files, an image, video, audio, a PDF, a table and terminals, each in
 * its viewer: the viewer's toolbar is the page's (where it is, its tools,
 * "@", download), its status bar its facts. No address bar over them.
 */
export const Viewers: Story = {
  args: {
    defaultValue: viewers,
    width: 600,
    height: 760,
    more: { onAddToChat: addedToChat },
  },
  play: async ({ canvas, canvasElement }) => {
    const tabs = within(canvas.getByRole("tablist", { name: "Open pages" }))
    const page = () => shownPage(canvasElement)
    const facts = () =>
      canvasElement.querySelector(
        "[data-slot=browser-page]:not([inert]) [data-slot=viewer-facts]"
      )

    // A folder as a grid of thumbnails.
    await expect(
      page().getByRole("listbox", { name: "assets" })
    ).toBeInTheDocument()
    await expect(page().getAllByRole("option")).toHaveLength(3)
    await expect(canvas.queryByRole("textbox", { name: "Address" })).toBeNull()
    await expect(
      page().getByRole("navigation", { name: /^Path/ })
    ).toHaveTextContent(/agent-ui.*public.*assets/)

    // An image: its size read, the app's facts after, at the top of More
    // (no status bar under it); its download.
    await userEvent.click(tabs.getByRole("tab", { name: "hero.png" }))
    await waitFor(async () =>
      expect(
        await factsOf(
          canvasElement.querySelector<HTMLElement>(
            "[data-slot=browser-page]:not([inert])"
          )!
        )
      ).toBe("1600 × 1067 · PNG · 412 KB")
    )
    await expect(
      page().getByRole("link", { name: "Download" })
    ).toHaveAttribute("href", picture(88))
    await userEvent.click(page().getByRole("button", { name: "Add to chat" }))
    await expect(addedToChat).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: hero.id })
    )

    // A video, on black.
    await userEvent.click(tabs.getByRole("tab", { name: "demo.mp4" }))
    await waitFor(() =>
      expect(
        getComputedStyle(page().getByRole("group", { name: "demo.mp4" }))
          .backgroundColor
      ).toBe("rgb(0, 0, 0)")
    )

    // A recording: its waveform and its transcript.
    await userEvent.click(tabs.getByRole("tab", { name: "narration.mp3" }))
    await waitFor(() =>
      expect(page().getByText("Release notes, read aloud")).toBeVisible()
    )
    await expect(
      page().getByText("The composer now queues a message while a turn runs.")
    ).toBeVisible()

    // A PDF, page by page.
    await userEvent.click(tabs.getByRole("tab", { name: "release-notes.pdf" }))
    await waitFor(() =>
      expect(page().getByText("Release v0.1.9 · 1")).toBeVisible()
    )
    await expect(
      page().getByRole("button", { name: "Next page" })
    ).toBeVisible()

    // A CSV, as a grid, its columns typed.
    await userEvent.click(tabs.getByRole("tab", { name: "plans.csv" }))
    const grid = await waitFor(() =>
      page().getByRole("grid", { name: "plans.csv" })
    )
    await expect(
      within(grid).getByRole("columnheader", { name: "seats num" })
    ).toBeVisible()
    await expect(facts()).toHaveTextContent("5 rows · 4 columns · CSV")

    // Terminals: the page's process, then the others.
    await userEvent.click(tabs.getByRole("tab", { name: "pnpm dev" }))
    const terminals = await waitFor(() =>
      page().getByRole("tablist", { name: "Terminals" })
    )
    await expect(
      within(terminals)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual(["pnpm dev, Running", "zsh, Exited"])
    await expect(facts()).toHaveTextContent("Running · 12m")
  },
}

/**
 * A file opened from a folder goes to its viewer in the same tab: the
 * viewer's back returns to the folder (as the reader left it), forward
 * goes again. Its name is its tab's, not said again in its viewer's
 * toolbar (back and forward alone there); the folder's keeps its path.
 */
export const ViewerHistory: Story = {
  args: {
    defaultValue: { tabs: [tab("files", assets)], active: "files" },
    height: 760,
  },
  play: async ({ canvas, canvasElement }) => {
    const page = () => shownPage(canvasElement)
    await userEvent.dblClick(page().getByRole("option", { name: /^hero\.png/ }))
    await waitFor(() =>
      expect(
        page().getByRole("region", { name: "hero.png" })
      ).toBeInTheDocument()
    )
    // Named by its tab, not again in its toolbar: back alone there.
    await expect(
      canvas.getByRole("tab", { name: /hero\.png/, selected: true })
    ).toBeInTheDocument()
    await expect(page().queryByRole("navigation", { name: /^Path/ })).toBeNull()
    await expect(page().queryAllByText("hero.png")).toHaveLength(0)
    await expect(
      page().getByRole("button", { name: "Back" })
    ).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Forward" })).toBeNull()

    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    const tile = await waitFor(() =>
      page().getByRole("option", { name: /^hero\.png/ })
    )
    await expect(tile).toHaveAttribute("aria-selected", "true")
    await expect(canvas.queryByRole("button", { name: "Back" })).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Forward" }))
    await waitFor(() =>
      expect(
        page().getByRole("region", { name: "hero.png" })
      ).toBeInTheDocument()
    )
  },
}

/**
 * What goes to the chat from a viewer, and what a terminal's buttons do:
 * the page, with the part picked in it.
 */
export const ViewerActions: Story = {
  args: {
    defaultValue: { ...viewers, active: "table" },
    height: 760,
    more: {
      onAddToChat: addedToChat,
      onStopTerminal: stopped,
      onClearTerminal: cleared,
      onNewTerminal: newTerminal,
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const tabs = within(canvas.getByRole("tablist", { name: "Open pages" }))
    const page = () => shownPage(canvasElement)
    const grid = await waitFor(() =>
      page().getByRole("grid", { name: "plans.csv" })
    )
    await userEvent.click(
      within(grid).getAllByRole("row")[4]!.querySelectorAll("td")[4]!
    )
    await userEvent.click(page().getByRole("button", { name: "Add to chat" }))
    await expect(addedToChat).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: plans.id }),
      { cell: expect.objectContaining({ row: 3, column: 3, name: "seats" }) }
    )

    await userEvent.click(tabs.getByRole("tab", { name: "pnpm dev" }))
    await userEvent.click(
      await waitFor(() =>
        page().getByRole("button", { name: "Send output to chat" })
      )
    )
    await expect(addedToChat).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: dev.id }),
      { session: expect.objectContaining({ id: dev.id, running: true }) }
    )
    await userEvent.click(page().getByRole("button", { name: "Stop" }))
    await expect(stopped).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: dev.id }),
      expect.objectContaining({ id: dev.id })
    )
    await userEvent.click(page().getByRole("button", { name: "Clear" }))
    await expect(cleared).toHaveBeenCalled()
    await userEvent.click(page().getByRole("button", { name: "New terminal" }))
    await expect(newTerminal).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: dev.id })
    )

    // A file picked in a folder.
    await userEvent.click(tabs.getByRole("tab", { name: "assets" }))
    await userEvent.click(
      await waitFor(() => page().getByRole("option", { name: /^plans\.csv/ }))
    )
    await userEvent.click(page().getByRole("button", { name: "Add to chat" }))
    await expect(addedToChat).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: assets.id }),
      { file: expect.objectContaining({ path: "data/plans.csv" }) }
    )
  },
}

/**
 * In a phone's sheet: each viewer's toolbar fits, its back a finger's
 * size, its content to the edges.
 */
export const ViewersOnAPhone: Story = {
  args: {
    defaultValue: {
      tabs: viewers.tabs.map((each) => ({
        ...each,
        // Somewhere to go back to, in each.
        pages: [code, ...each.pages],
        index: 1,
      })),
      active: "files",
    },
    width: 360,
    height: 640,
    more: { onAddToChat: addedToChat },
  },
  play: async ({ canvas, canvasElement }) => {
    const tabs = within(canvas.getByRole("tablist", { name: "Open pages" }))
    for (const name of [
      "assets",
      "hero.png",
      "demo.mp4",
      "narration.mp3",
      "release-notes.pdf",
      "plans.csv",
      "pnpm dev",
    ]) {
      await userEvent.click(tabs.getByRole("tab", { name }))
      const toolbar = await waitFor(() => {
        const shown = canvasElement.querySelector<HTMLElement>(
          "[data-slot=browser-page]:not([inert]) [data-slot=viewer-toolbar]"
        )
        expect(shown).toBeTruthy()
        return shown!
      })
      await expect(toolbar.scrollWidth).toBeLessThanOrEqual(
        toolbar.clientWidth + 1
      )
      const back = within(toolbar).getByRole("button", { name: "Back" })
      await expect(coarseHitSize(back).width).toBeGreaterThanOrEqual(44)
      const page = toolbar.closest<HTMLElement>("[data-slot=browser-page]")!
      await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth + 1)
    }
  },
}
