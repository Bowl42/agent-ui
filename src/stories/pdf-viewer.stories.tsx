import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import { PdfViewer, type PdfPage } from "@/components/pdf-viewer"
import { Panel, PanelMenu } from "@/stories/panel"
import { fit, zoomIn } from "@/stories/viewer-menus"

// Pages as an app renders them, e.g. PDF.js's text layer: text on paper.
function Page({ number }: { number: number }) {
  return (
    <div className="px-14 py-16 text-[14px] leading-[22px]">
      <h4 className="mb-1 text-[23px] leading-8 font-semibold tracking-tight">
        {number === 1 ? "agentui" : `Release v0.1.9 · ${number}`}
      </h4>
      <p className="mb-6 text-zinc-500">agentui · November 2026</p>
      <p className="mb-3 text-zinc-700">
        This release moves the conversation and the right panel onto one surface
        and adds a rail of the app's areas beside the sidebar.
      </p>
      <p className="mb-3 text-zinc-700">
        The composer now queues a message while a turn runs; ⌘↵ interrupts.
        Every popover shares one row style.
      </p>
      <div className="my-5 border-t border-zinc-200">
        {[
          ["Bundle", "412 KB → 96 KB"],
          ["First load", "1.8 s → 0.9 s"],
          ["Components", "48"],
        ].map(([name, value]) => (
          <div
            key={name}
            className="flex justify-between border-b border-zinc-200 py-1.5"
          >
            <span>{name}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <p className="mb-3 text-zinc-700">
        The composer toolbar keeps four things in reach: attach, permission,
        model and send.
      </p>
      <p className="text-zinc-700">Breaking: the Preview tab is now Browser.</p>
    </div>
  )
}

function Thumbnail() {
  return (
    <span className="flex flex-col gap-[3px] px-1.5 py-2">
      {[70, 100, 100, 80, 100, 60].map((width, index) => (
        <i
          key={index}
          className="block h-0.5 rounded-[1px] bg-zinc-300"
          style={{ width: `${width}%` }}
        />
      ))}
    </span>
  )
}

const pages: PdfPage[] = Array.from({ length: 4 }, (_, index) => ({
  width: 595,
  height: 842,
  content: <Page number={index + 1} />,
  thumbnail: <Thumbnail />,
}))

const meta = {
  title: "Components/PDF Viewer",
  component: PdfViewer,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Panel>
        <Story />
      </Panel>
    ),
  ],
  args: {
    name: "release-notes.pdf",
    path: [{ label: "docs" }],
    pages,
    onBack: fn(),
    onAddToChat: fn(),
    download: fn(),
    details: ["1.4 MB"],
    menu: <PanelMenu />,
  },
} satisfies Meta<typeof PdfViewer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The app's pages, fitted to the width: the pages' rail, from page to
 * page by its buttons and the status bar's, zoom; a find bar marks what
 * it finds, going from one to the next.
 */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("PDF · 4 pages · 1.4 MB")).toBeVisible()
    const page = canvas.getByRole("status", { name: "Page 1 of 4" })
    await expect(page).toHaveTextContent("1 / 4")
    await userEvent.click(canvas.getByRole("button", { name: "Next page" }))
    await expect(
      canvas.getByRole("status", { name: "Page 2 of 4" })
    ).toBeVisible()
    const scroller = canvas.getByRole("document", {
      name: "release-notes.pdf",
    })
    await waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(400))
    const rail = canvas.getByRole("navigation", { name: "Pages" })
    await expect(rail).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Page 4 of 4" }))
    await expect(
      canvas.getByRole("button", { name: "Page 4 of 4" })
    ).toHaveAttribute("aria-current", "page")
    // Fitted: as wide as the room for it.
    const sheet = canvasElement.querySelector<HTMLElement>(
      "[data-slot=pdf-viewer-page]"
    )!
    await expect(sheet.getBoundingClientRect().width).toBeLessThan(595)
    await zoomIn(canvasElement)
    await waitFor(() =>
      expect(sheet.getBoundingClientRect().width).toBeGreaterThanOrEqual(595)
    )
    await fit(canvasElement)

    // Find: Ctrl+F in the pages, Enter to the next.
    scroller.focus()
    await userEvent.keyboard("{Control>}f{/Control}")
    const find = await canvas.findByRole("textbox", { name: "Find" })
    await waitFor(() => expect(find).toHaveFocus())
    // Floating at the top end, 12px in, 304px or the room less 12px a side.
    const bar = canvasElement.querySelector("[data-slot=viewer-find]")!
    const box = bar.getBoundingClientRect()
    const room = bar.parentElement!.getBoundingClientRect()
    await expect(Math.round(room.right - box.right)).toBe(12)
    await expect(Math.round(box.width)).toBe(Math.min(304, room.width - 24))
    await userEvent.type(find, "composer")
    await expect(await canvas.findByText("1 of 8")).toBeVisible()
    await userEvent.keyboard("{Enter}")
    await expect(await canvas.findByText("2 of 8")).toBeVisible()
    if ("highlights" in CSS)
      await expect(CSS.highlights.get("viewer-find")?.size).toBe(8)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(find).not.toBeInTheDocument())
  },
}

/**
 * Only a file: the browser's own PDF viewer in a frame, told the page and
 * zoom by its address.
 */
export const Native: Story = {
  args: {
    pages: undefined,
    // No PDF here: what the frame is told is the point.
    src: "about:blank",
    pageCount: 12,
  },
  play: async ({ canvas, canvasElement }) => {
    const frame = canvasElement.querySelector("iframe")!
    await expect(frame).toHaveAccessibleName("release-notes.pdf")
    await expect(frame.getAttribute("src")).toContain("#page=1&zoom=100")
    await userEvent.click(canvas.getByRole("button", { name: "Next page" }))
    await waitFor(() =>
      expect(frame.getAttribute("src")).toContain("#page=2&zoom=100")
    )
    await expect(canvas.queryByRole("button", { name: "Find" })).toBeNull()
  },
}
