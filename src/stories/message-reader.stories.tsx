import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { GitBranchIcon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { CopyButton } from "@/components/copy-button"
import { Markdown } from "@/components/markdown"
import { MessageReader } from "@/components/message-reader"
import { releaseNotes } from "@/stories/samples"
import { frames } from "@/stories/wait"
import { Button } from "@/components/ui/button"

const meta = {
  title: "Components/Message Reader",
  component: MessageReader,
  parameters: { layout: "centered" },
} satisfies Meta<typeof MessageReader>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

function Reader({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Read
      </Button>
      <MessageReader
        open={open}
        onOpenChange={setOpen}
        title="Release notes for v0.1.9"
        description="Assistant · 2,140 words · 9 min"
        actions={
          <>
            <CopyButton value={releaseNotes} />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Branch from here"
            >
              <HugeiconsIcon icon={GitBranchIcon} strokeWidth={2} />
            </Button>
          </>
        }
        menu={
          <Button variant="ghost" size="icon-sm" aria-label="More">
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
          </Button>
        }
      >
        <Markdown mode="static">{releaseNotes}</Markdown>
      </MessageReader>
    </>
  )
}

/**
 * A long answer to read on its own: its outline beside it, how far the
 * reader is along the top, a search of its text alone, the app's
 * actions. Escape closes it, back on the button that opened it.
 */
export const Default: Story = {
  args: { open: false, onOpenChange: () => {}, title: "", children: null },
  render: () => <Reader defaultOpen={false} />,
  play: async ({ canvas }) => {
    const opener = canvas.getByRole("button", { name: "Read" })
    await userEvent.click(opener)
    const dialog = await body.findByRole("dialog", {
      name: "Release notes for v0.1.9",
    })
    const reader = within(dialog)
    // Once it has come in.
    await waitFor(() =>
      expect(
        reader.getByRole("navigation", { name: "On this answer" })
      ).toBeVisible()
    )

    // Its own search: Ctrl+F goes to it; Enter goes through the matches.
    // Once focus is in it.
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    )
    await userEvent.keyboard("{Control>}f{/Control}")
    const search = reader.getByRole("searchbox", { name: "Search in message" })
    await waitFor(() => expect(search).toHaveFocus())
    // Its words selected a frame after, to type over: typed after that.
    await frames()
    await userEvent.type(search, "pnpm theme")
    await expect(await reader.findByText("1 of 1")).toBeVisible()
    // A quiet filled field, 28px, as a filter's.
    const field = search.closest<HTMLElement>("[data-slot=input-group]")!
    // WebKit lays the inset dialog out to a ten-thousandth of a pixel.
    await expect(Math.round(field.getBoundingClientRect().height)).toBe(28)
    await expect(getComputedStyle(search).fontSize).toBe("12px")
    await userEvent.clear(search)
    await userEvent.type(search, "shadcn")
    const count = await reader.findByText(/^1 of \d+$/)
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(count).toHaveTextContent(/^2 of \d+$/))
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}")
    await waitFor(() => expect(count).toHaveTextContent(/^1 of \d+$/))
    await userEvent.clear(search)
    await userEvent.type(search, "nowhere to be found")
    await expect(await reader.findByText("No results")).toBeVisible()

    // A heading in the outline goes to its section.
    await userEvent.click(
      within(reader.getByRole("navigation")).getByRole("button", {
        name: "Breaking changes",
      })
    )
    await waitFor(() =>
      expect(
        reader.getByRole("heading", { name: "Breaking changes" })
      ).toHaveFocus()
    )

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(opener).toHaveFocus())
  },
}

/**
 * On a phone it is the whole screen: back, the title, the text, and a
 * bar with the outline, search, how far the reader is and the actions.
 */
export const Phone: Story = {
  args: Default.args,
  parameters: {
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
  render: () => <Reader />,
  play: async () => {
    const dialog = await body.findByRole("dialog", {
      name: "Release notes for v0.1.9",
    })
    const reader = within(dialog)
    // The whole screen.
    await waitFor(() =>
      expect(dialog.getBoundingClientRect().width).toBe(window.innerWidth)
    )
    await expect(reader.getByText(/^\d+%$/)).toBeVisible()
    // The app's ⋯ at the header's end, opposite back, as big.
    const more = reader.getByRole("button", { name: "More" })
    const back = reader.getByRole("button", { name: "Back" })
    await expect(more.getBoundingClientRect().width).toBe(44)
    await expect(
      Math.abs(
        more.getBoundingClientRect().top - back.getBoundingClientRect().top
      )
    ).toBeLessThan(1)
    await expect(
      window.innerWidth - more.getBoundingClientRect().right
    ).toBeCloseTo(back.getBoundingClientRect().left, 0)
    const searchButton = reader.getByRole("button", {
      name: "Search in message",
    })
    await userEvent.click(searchButton)
    // Pressed while the search shows, the pointer gone from it too.
    await userEvent.unhover(searchButton)
    await expect(getComputedStyle(searchButton).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)"
    )
    await waitFor(() =>
      expect(
        reader.getByRole("searchbox", { name: "Search in message" })
      ).toHaveFocus()
    )
    await userEvent.click(reader.getByRole("button", { name: "Outline" }))
    const nav = await body.findByRole("navigation", { name: "On this answer" })
    await userEvent.click(within(nav).getByRole("button", { name: "Next" }))
    await waitFor(() =>
      expect(reader.getByRole("heading", { name: "Next" })).toHaveFocus()
    )
    await userEvent.click(reader.getByRole("button", { name: "Back" }))
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/**
 * Its outline shows where the dialog is wide enough for it beside the
 * text, not by the window's width: in a window 1010px wide, too.
 */
export const SmallWindow: Story = {
  args: Default.args,
  parameters: {
    viewport: {
      options: {
        small: {
          name: "Small window",
          styles: { width: "1010px", height: "800px" },
          type: "desktop",
        },
      },
    },
  },
  globals: { viewport: { value: "small", isRotated: false } },
  render: () => <Reader />,
  play: async () => {
    const dialog = await body.findByRole("dialog", {
      name: "Release notes for v0.1.9",
    })
    await waitFor(() => expect(window.innerWidth).toBe(1010))
    await waitFor(() =>
      expect(
        within(dialog).getByRole("navigation", { name: "On this answer" })
      ).toBeVisible()
    )
    // Beside the text, not over it.
    const outline = dialog.querySelector("[data-slot=message-reader-outline]")!
    const text = dialog.querySelector("[data-slot=message-reader-content]")!
    await expect(outline.getBoundingClientRect().right).toBeLessThanOrEqual(
      text.getBoundingClientRect().left
    )
    // The app's ⋯ before close.
    const more = within(dialog).getByRole("button", { name: "More" })
    const close = within(dialog).getByRole("button", { name: "Close" })
    await expect(more.getBoundingClientRect().right).toBeLessThanOrEqual(
      close.getBoundingClientRect().left
    )
  },
}
