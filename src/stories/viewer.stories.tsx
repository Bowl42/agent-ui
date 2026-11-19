import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Eraser01Icon,
  File01Icon,
  FileZipIcon,
  ImageCropIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  ViewerEditButton,
  ViewerFrame,
  ViewerStatusButton,
  ViewerUnsupported,
} from "@/components/viewer"
import { Panel } from "@/stories/panel"
import { coarseHitSize } from "@/stories/touch"

const meta = {
  title: "Components/Viewer",
  component: ViewerFrame,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Panel>
        <Story />
      </Panel>
    ),
  ],
  args: {
    name: "notes.txt",
    icon: <HugeiconsIcon icon={File01Icon} strokeWidth={2} />,
    path: [{ label: "agentui", onSelect: fn() }, { label: "docs" }],
    onBack: fn(),
    onAddToChat: fn(),
    menu: (
      <>
        <DropdownMenuItem>Copy path</DropdownMenuItem>
        <DropdownMenuItem>Reveal in folder</DropdownMenuItem>
      </>
    ),
    controls: <ViewerStatusButton>Wrap</ViewerStatusButton>,
    facts: ["Text", "1.2 KB"],
    children: (
      <p className="p-4 text-sm">The viewer's content, to its edges.</p>
    ),
  },
} satisfies Meta<typeof ViewerFrame>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The skeleton every viewer has: back, the path (its folders go there),
 * the tools, "@", download and more above; the content to the edges; the
 * controls and the facts below.
 */
export const Default: Story = {
  args: { download: fn() },
  play: async ({ args, canvas }) => {
    const viewer = canvas.getByRole("region", { name: "notes.txt" })
    await userEvent.click(canvas.getByRole("button", { name: "Back" }))
    await expect(args.onBack).toHaveBeenCalled()
    const path = canvas.getByRole("navigation", { name: /^Path/ })
    await userEvent.click(within(path).getByRole("button", { name: "agentui" }))
    await expect(args.path![0]!.onSelect).toHaveBeenCalled()
    // The last of the path is its name, the page it is.
    await expect(within(path).getByRole("link")).toHaveTextContent("notes.txt")
    await userEvent.click(canvas.getByRole("button", { name: "Add to chat" }))
    await expect(args.onAddToChat).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Download" }))
    await expect(args.download).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "More" }))
    const menu = await within(document.body).findByRole("menu")
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Copy path" })
      ).toBeVisible()
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(menu).not.toBeInTheDocument())
    await expect(canvas.getByText("Text · 1.2 KB")).toBeVisible()
    // Content to the edges: as wide as the viewer.
    const content = viewer.querySelector("[data-slot=viewer-content]")!
    await expect(content.getBoundingClientRect().width).toBe(
      viewer.getBoundingClientRect().width
    )
    // A finger's place on each small button.
    for (const button of viewer.querySelectorAll<HTMLElement>(
      "[data-slot=viewer-tool]"
    ))
      await expect(coarseHitSize(button).width).toBeGreaterThanOrEqual(44)
  },
}

/**
 * A path deeper than its room, as a temporary folder's: the folders but
 * the nearest in a menu at its start, none cut to nothing.
 */
export const DeepPath: Story = {
  args: {
    name: "agentry-visual-a1b2c3",
    path: [
      { label: "var", onSelect: fn() },
      { label: "folders", onSelect: fn() },
      { label: "x9", onSelect: fn() },
      { label: "a1b2c3d4e5f6g7h8i9j0", onSelect: fn() },
      { label: "T", onSelect: fn() },
    ],
  },
  render: (args) => (
    <div className="w-80">
      <ViewerFrame {...args} />
    </div>
  ),
  play: async ({ args, canvas }) => {
    const path = canvas.getByRole("navigation", { name: /^Path/ })
    const above = await within(path).findByRole("button", {
      name: "Folders above",
    })
    // Each folder shown has its name in sight, not cut to nothing (to a
    // pixel: its width is a fraction, its scrollWidth whole).
    for (const name of path.querySelectorAll("[data-viewer-path-name]"))
      await expect(name.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        Math.min(name.scrollWidth, 16) - 1
      )
    await expect(within(path).getByRole("button", { name: "T" })).toBeVisible()
    await userEvent.click(above)
    const menu = await within(document.body).findByRole("menu")
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "a1b2c3d4e5f6g7h8i9j0" })
    )
    await expect(args.path![3]!.onSelect).toHaveBeenCalled()
  },
}

/**
 * The toolbar's islands, as a desktop chat app's: back and the path, as
 * wide as they are; then each group of its tools an island of its own
 * (the app's; add to chat, download and more): 36px high, on the page's
 * colour with a hairline, its buttons 28px; apart, no rule between. A
 * group that holds nothing is not there. No line under the toolbar.
 */
export const ToolGroups: Story = {
  args: {
    download: fn(),
    tools: (
      <Button variant="ghost" size="icon-sm" aria-label="Wrap lines">
        W
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    const region = canvas.getByRole("region", { name: "notes.txt" })
    const toolbar = region.querySelector<HTMLElement>(
      "[data-slot=viewer-toolbar]"
    )!
    const groups = [
      ...toolbar.querySelectorAll<HTMLElement>("[data-slot=viewer-tool-group]"),
    ].filter((group) => getComputedStyle(group).display !== "none")
    const named = (group: HTMLElement) =>
      [...group.querySelectorAll("button, a, nav")].map(
        (each) =>
          each.getAttribute("aria-label") ?? each.textContent?.trim() ?? ""
      )
    await expect(groups.map(named)).toEqual([
      ["Back", "Path, notes.txt", "agentui"],
      ["Wrap lines"],
      ["Add to chat", "Download", "More"],
    ])
    const pill = (element: HTMLElement) => {
      const style = getComputedStyle(element)
      return (
        style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        style.borderTopLeftRadius !== "0px"
      )
    }
    const tools = toolbar.querySelector<HTMLElement>(
      "[data-slot=viewer-tools]"
    )!
    // Each group an island of its own, 36px high, a hairline round it,
    // its buttons 28px; the tools not one island.
    for (const group of groups) {
      await expect(pill(group)).toBe(true)
      await expect(Math.round(group.getBoundingClientRect().height)).toBe(36)
      await expect(getComputedStyle(group).boxShadow).toMatch(/0px 0px 0px 1px/)
      for (const button of group.querySelectorAll<HTMLElement>(
        "[data-slot=viewer-tool]"
      ))
        await expect(button.getBoundingClientRect().height).toBe(28)
      await expect(getComputedStyle(group, "::before").width).not.toBe("1px")
    }
    await expect(pill(tools)).toBe(false)
    // Apart, not touching.
    await expect(
      groups[2]!.getBoundingClientRect().left -
        groups[1]!.getBoundingClientRect().right
    ).toBeGreaterThanOrEqual(4)
    // The path's pill as wide as it is, not the bar's room.
    await expect(groups[0]!.getBoundingClientRect().right).toBeLessThan(
      tools.getBoundingClientRect().left - 40
    )
    // No line between the toolbar and what it shows.
    const content = region.querySelector<HTMLElement>(
      "[data-slot=viewer-content]"
    )!
    await expect(getComputedStyle(content).borderTopWidth).toBe("0px")
  },
}

/**
 * More's menu closed with Escape: focus back on More, with no tooltip
 * over the buttons beside it; it shows again once the pointer is on it.
 */
export const MoreClosed: Story = {
  play: async ({ canvas }) => {
    const more = canvas.getByRole("button", { name: "More" })
    more.focus()
    await userEvent.keyboard("{Enter}")
    const menu = await within(document.body).findByRole("menu")
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(menu).not.toBeInTheDocument())
    await waitFor(() => expect(more).toHaveFocus())
    await expect(
      document.querySelector("[data-slot=tooltip-content]")
    ).toBeNull()
    await userEvent.hover(more)
    await waitFor(() =>
      expect(
        document.querySelector("[data-slot=tooltip-content]")
      ).toHaveTextContent("More")
    )
  },
}

/** A download that is a link to the file. */
export const DownloadLink: Story = {
  args: { download: "data:text/plain,hello", menu: undefined },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Download" })
    await expect(link).toHaveAttribute("download", "notes.txt")
    await expect(link).toHaveAttribute("href", "data:text/plain,hello")
  },
}

/** A file with no preview: what it is, and the app's way out. */
export const Unsupported: Story = {
  args: {
    name: "build.zip",
    icon: <HugeiconsIcon icon={FileZipIcon} strokeWidth={2} />,
    controls: undefined,
    facts: ["ZIP", "18.4 MB"],
    children: (
      <ViewerUnsupported
        icon={<HugeiconsIcon icon={FileZipIcon} strokeWidth={2} />}
      >
        <Button variant="outline" size="sm">
          Download
        </Button>
      </ViewerUnsupported>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No preview")).toBeVisible()
    await expect(
      canvas.getByText("This file cannot be shown here.")
    ).toBeVisible()
  },
}

/**
 * One of the app's others (a turn's files): round buttons to the one
 * before and after by its sides, "3 / 7" at its foot, in any viewer.
 */
export const AmongOthers: Story = {
  args: {
    position: { index: 3, count: 7 },
    onPrevious: fn(),
    onNext: fn(),
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Next" }))
    await expect(args.onNext).toHaveBeenCalledTimes(1)
    await userEvent.click(canvas.getByRole("button", { name: "Previous" }))
    await expect(args.onPrevious).toHaveBeenCalledTimes(1)
    const where = canvas.getByText("3 / 7")
    const content = where.closest<HTMLElement>("[data-slot=viewer-content]")!
    // At the foot of what it shows, in its middle.
    const box = where.getBoundingClientRect()
    const place = content.getBoundingClientRect()
    await expect(Math.round(place.bottom - box.bottom)).toBe(12)
    await expect(
      Math.abs(box.left + box.width / 2 - (place.left + place.width / 2))
    ).toBeLessThan(1)
    // Round, as the buttons by its sides.
    await expect(
      parseFloat(getComputedStyle(where).borderRadius)
    ).toBeGreaterThan(box.height)
  },
}

/** The first of them: no button to one before. */
export const AmongOthersFirst: Story = {
  args: { position: { index: 1, count: 7 }, onNext: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "Previous" })).toBeNull()
    await expect(canvas.getByRole("button", { name: "Next" })).toBeVisible()
    await expect(canvas.getByText("1 / 7")).toBeVisible()
  },
}

const edits = {
  edits: (
    <>
      <ViewerEditButton label="Erase" onClick={fn()}>
        <HugeiconsIcon icon={Eraser01Icon} strokeWidth={2} />
      </ViewerEditButton>
      <ViewerEditButton label="Resize" onClick={fn()}>
        <HugeiconsIcon icon={ImageCropIcon} strokeWidth={2} />
      </ViewerEditButton>
    </>
  ),
}

/**
 * The app's ways to change what it shows (`edits`): a floating bar at
 * the foot of the content, in its middle, a handle first to drag it
 * aside by (or its arrow keys; Escape puts it back), each way its icon
 * and its word.
 */
export const Edits: Story = {
  args: edits,
  play: async ({ canvas, canvasElement }) => {
    const bar = canvas.getByRole("toolbar", { name: "Edit" })
    const content = canvasElement
      .querySelector("[data-slot=viewer-content]")!
      .getBoundingClientRect()
    const box = bar.getBoundingClientRect()
    await expect(Math.round(content.bottom - box.bottom)).toBe(12)
    await expect(
      Math.abs(box.left + box.width / 2 - (content.left + content.width / 2))
    ).toBeLessThan(1)
    const erase = within(bar).getByRole("button", { name: "Erase" })
    await expect(erase).toHaveTextContent("Erase")
    const handle = within(bar).getByRole("button", { name: "Move the bar" })
    await expect(bar.firstElementChild).toBe(handle)
    // Dragged by its handle, kept within the content.
    const at = handle.getBoundingClientRect()
    const x = at.left + at.width / 2
    const y = at.top + at.height / 2
    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
      })
    )
    handle.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: x - 60,
        clientY: y - 2000,
        pointerId: 1,
      })
    )
    handle.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: x - 60,
        clientY: y - 2000,
        pointerId: 1,
      })
    )
    await waitFor(() => {
      const moved = bar.getBoundingClientRect()
      expect(Math.round(moved.left)).toBe(Math.round(box.left - 60))
      expect(Math.round(moved.top)).toBe(Math.round(content.top))
    })
    handle.focus()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(Math.round(bar.getBoundingClientRect().left)).toBe(
        Math.round(box.left)
      )
    )
  },
}

/** Narrow: its ways as icons alone, named still. */
export const EditsNarrow: Story = {
  args: edits,
  render: (args) => (
    <div className="h-full w-80">
      <ViewerFrame {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const erase = canvas.getByRole("button", { name: "Erase" })
    const label = erase.querySelector("[data-slot=viewer-edit-label]")!
    await expect(getComputedStyle(label).display).toBe("none")
  },
}

/** None of them: no bar. */
export const NoEdits: Story = {
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector("[data-slot=viewer-edit-bar]")!
    await expect(getComputedStyle(bar).display).toBe("none")
  },
}
