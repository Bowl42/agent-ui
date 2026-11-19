import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Csv01Icon,
  File01Icon,
  FileAudioIcon,
  PlayIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { FilesViewer, type ViewerFile } from "@/components/files-viewer"
import { ViewerStatusButton } from "@/components/viewer"
import { Button } from "@/components/ui/button"
import { Panel } from "@/stories/panel"

const now = Date.UTC(2026, 10, 8, 12, 0)
const ago = (minutes: number) => now - minutes * 60_000
const hour = 60
const day = 24 * hour

const workspace: ViewerFile[] = [
  {
    id: ".storybook",
    name: ".storybook",
    directory: true,
    modified: ago(3 * day),
    children: [],
  },
  {
    id: "public",
    name: "public",
    directory: true,
    modified: ago(hour),
    children: [],
  },
  {
    id: "src",
    name: "src",
    directory: true,
    modified: ago(0),
    children: [
      {
        id: "src/components",
        name: "components",
        directory: true,
        modified: ago(0),
      },
      {
        id: "src/lib",
        name: "lib",
        directory: true,
        modified: ago(0),
        children: [
          {
            id: "src/lib/debounce.ts",
            name: "debounce.ts",
            modified: ago(0),
            size: 412,
            status: "A",
            added: 14,
            removed: 0,
          },
          {
            id: "src/lib/utils.ts",
            name: "utils.ts",
            modified: ago(2 * day),
            size: 1126,
          },
        ],
      },
      {
        id: "src/index.css",
        name: "index.css",
        modified: ago(5 * hour),
        size: 6554,
      },
      {
        id: "src/main.tsx",
        name: "main.tsx",
        modified: ago(7 * day),
        size: 380,
      },
    ],
  },
  {
    id: "package.json",
    name: "package.json",
    modified: ago(0),
    size: 2253,
    status: "M",
    added: 0,
    removed: 1,
  },
  { id: "README.md", name: "README.md", modified: ago(14 * day), size: 3072 },
  {
    id: "vite.config.ts",
    name: "vite.config.ts",
    modified: ago(0),
    size: 612,
    status: "M",
    added: 4,
    removed: 2,
  },
  {
    id: "node_modules",
    name: "node_modules",
    directory: true,
    modified: ago(hour),
    dimmed: true,
    children: [],
  },
]

const thumbnail = (light: number, angle = 160) => (
  <img
    alt=""
    src={`data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><linearGradient id="g" gradientTransform="rotate(${angle - 90} .5 .5)"><stop offset="0" stop-color="hsl(240 5% ${light + 8}%)"/><stop offset="1" stop-color="hsl(240 5% ${light - 14}%)"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/></svg>`
    )}`}
  />
)

const assets: ViewerFile[] = [
  {
    id: "hero.png",
    name: "hero.png",
    thumbnail: thumbnail(90),
    caption: "1600 × 1067",
    size: 421_888,
  },
  {
    id: "hero@2x.png",
    name: "hero@2x.png",
    thumbnail: thumbnail(86, 20),
    caption: "3200 × 2134",
    size: 1_610_000,
  },
  {
    id: "pricing.png",
    name: "pricing.png",
    thumbnail: thumbnail(92),
    caption: "1440 × 900",
    size: 512_000,
  },
  {
    id: "demo.mp4",
    name: "demo.mp4",
    thumbnail: thumbnail(80, 20),
    badge: (
      <>
        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} aria-hidden="true" />{" "}
        0:42
      </>
    ),
    caption: "0:42",
    size: 8_493_000,
  },
  {
    id: "spec.pdf",
    name: "spec.pdf",
    icon: <HugeiconsIcon icon={File01Icon} strokeWidth={2} />,
    caption: "12 pages",
    size: 1_468_000,
  },
  {
    id: "narration.mp3",
    name: "narration.mp3",
    icon: <HugeiconsIcon icon={FileAudioIcon} strokeWidth={2} />,
    caption: "0:48",
    size: 786_000,
  },
  {
    id: "plans.csv",
    name: "plans.csv",
    icon: <HugeiconsIcon icon={Csv01Icon} strokeWidth={2} />,
    caption: "1,284 rows",
    size: 48_000,
  },
  {
    id: "logo.svg",
    name: "logo.svg",
    thumbnail: thumbnail(88),
    caption: "24 × 24",
    size: 1_200,
  },
]

function Files({
  selected: initial = null,
  ...props
}: Partial<React.ComponentProps<typeof FilesViewer>>) {
  const [selected, setSelected] = React.useState<string | null>(initial)
  return (
    <FilesViewer
      name="agentui"
      files={workspace}
      now={now}
      selected={selected}
      onSelect={(file) => setSelected(file.id)}
      controls={
        <ViewerStatusButton>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          New file
        </ViewerStatusButton>
      }
      {...props}
    />
  )
}

const meta = {
  title: "Components/Files Viewer",
  component: Files,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Panel>
        <Story />
      </Panel>
    ),
  ],
  args: {
    onOpen: fn(),
  },
} satisfies Meta<typeof Files>

export default meta
type Story = StoryObj<typeof meta>

const row = (canvas: ReturnType<typeof within>, name: string | RegExp) =>
  canvas.getByRole("treeitem", { name })

/**
 * A folder as a tree, as a file manager lists it: folders first, when
 * each changed and its size, a status after a changed one's name. The
 * arrow keys move the pick, right and left open and close a folder;
 * Enter opens a file.
 */
export const List: Story = {
  args: {
    expanded: undefined,
    selected: "src/lib/debounce.ts",
  },
  render: (args) => {
    const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(
      () => new Set(["src", "src/lib"])
    )
    return (
      <Files
        {...args}
        expanded={expanded}
        onExpandedChange={(next) => setExpanded(next)}
      />
    )
  },
  play: async ({ args, canvas }) => {
    const tree = canvas.getByRole("tree", { name: "agentui" })
    const picked = row(canvas, /^debounce\.ts/)
    await expect(picked).toHaveAttribute("aria-selected", "true")
    await expect(picked).toHaveAttribute("aria-level", "3")
    await expect(picked).toHaveTextContent("added")
    await expect(within(tree).getAllByRole("treeitem")[0]).toHaveTextContent(
      ".storybook"
    )
    await expect(canvas.getByText("13 items · 3 changed")).toBeVisible()
    picked.focus()
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(row(canvas, /^utils\.ts/)).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await expect(args.onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "src/lib/utils.ts" })
    )
    // Left: to its folder; left again closes it.
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() => expect(row(canvas, /^lib/)).toHaveFocus())
    await expect(row(canvas, /^lib/)).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{ArrowLeft}")
    await expect(row(canvas, /^lib/)).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.queryByRole("treeitem", { name: /^utils/ })).toBeNull()
    await userEvent.keyboard("{ArrowRight}")
    await expect(row(canvas, /^lib/)).toHaveAttribute("aria-expanded", "true")
  },
}

/** Sorted by the header, folders still first; by size, largest first again. */
export const Sort: Story = {
  play: async ({ canvas }) => {
    const names = () =>
      canvas
        .getAllByRole("treeitem")
        .map(
          (item) =>
            item.querySelector("[data-slot=files-viewer-name]")!.textContent
        )
    const size = canvas.getByRole("button", { name: "Sort by Size" })
    await userEvent.click(size)
    await expect(size).toHaveAttribute("aria-pressed", "true")
    await expect(names()).toEqual([
      ".storybook",
      "node_modules",
      "public",
      "src",
      "vite.config.ts",
      "package.json",
      "README.md",
    ])
    await userEvent.click(size)
    // Folders first either way.
    await expect(names().slice(4)).toEqual([
      "README.md",
      "package.json",
      "vite.config.ts",
    ])
  },
}

/** The filter keeps what matches, and the folders it is in, open. */
export const Filter: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }))
    const input = await canvas.findByRole("textbox", { name: "Filter" })
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.type(input, "debounce")
    await waitFor(() =>
      expect(
        canvas.getAllByRole("treeitem").map((item) => item.textContent)
      ).toHaveLength(3)
    )
    await expect(row(canvas, /^debounce/)).toBeVisible()
    await expect(row(canvas, /^src/)).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.getAllByRole("treeitem").length).toBeGreaterThan(3)
    )
  },
}

/**
 * A folder of media as a grid: images their thumbnails, the rest their
 * type's icon; a caption under each; the arrow keys pick by where they
 * are, Enter opens.
 */
export const Grid: Story = {
  args: {
    name: "assets",
    files: assets,
    defaultView: "grid",
    path: [{ label: "agentui" }, { label: "public" }],
    onBack: fn(),
    selected: "hero.png",
    controls: (
      <ViewerStatusButton>
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        Upload
      </ViewerStatusButton>
    ),
  },
  play: async ({ args, canvas }) => {
    const grid = canvas.getByRole("listbox", { name: "assets" })
    await expect(canvas.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    const hero = await within(grid).findByRole("option", { name: /^hero\.png/ })
    await expect(hero).toHaveAttribute("aria-selected", "true")
    await expect(canvas.getByText("8 items · 12.7 MB")).toBeVisible()
    hero.focus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() =>
      expect(
        within(grid).getByRole("option", { name: /^hero@2x/ })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await expect(args.onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "hero@2x.png" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "List" }))
    await expect(
      await canvas.findByRole("tree", { name: "assets" })
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Grid" }))
    await expect(
      await canvas.findByRole("listbox", { name: "assets" })
    ).toBeVisible()
  },
}

const option = (canvas: ReturnType<typeof within>, name: RegExp) =>
  canvas.getByRole("option", { name })

/**
 * Folder after folder, as Finder's columns: a folder picked opens beside
 * (one not loaded yet asks the app, `onExpandedChange`), the way to the
 * pick lit. Right goes into a folder, left back out, up and down in a
 * column. A file picked shows its preview beside; the first columns
 * fold away for it, a button back to them.
 */
export const Columns: Story = {
  args: { defaultView: "columns", onExpandedChange: fn() },
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Columns" })
    ).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(option(canvas, /^src/))
    const src = await canvas.findByRole("listbox", { name: "src" })
    await expect(within(src).getAllByRole("option")).toHaveLength(4)
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(option(canvas, /^components/)).toHaveFocus())
    // Not loaded: it says so, and the app is asked for it.
    await expect(
      within(
        await canvas.findByRole("listbox", { name: "components" })
      ).getByText("Loading…")
    ).toBeVisible()
    await expect(args.onExpandedChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "src/components" })
    )
    // The way there is lit.
    await expect(option(canvas, /^src/)).toHaveAttribute("data-open")
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(option(canvas, /^lib/)).toHaveFocus())
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(option(canvas, /^debounce\.ts/)).toHaveFocus())
    // A file: its preview beside, the columns before folded away.
    const preview = canvas.getByText("debounce.ts", {
      selector: "[data-slot=files-preview] *",
    })
    await expect(preview).toBeVisible()
    await expect(canvas.queryByRole("listbox", { name: "agentui" })).toBeNull()
    await expect(canvas.queryByRole("listbox", { name: "src" })).toBeNull()
    // Back a column: src, the preview hidden; forward again.
    await userEvent.click(canvas.getByRole("button", { name: "Back to src" }))
    await waitFor(() =>
      expect(canvas.getByRole("listbox", { name: "src" })).toBeVisible()
    )
    await expect(preview).not.toBeInTheDocument()
    await userEvent.click(
      canvas.getByRole("button", { name: "Forward to lib" })
    )
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: /^Forward to/ })).toBeNull()
    )
    option(canvas, /^debounce\.ts/).focus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "src/lib/debounce.ts" })
    )
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() => expect(option(canvas, /^lib/)).toHaveFocus())
  },
}

/**
 * The picked file large, the app's `preview` of it, over a strip of its
 * folder's files: left and right pick, Enter opens.
 */
export const Gallery: Story = {
  args: {
    name: "assets",
    files: assets,
    defaultView: "gallery",
    selected: "hero.png",
    preview: (file) =>
      file.thumbnail ? (
        <figure
          data-testid="preview"
          className="flex h-full flex-col items-center justify-center gap-2 p-6 *:[img]:max-h-full *:[img]:rounded-lg"
        >
          {file.thumbnail}
          <figcaption className="text-xs text-muted-foreground">
            {file.name} · {file.caption}
          </figcaption>
        </figure>
      ) : undefined,
  },
  play: async ({ args, canvas }) => {
    const strip = canvas.getByRole("listbox", { name: "assets" })
    await expect(strip).toHaveAttribute("aria-orientation", "horizontal")
    await expect(canvas.getByTestId("preview")).toHaveTextContent("hero.png")
    option(canvas, /^hero\.png/).focus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(option(canvas, /^hero@2x/)).toHaveFocus())
    await expect(canvas.getByTestId("preview")).toHaveTextContent("hero@2x.png")
    // The last; no preview of the app's: its icon, name and caption.
    await userEvent.keyboard("{End}")
    await waitFor(() => expect(option(canvas, /^spec\.pdf/)).toHaveFocus())
    await expect(canvas.queryByTestId("preview")).toBeNull()
    await expect(
      canvas.getByText("12 pages", { selector: "[data-slot=files-preview] *" })
    ).toBeVisible()
    await userEvent.keyboard("{Enter}")
    await expect(args.onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "spec.pdf" })
    )
    await expect(canvas.getByText("8 items · 12.7 MB")).toBeVisible()
  },
}

/**
 * Picked in a folder under the top (in the columns, say), the gallery
 * shows that folder's files and says where they are: the way there over
 * the strip, a button back out picking the folder.
 */
export const GalleryInAFolder: Story = {
  args: { defaultView: "columns", selected: "src/lib/debounce.ts" },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Gallery" }))
    const strip = await canvas.findByRole("listbox", { name: "lib" })
    await expect(within(strip).getAllByRole("option")).toHaveLength(2)
    const path = canvasElement.querySelector("[data-slot=files-gallery-path]")!
    await expect(path).toHaveTextContent("agentui / src / lib")
    // Back out: src's files, lib picked in them.
    await userEvent.click(canvas.getByRole("button", { name: "Back to src" }))
    const src = await canvas.findByRole("listbox", { name: "src" })
    await expect(
      within(src).getByRole("option", { name: /^lib/ })
    ).toHaveAttribute("aria-selected", "true")
    await expect(path).toHaveTextContent("agentui / src")
    // And to the top: no way there said, the strip the top's.
    await userEvent.click(
      canvas.getByRole("button", { name: "Back to agentui" })
    )
    await canvas.findByRole("listbox", { name: "agentui" })
    await expect(
      canvasElement.querySelector("[data-slot=files-gallery-path]")
    ).toBeNull()
  },
}

const recent: ViewerFile[] = [
  {
    id: "notes.md",
    name: "notes.md",
    modified: ago(5),
    size: 812,
    description: "Draft",
  },
  {
    id: "report.pdf",
    name: "report.pdf",
    modified: ago(40),
    size: 1_468_000,
    description: "From the agent",
  },
  {
    id: "drafts",
    name: "drafts",
    directory: true,
    modified: ago(50),
    children: [],
  },
  { id: "plan.csv", name: "plan.csv", modified: ago(2 * day), size: 48_000 },
  {
    id: "archive",
    name: "archive",
    directory: true,
    modified: ago(9 * day),
    children: [],
  },
]

/**
 * In the app's order, not sorted (`defaultSort={null}`): folders among
 * the files, as given; a description after a name. The header sorts on
 * a click; "None" in the menu goes back to the app's order.
 */
export const AppOrder: Story = {
  args: { name: "Recent", files: recent, defaultSort: null },
  play: async ({ canvas }) => {
    const names = () =>
      canvas
        .getAllByRole("treeitem")
        .map(
          (item) =>
            item.querySelector("[data-slot=files-viewer-name]")!.textContent
        )
    await expect(names()).toEqual([
      "notes.md",
      "report.pdf",
      "drafts",
      "plan.csv",
      "archive",
    ])
    await expect(row(canvas, /^report\.pdf/)).toHaveTextContent(
      "From the agent"
    )
    for (const header of canvas.getAllByRole("button", { name: /^Sort by/ }))
      await expect(header).toHaveAttribute("aria-pressed", "false")
    const name = canvas.getByRole("button", { name: "Sort by Name" })
    await userEvent.click(name)
    // Sorted, its arrow says so; its name as grey as the others'.
    await expect(getComputedStyle(name).color).toBe(
      getComputedStyle(canvas.getByRole("button", { name: "Sort by Size" }))
        .color
    )
    await expect(names()).toEqual([
      "archive",
      "drafts",
      "notes.md",
      "plan.csv",
      "report.pdf",
    ])
    await userEvent.click(canvas.getByRole("button", { name: "More" }))
    await userEvent.click(
      await within(document.body).findByRole("menuitemradio", { name: "None" })
    )
    await waitFor(() => expect(names()[0]).toBe("notes.md"))
  },
}

/**
 * In a narrow column the name comes first: the description is cut, then
 * gone, before the name is cut at all.
 */
export const DescriptionGivesWay: Story = {
  args: {
    defaultView: "columns",
    files: [
      {
        id: "agentry-app",
        name: "agentry-app",
        directory: true,
        description: "Git repository",
        children: [],
      },
      { id: "notes", name: "notes", directory: true, children: [] },
    ],
  },
  play: async ({ canvas }) => {
    const name = await canvas.findByText("agentry-app", {
      selector: "[data-slot=files-viewer-name]",
    })
    const description = canvas.getByText("Git repository")
    await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth)
    await expect(description.scrollWidth).toBeGreaterThan(
      description.clientWidth
    )
  },
}

/**
 * In groups the app makes, each under its heading, in its order: in rows,
 * tiles (the heading on a row of its own) and the first column. The keys
 * pass the headings by; a file says its group to a screen reader.
 */
export const Groups: Story = {
  args: {
    name: "Recent",
    files: undefined,
    defaultSort: null,
    groups: [
      { key: "today", label: "Today", files: recent.slice(0, 3) },
      { key: "earlier", label: "Earlier", files: recent.slice(3) },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    const headings = () =>
      Array.from(
        canvasElement.querySelectorAll("[data-slot=files-viewer-group]")
      ).map((heading) => heading.textContent)
    await expect(headings()).toEqual(["Today", "Earlier"])
    await expect(row(canvas, /^plan\.csv/)).toHaveAttribute(
      "aria-description",
      "Earlier"
    )
    await userEvent.click(row(canvas, /^drafts/))
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(row(canvas, /^plan\.csv/)).toHaveFocus())

    await userEvent.click(canvas.getByRole("button", { name: "Grid" }))
    await waitFor(() => expect(headings()).toEqual(["Today", "Earlier"]))
    const earlier = canvasElement.querySelectorAll<HTMLElement>(
      "[data-slot=files-viewer-group]"
    )[1]!
    // The group's files start a row of their own, below its heading.
    await expect(
      option(canvas, /^plan\.csv/).getBoundingClientRect().top
    ).toBeGreaterThan(earlier.getBoundingClientRect().bottom - 1)
    await expect(
      Math.round(option(canvas, /^plan\.csv/).getBoundingClientRect().left)
    ).toBe(
      Math.round(option(canvas, /^notes\.md/).getBoundingClientRect().left)
    )

    await userEvent.click(canvas.getByRole("button", { name: "Columns" }))
    await waitFor(() => expect(headings()).toEqual(["Today", "Earlier"]))
  },
}

/** A folder still loading says so under it. */
export const Loading: Story = {
  args: {
    files: [{ id: "src", name: "src", directory: true }],
  },
  play: async ({ canvas }) => {
    await userEvent.dblClick(row(canvas, /^src/))
    await expect(await canvas.findByText("Loading…")).toBeVisible()
  },
}

/**
 * Folders opened, not expanded: Enter and a double click on one call
 * `onOpen`, as a file manager goes into it; the disclosure and the right
 * arrow still expand it. The columns open it the same way.
 */
export const OpenFolders: Story = {
  args: { folderAction: "open", selected: "src" },
  play: async ({ args, canvas }) => {
    row(canvas, /^src/).focus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onOpen).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "src" })
    )
    await expect(row(canvas, /^src/)).toHaveAttribute("aria-expanded", "false")
    await userEvent.keyboard("{ArrowRight}")
    await expect(row(canvas, /^src/)).toHaveAttribute("aria-expanded", "true")
    await userEvent.dblClick(row(canvas, /^lib/))
    await expect(args.onOpen).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "src/lib" })
    )

    await userEvent.click(canvas.getByRole("button", { name: "Columns" }))
    await userEvent.click(option(canvas, /^public/))
    await userEvent.keyboard("{Enter}")
    await expect(args.onOpen).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "public" })
    )
  },
}

const none: readonly ViewerFile[] = []

/** Each file and folder under one, with the path of the folder it is in. */
function flatten(
  level: readonly ViewerFile[],
  parent = ""
): { file: ViewerFile; parent: string }[] {
  return level.flatMap((file) => [
    { file, parent },
    ...flatten(file.children ?? [], file.id),
  ])
}

/**
 * A workspace's search, as an app has it: the field the viewer's, the
 * matching a server's (`filtering="manual"`), recursive and debounced;
 * the results flat, each with the folder it is in, the query lit in its
 * name. A folder found opens (`folderAction="open"`): the app leaves the
 * search and goes into it. Escape clears the search and goes back.
 */
export const SearchResults: Story = {
  render: (args) => {
    const [folder, setFolder] = React.useState<string | null>(null)
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<readonly ViewerFile[]>([])
    const [searching, setSearching] = React.useState(false)
    const [selected, setSelected] = React.useState<string | null>(null)
    const here = folder
      ? flatten(workspace).find((each) => each.file.id === folder)?.file
      : undefined
    const level = here ? (here.children ?? none) : workspace
    React.useEffect(() => {
      const term = query.trim().toLowerCase()
      if (!term) return
      // The server's, as slow as one: a request a moment after typing stops.
      const timer = setTimeout(() => {
        setResults(
          flatten(level)
            .filter(({ file }) => file.name.toLowerCase().includes(term))
            .map(({ file, parent }) => ({
              ...file,
              children: undefined,
              description: parent || "agentui",
            }))
        )
        setSearching(false)
      }, 300)
      return () => clearTimeout(timer)
    }, [query, level])
    return (
      <FilesViewer
        name={here?.name ?? "agentui"}
        now={now}
        files={query ? results : level}
        selected={selected}
        onSelect={(file) => setSelected(file.id)}
        query={query}
        onQueryChange={(next) => {
          setQuery(next)
          setSearching(next.trim() !== "")
          if (!next) setResults([])
        }}
        filtering="manual"
        searching={searching}
        folderAction={query ? "open" : "expand"}
        onBack={folder ? () => setFolder(null) : undefined}
        onOpen={(file) => {
          args.onOpen?.(file)
          if (!file.directory) return
          setQuery("")
          setResults([])
          setFolder(file.id)
          setSelected(null)
        }}
      />
    )
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }))
    const input = await canvas.findByRole("textbox", { name: "Filter" })
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.type(input, "li")
    // Pending: said in the status bar until the results come.
    await expect(canvas.getAllByText("Searching…")[0]).toBeVisible()
    await waitFor(() =>
      expect(
        canvas.getAllByRole("treeitem").map((item) => item.textContent)
      ).toEqual([
        expect.stringMatching(/^libsrc/),
        expect.stringMatching(/^publicagentui/),
      ])
    )
    await expect(row(canvas, /^lib/).querySelector("mark")).toHaveTextContent(
      "li"
    )
    // The field in the toolbar, in the path's place, how many it found in
    // it; the results a flat list, without the columns' header or a
    // folder's disclosure.
    const field = input.closest<HTMLElement>("[data-slot=viewer-filter]")!
    await expect(field.parentElement).toHaveAttribute(
      "data-slot",
      "viewer-toolbar"
    )
    await expect(canvas.queryByRole("navigation", { name: /^Path/ })).toBeNull()
    await expect(field).toHaveTextContent("2 results")
    await expect(
      document.querySelector("[data-slot=files-viewer-header]")
    ).not.toBeVisible()
    await expect(row(canvas, /^lib/)).not.toHaveAttribute("aria-expanded")
    await waitFor(() =>
      expect(row(canvas, /^lib/)).toHaveAttribute("aria-selected", "true")
    )
    await expect(within(row(canvas, /^lib/)).getByText("↵")).toBeVisible()
    await expect(within(row(canvas, /^lib/)).getByText("Open")).toBeVisible()
    await expect(within(row(canvas, /^public/)).queryByText("Open")).toBeNull()
    await expect(canvas.getByText("In agentui")).toBeVisible()
    await expect(canvas.getByText("↑↓ move · ↵ open · Esc clear")).toBeVisible()
    await expect(canvas.getByText("2 of 2 items")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Filter" })).toBeNull()
    await expect(input).toBeVisible()
    // Move the selection while keeping the field ready for typing.
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(row(canvas, /^public/)).toHaveAttribute("aria-selected", "true")
    )
    await expect(input).toHaveFocus()
    await expect(within(row(canvas, /^lib/)).queryByText("Open")).toBeNull()
    await expect(within(row(canvas, /^public/)).getByText("Open")).toBeVisible()
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() =>
      expect(row(canvas, /^lib/)).toHaveAttribute("aria-selected", "true")
    )
    await expect(input).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onOpen).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "src/lib" })
    )
    // In it, the search left.
    await waitFor(() =>
      expect(canvas.queryByRole("textbox", { name: "Filter" })).toBeNull()
    )
    await expect(row(canvas, /^debounce\.ts/)).toBeVisible()

    // Nothing found, then Escape: back to the folder.
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }))
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Filter" }),
      "zzz"
    )
    await expect(await canvas.findByText("No matches")).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.queryByRole("textbox", { name: "Filter" })).toBeNull()
    )
    await expect(row(canvas, /^utils\.ts/)).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(row(canvas, /^src/)).toBeVisible()
  },
}

const disabledSelected = fn()

/**
 * Entries shown but not pickable (`disabled`), e.g. files where only a
 * folder can be chosen: a click does nothing, the arrow keys pass them by.
 */
export const Disabled: Story = {
  render: function Render() {
    const [selected, setSelected] = React.useState<string | null>(null)
    return (
      <FilesViewer
        name="Folders"
        files={[
          { id: "a", name: "alpha", directory: true, children: [] },
          {
            id: "b",
            name: "beta",
            directory: true,
            disabled: true,
            children: [],
          },
          { id: "c", name: "charlie", directory: true, children: [] },
          { id: "d", name: "notes.txt", disabled: true },
        ]}
        selected={selected}
        onSelect={(file) => {
          disabledSelected(file)
          setSelected(file.id)
        }}
      />
    )
  },
  play: async ({ canvas }) => {
    disabledSelected.mockClear()
    const disabled = await canvas.findByRole("treeitem", { name: /^beta/ })
    await expect(disabled).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(disabled)
    await expect(disabled).toHaveAttribute("aria-selected", "false")
    await expect(disabledSelected).not.toHaveBeenCalled()
    await userEvent.click(row(canvas, /^alpha/))
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(row(canvas, /^charlie/)).toHaveFocus())
    await expect(disabledSelected).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "b" })
    )
  },
}

const manyFolders: ViewerFile[] = Array.from({ length: 500 }, (_, index) => ({
  id: `folder-${index}`,
  name: `folder-${String(index).padStart(3, "0")}`,
  directory: true,
  children: [],
}))

/**
 * A column of hundreds of folders: only the rows in view are drawn, and
 * a key that picks far off (End, Home) brings the picked one into view.
 */
export const LongColumn: Story = {
  args: { defaultView: "columns", files: manyFolders },
  play: async ({ canvas }) => {
    const column = await canvas.findByRole("listbox", { name: "agentui" })
    await expect(within(column).getAllByRole("option").length).toBeLessThan(100)
    await userEvent.click(
      within(column).getByRole("option", { name: "folder-000" })
    )
    await userEvent.keyboard("{End}")
    await waitFor(() =>
      expect(
        within(column).getByRole("option", { name: "folder-499" })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{Home}")
    await waitFor(() =>
      expect(
        within(column).getByRole("option", { name: "folder-000" })
      ).toHaveFocus()
    )
  },
}

const manyFiles: ViewerFile[] = Array.from({ length: 500 }, (_, index) => ({
  id: `file-${index}`,
  name: `file-${String(index).padStart(3, "0")}.txt`,
  size: 100 + index,
}))

/**
 * A long list, walked by the arrow keys: each row picked is wholly in
 * view, the list's padding past it too, going down as going up.
 */
export const LongListInView: Story = {
  args: { files: manyFiles },
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("tree", { name: "agentui" })
    const rowOf = (name: string) =>
      row(canvas, new RegExp(`^${name.replace(".", "\\.")}`))
    await userEvent.click(rowOf("file-000.txt"))
    // Its padding past the row too: the row's edge never in it.
    const inView = (name: string) => {
      const box = rowOf(name).getBoundingClientRect()
      const view = list.getBoundingClientRect()
      const style = getComputedStyle(list)
      const top = view.top + list.clientTop + parseFloat(style.paddingTop)
      const bottom =
        view.top +
        list.clientTop +
        list.clientHeight -
        parseFloat(style.paddingBottom)
      expect(box.top).toBeGreaterThanOrEqual(top - 0.5)
      expect(box.bottom).toBeLessThanOrEqual(bottom + 0.5)
    }
    for (let index = 1; index <= 30; index++) {
      await userEvent.keyboard("{ArrowDown}")
      const name = `file-${String(index).padStart(3, "0")}.txt`
      await waitFor(() => expect(rowOf(name)).toHaveFocus())
      await waitFor(() => inView(name))
    }
    for (let index = 29; index >= 0; index -= 1) {
      await userEvent.keyboard("{ArrowUp}")
      const name = `file-${String(index).padStart(3, "0")}.txt`
      await waitFor(() => expect(rowOf(name)).toHaveFocus())
      await waitFor(() => inView(name))
    }
  },
}

/**
 * The picked one far down, the view changed: in view in each, as Finder
 * keeps it (the grid's, as it first lays out).
 */
export const PickedInViewAcrossViews: Story = {
  args: { files: manyFiles, selected: "file-480" },
  play: async ({ canvas, canvasElement }) => {
    const picked = () =>
      canvasElement.querySelector<HTMLElement>('[data-file="file-480"]')
    const inView = () => {
      const element = picked()
      expect(element).not.toBeNull()
      const box = element!.getBoundingClientRect()
      let scroller = element!.parentElement!
      while (
        scroller.scrollHeight <= scroller.clientHeight &&
        scroller.scrollWidth <= scroller.clientWidth
      )
        scroller = scroller.parentElement!
      const view = scroller.getBoundingClientRect()
      expect(box.top).toBeGreaterThanOrEqual(view.top - 0.5)
      expect(box.bottom).toBeLessThanOrEqual(view.bottom + 0.5)
      expect(box.left).toBeGreaterThanOrEqual(view.left - 0.5)
      expect(box.right).toBeLessThanOrEqual(view.right + 0.5)
    }
    await waitFor(inView)
    for (const view of ["Grid", "List", "Columns", "Gallery", "Grid"]) {
      await userEvent.click(canvas.getByRole("button", { name: view }))
      await waitFor(inView)
    }
  },
}

/**
 * Sorted by size or date, either way, the files of the same size or
 * date are by name, A to Z, as Finder has them; only by name does the
 * order turn the names round.
 */
export const SortTiesByName: Story = {
  args: {
    name: "same",
    files: [
      { id: "b.txt", name: "b.txt", size: 10 },
      { id: "big.bin", name: "big.bin", size: 900 },
      { id: "a.txt", name: "a.txt", size: 10 },
      { id: "c.txt", name: "c.txt", size: 10 },
    ],
    sort: { by: "size", descending: true },
  },
  play: async ({ canvas }) => {
    const names = () =>
      canvas
        .getAllByRole("treeitem")
        .map((item) => item.querySelector("[data-slot=files-viewer-name]")!)
        .map((name) => name.textContent)
    await expect(names()).toEqual(["big.bin", "a.txt", "b.txt", "c.txt"])
  },
}

/**
 * The list's columns only where a file has them: here no file says
 * when it changed, so no "Modified" column of dashes; the sizes stay.
 */
export const ColumnsByData: Story = {
  args: {
    name: "downloads",
    files: [
      { id: "old", name: "old", directory: true, children: [] },
      { id: "setup.zip", name: "setup.zip", size: 48_000_000 },
      { id: "notes.txt", name: "notes.txt", size: 812 },
    ],
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Sort by Size" })
    ).toBeVisible()
    await expect(
      canvas.queryByRole("button", { name: "Sort by Modified" })
    ).toBeNull()
    const header = canvas
      .getByRole("button", { name: "Sort by Size" })
      .closest<HTMLElement>("[data-slot=files-viewer-header]")!
    // Two columns, in the header and in each row alike.
    await expect(
      getComputedStyle(header).gridTemplateColumns.split(" ")
    ).toHaveLength(2)
    const zip = row(canvas, /^setup\.zip/)
    await expect(
      getComputedStyle(zip).gridTemplateColumns.split(" ")
    ).toHaveLength(2)
    await expect(zip).toHaveTextContent("45.8 MB")
  },
}

/** Folders alone: no column but their names. */
export const FoldersOnly: Story = {
  args: {
    name: "code",
    files: [
      { id: "agentui", name: "agentui", directory: true, children: [] },
      { id: "vesper", name: "vesper", directory: true, children: [] },
    ],
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("button", { name: "Sort by Size" })
    ).toBeNull()
    await expect(
      canvas.queryByRole("button", { name: "Sort by Modified" })
    ).toBeNull()
    await expect(row(canvas, /^agentui/)).not.toHaveTextContent("—")
  },
}

const someDisabled = assets.map((file, index) =>
  index === 1 ? { ...file, disabled: true } : file
)

/**
 * Disabled tiles in the gallery's strip and in the grid: the arrow keys,
 * Home and End pass them by.
 */
export const DisabledTiles: Story = {
  args: {
    name: "assets",
    files: someDisabled,
    defaultView: "gallery",
    defaultSort: null,
    selected: someDisabled[0]!.id,
  },
  play: async ({ canvas }) => {
    const [first, disabled, third] = someDisabled
    const tile = (file: ViewerFile) =>
      canvas.getByRole("option", {
        name: new RegExp(`^${file.name.replace(".", "\\.")}`),
      })
    await expect(tile(disabled!)).toHaveAttribute("aria-disabled", "true")
    tile(first!).focus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(tile(third!)).toHaveFocus())
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() => expect(tile(first!)).toHaveFocus())
    await expect(tile(disabled!)).toHaveAttribute("aria-selected", "false")
    // The grid, the same.
    await userEvent.click(canvas.getByRole("button", { name: "Grid" }))
    await waitFor(() => expect(tile(first!)).toBeVisible())
    tile(first!).focus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(tile(third!)).toHaveFocus())
  },
}

export const CountLevel: Story = {
  render: () => (
    <FilesViewer
      name="Folders"
      files={[
        {
          id: "parent",
          name: "parent",
          directory: true,
          children: [{ id: "child", name: "child", status: "M" }],
        },
        { id: "other", name: "other", directory: true, children: [] },
      ]}
      selected={null}
      onSelect={() => {}}
      count="level"
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2 items")).toBeVisible()
    await expect(canvas.queryByText(/changed/)).not.toBeInTheDocument()
  },
}

const levelFiles: ViewerFile[] = [
  {
    id: "parent",
    name: "parent",
    directory: true,
    children: [
      { id: "alpha", name: "alpha", directory: true, children: [] },
      { id: "beta", name: "beta", directory: true, children: [] },
      { id: "disabled", name: "alphablocked", disabled: true },
    ],
  },
  { id: "other", name: "other", directory: true, children: [] },
]
function LevelDemo({ view }: { view: "columns" | "list" }) {
  const [prefix, setPrefix] = React.useState("Ａ")
  const [selected, setSelected] = React.useState("parent")
  return (
    <>
      <input
        aria-label="Prefix"
        value={prefix}
        onChange={(event) => setPrefix(event.target.value)}
      />
      <FilesViewer
        name="Folders"
        files={levelFiles}
        selected={selected}
        onSelect={(file) => setSelected(file.id)}
        defaultExpanded={["parent"]}
        defaultView={view}
        levelFilter={{ folder: "parent", prefix }}
      />
    </>
  )
}
// Up from alpha: the column has only it; the tree goes up to "parent".
const levelPlay =
  (afterUp: string): Story["play"] =>
  async ({ canvas }) => {
    const entry = (name: string) =>
      canvas.queryByRole("option", { name }) ??
      canvas.queryByRole("treeitem", { name })
    await waitFor(() => expect(entry("alpha")).toBeVisible())
    await expect(entry("beta")).toBeNull()
    await expect(entry("alphablocked")).toBeNull()
    await expect(entry("other")).toBeVisible()
    await expect(entry("parent")).toBeVisible()
    await expect(canvas.getByText("1 of 3 items")).toBeVisible()
    await expect(canvas.queryByText("No matches")).toBeNull()
    await expect(canvas.getByRole("button", { name: "Filter" })).toBeVisible()
    await expect(canvas.queryByRole("textbox", { name: "Filter" })).toBeNull()
    await userEvent.click(entry("alpha")!)
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() => expect(entry(afterUp)).toHaveFocus())
    const prefix = canvas.getByRole("textbox", { name: "Prefix" })
    await userEvent.clear(prefix)
    await userEvent.type(prefix, "zz")
    await expect(await canvas.findByText("No matches")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }))
    const filter = await canvas.findByRole("textbox", { name: "Filter" })
    await userEvent.type(filter, "beta")
    await waitFor(() => expect(entry("beta")).toBeVisible())
    await expect(entry("other")).toBeNull()
    await expect(canvas.queryByText("No matches")).toBeNull()
    await userEvent.clear(filter)
    await expect(await canvas.findByText("No matches")).toBeVisible()
  }
export const LevelFilter: Story = {
  render: () => <LevelDemo view="columns" />,
  play: levelPlay("alpha"),
}
export const LevelFilterList: Story = {
  render: () => <LevelDemo view="list" />,
  play: levelPlay("parent"),
}

function FlatListDemo() {
  const [current, setCurrent] = React.useState<ViewerFile | null>(null)
  const [selected, setSelected] = React.useState<string | null>(null)
  const [loaded, setLoaded] = React.useState(false)
  const root: ViewerFile = { id: "folder", name: "folder", directory: true }
  return (
    <div className="flex h-96 w-full flex-col">
      <Button variant="outline" onClick={() => setLoaded(true)}>
        Finish loading
      </Button>
      <FilesViewer
        name={current?.name ?? "Home"}
        path={
          current
            ? [
                {
                  label: "Home",
                  onSelect: () => {
                    setCurrent(null)
                    setSelected("folder")
                  },
                },
              ]
            : undefined
        }
        files={
          current
            ? loaded
              ? [{ id: "child", name: "child", directory: true, children: [] }]
              : []
            : [root]
        }
        selected={selected}
        onSelect={(entry) => setSelected(entry.id)}
        tree={false}
        openOn="click"
        folderAction="open"
        views={["list"]}
        onOpen={(entry) => {
          setCurrent(entry)
          setSelected(null)
        }}
        onUp={() => {
          setCurrent(null)
          setSelected("folder")
        }}
        loading={!!current && !loaded}
      />
    </div>
  )
}
export const FlatList: Story = {
  render: () => <FlatListDemo />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("listbox", { name: "Home" })).toBeVisible()
    const folder = canvas.getByRole("option", { name: "folder" })
    await expect(folder).not.toHaveAttribute("aria-expanded")
    await expect(
      folder.querySelector('svg[aria-hidden="true"].ms-auto')
    ).toBeInTheDocument()
    await userEvent.click(folder)
    await expect(await canvas.findByText("Loading…")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Finish loading" })
    )
    const child = await canvas.findByRole("option", { name: "child" })
    child.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: "folder" })).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: "child" })).toHaveFocus()
    )
    await userEvent.keyboard("{Backspace}")
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: "folder" })).toHaveFocus()
    )
  },
}

export const ColumnsResize: Story = {
  args: { defaultView: "columns" },
  play: async ({ canvas }) => {
    const handles = () => canvas.getAllByRole("separator", { name: /^Resize/ })
    const first = handles()[0]!
    await expect(first).toHaveAccessibleName("Resize agentui column")
    await expect(first).toHaveClass("pointer-coarse:hidden")
    first.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(first).toHaveAttribute("aria-valuenow", "192")
    await userEvent.keyboard("{ArrowLeft}")
    await expect(first).toHaveAttribute("aria-valuenow", "176")
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}")
    await expect(first).toHaveAttribute("aria-valuenow", "240")
    await userEvent.keyboard("{Home}")
    await expect(first).toHaveAttribute("aria-valuenow", "160")
    await userEvent.keyboard("{End}")
    await expect(first).toHaveAttribute("aria-valuenow", "480")
    await userEvent.dblClick(first)
    await expect(first).toHaveAttribute("aria-valuenow", "176")
    first.focus()
    await userEvent.keyboard("{ArrowRight}{Enter}")
    await expect(first).toHaveAttribute("aria-valuenow", "176")
    await expect(
      canvas.queryAllByRole("option", { selected: true })
    ).toHaveLength(0)
    await userEvent.click(option(canvas, /^src/))
    await userEvent.click(option(canvas, /^lib/))
    await expect(handles()).toHaveLength(3)
    handles()[2]!.focus()
    await userEvent.keyboard("{ArrowRight}{ArrowLeft}")
    await expect(option(canvas, /^lib/)).toHaveAttribute(
      "aria-selected",
      "true"
    )
    const column = canvas.getByRole("listbox", { name: "agentui" })
    const start = column.getBoundingClientRect().width
    const pointer = (type: string, clientX: number, buttons = 1) =>
      first.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons,
          pointerId: 1,
          clientX,
          clientY: 100,
        })
      )
    pointer("pointerdown", 100)
    pointer("pointermove", 140)
    await expect(Math.round(column.getBoundingClientRect().width)).toBe(
      Math.round(start + 40)
    )
    await expect(first).toHaveAttribute("aria-valuenow", "216")
    pointer("pointercancel", 140, 0)
    await expect(Math.round(column.getBoundingClientRect().width)).toBe(176)
    pointer("pointerdown", 100)
    pointer("pointermove", 180)
    first.focus()
    await userEvent.keyboard("{Escape}")
    await expect(first).toHaveAttribute("aria-valuenow", "176")
    pointer("pointerdown", 100)
    pointer("pointermove", 400)
    pointer("pointerup", 400, 0)
    // It stops at the room the other columns leave: all three still shown.
    const widest = Number(first.getAttribute("aria-valuemax"))
    await expect(widest).toBeLessThan(480)
    await expect(first).toHaveAttribute("aria-valuenow", String(widest))
    await expect(canvas.getByRole("listbox", { name: "agentui" })).toBeVisible()
    await expect(handles()).toHaveLength(3)
    // End on a middle column: as wide as there is room, still shown and
    // still focused.
    await userEvent.dblClick(first)
    const middle = handles()[1]!
    middle.focus()
    await userEvent.keyboard("{End}")
    await expect(middle).toHaveAttribute(
      "aria-valuenow",
      middle.getAttribute("aria-valuemax")
    )
    await expect(canvas.getByRole("listbox", { name: "agentui" })).toBeVisible()
    await expect(canvas.getByRole("listbox", { name: "lib" })).toBeVisible()
    await expect(middle).toHaveFocus()
  },
}

export const ColumnWidthsControlled: Story = {
  args: {
    defaultView: "columns",
    columnWidths: { 0: 240 },
    onColumnWidthsChange: fn(),
  },
  play: async ({ canvas, args }) => {
    const column = canvas.getByRole("listbox", { name: "agentui" })
    const handle = canvas.getByRole("separator", {
      name: "Resize agentui column",
    })
    await expect(Math.round(column.getBoundingClientRect().width)).toBe(240)
    await expect(handle).toHaveAttribute("aria-valuenow", "240")
    handle.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(args.onColumnWidthsChange).toHaveBeenCalledWith({ 0: 256 })
    await expect(handle).toHaveAttribute("aria-valuenow", "240")
    await expect(Math.round(column.getBoundingClientRect().width)).toBe(240)
  },
}

export const NoResizeOutsideColumns: Story = {
  args: { defaultView: "list" },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("separator", { name: /^Resize/ })
    ).toBeNull()
    for (const name of ["Grid", "Gallery"]) {
      await userEvent.click(canvas.getByRole("button", { name }))
      await expect(
        canvas.queryByRole("separator", { name: /^Resize/ })
      ).toBeNull()
    }
  },
}
