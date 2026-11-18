import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Cancel01Icon,
  Clock01Icon,
  Copy01Icon,
  Download01Icon,
  File01Icon,
  FileNotFoundIcon,
  FileSearchIcon,
  FileZipIcon,
  PresentationBarChart01Icon,
  RefreshIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent, waitFor, within } from "storybook/test"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { asCoarse, coarseHitSize } from "@/stories/touch"

const meta = {
  title: "Components/Attachment",
  component: Attachment,
  decorators: [
    (Story) => (
      <div className="flex w-md max-w-full flex-col gap-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Attachment>

export default meta
type Story = StoryObj<typeof meta>

// Inline images keep the stories offline and deterministic.
function swatch(hue: number) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="hsl(${hue} 60% 55%)"/><circle cx="3" cy="1" r="0.6" fill="white"/></svg>`
  )}`
}

export const Default: Story = {
  render: () => (
    <Attachment className="w-full">
      <AttachmentMedia>
        <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>eval-report.pdf</AttachmentTitle>
        <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Download eval-report.pdf">
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(
      "[data-slot=attachment]"
    )!
    await expect(getComputedStyle(card).borderTopWidth).toBe("1px")
  },
}

export const ContentOnly: Story = {
  render: () => (
    <>
      <Attachment className="w-full">
        <AttachmentContent>
          <AttachmentTitle>Building accessible components</AttachmentTitle>
          <AttachmentDescription>react.dev · 8 min read</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Remove Building accessible components">
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
      <Attachment size="sm" className="w-48">
        <AttachmentContent>
          <AttachmentTitle>Tool use guide</AttachmentTitle>
        </AttachmentContent>
        <AttachmentTrigger
          render={<a href="#tool-use" aria-label="Open Tool use guide" />}
        />
      </Attachment>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Open Tool use guide" })
    ).toHaveAttribute("href", "#tool-use")
  },
}

const states = [
  {
    state: "idle",
    icon: <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />,
    title: "selected-file.pdf",
    description: "Ready to upload",
  },
  {
    state: "uploading",
    icon: <Spinner />,
    title: "design-system.zip",
    description: "Uploading · 64%",
  },
  {
    state: "processing",
    icon: <HugeiconsIcon icon={File01Icon} strokeWidth={2} />,
    title: "market-research.pdf",
    description: "Processing document",
  },
  {
    state: "error",
    icon: <HugeiconsIcon icon={FileNotFoundIcon} strokeWidth={2} />,
    title: "financial-model.xlsx",
    description: "Upload failed. Try again.",
  },
  {
    state: "done",
    icon: <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />,
    title: "uploaded-report.pdf",
    description: "Uploaded · 1.8 MB",
  },
] as const

export const States: Story = {
  render: () => (
    <>
      {states.map(({ state, icon, title, description }) => (
        <Attachment key={state} state={state} className="w-full">
          <AttachmentMedia>{icon}</AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{title}</AttachmentTitle>
            <AttachmentDescription>{description}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            {state === "error" ? (
              <AttachmentAction aria-label={`Retry ${title}`}>
                <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
              </AttachmentAction>
            ) : null}
            <AttachmentAction aria-label={`Remove ${title}`}>
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </>
  ),
}

export const Vertical: Story = {
  render: () => (
    <AttachmentGroup className="w-full">
      {states.map(({ state, icon, title }) => (
        <Attachment key={state} state={state} orientation="vertical">
          <AttachmentMedia>{icon}</AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{title}</AttachmentTitle>
            <AttachmentDescription>{state}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label={`Remove ${title}`}>
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  ),
}

export const Images: Story = {
  render: () => (
    <>
      <Attachment className="w-full">
        <AttachmentMedia variant="image">
          <img src={swatch(210)} alt="Workspace" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>workspace.png</AttachmentTitle>
          <AttachmentDescription>PNG · 1.2 MB</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Remove workspace.png">
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
      <Attachment state="uploading" className="w-full">
        <AttachmentMedia variant="image">
          <img src={swatch(30)} alt="Desk" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>desk.jpg</AttachmentTitle>
          <AttachmentDescription>Uploading · 72%</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <AttachmentGroup>
        {[150, 270, 330].map((hue) => (
          <Attachment key={hue} orientation="vertical">
            <AttachmentMedia variant="image">
              <img src={swatch(hue)} alt={`Swatch ${hue}`} />
            </AttachmentMedia>
          </Attachment>
        ))}
      </AttachmentGroup>
    </>
  ),
}

export const Sizes: Story = {
  render: () => (
    <>
      {(["default", "sm", "xs"] as const).map((size) => (
        <Attachment key={size} size={size} className="w-full">
          <AttachmentMedia>
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{size} attachment</AttachmentTitle>
            {size === "xs" ? null : (
              <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
            )}
          </AttachmentContent>
        </Attachment>
      ))}
    </>
  ),
}

const files = [
  {
    icon: <HugeiconsIcon icon={File01Icon} strokeWidth={2} />,
    title: "brand-deck.pdf",
    meta: "PDF · 3.1 MB",
  },
  {
    icon: <HugeiconsIcon icon={PresentationBarChart01Icon} strokeWidth={2} />,
    title: "brand-deck.key",
    meta: "Keynote · 9 MB",
  },
  {
    icon: <HugeiconsIcon icon={FileZipIcon} strokeWidth={2} />,
    title: "brand-assets.zip",
    meta: "ZIP · 4.2 MB",
  },
]

export const ScrollableGroup: Story = {
  render: () => (
    <AttachmentGroup className="w-full">
      {files.map(({ icon, title, meta }) => (
        <Attachment key={title} className="w-64">
          <AttachmentMedia>{icon}</AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{title}</AttachmentTitle>
            <AttachmentDescription>{meta}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`Download ${title}`}
              size="icon-sm"
              variant="secondary"
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await expect(
      canvas.getByRole("button", { name: "Download brand-assets.zip" })
    ).toHaveFocus()
  },
}

function RemovableAttachment() {
  const [visible, setVisible] = React.useState(true)
  if (!visible) {
    return (
      <Button variant="outline" onClick={() => setVisible(true)}>
        Restore attachment
      </Button>
    )
  }
  return (
    <Attachment className="w-full">
      <AttachmentMedia>
        <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>contract-review.pdf</AttachmentTitle>
        <AttachmentDescription>PDF · 820 KB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Download contract-review.pdf">
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
        </AttachmentAction>
        <AttachmentAction
          aria-label="Remove contract-review.pdf"
          onClick={() => setVisible(false)}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </AttachmentAction>
      </AttachmentActions>
      <AttachmentTrigger
        render={<a href="#contract" aria-label="Open contract-review.pdf" />}
      />
    </Attachment>
  )
}

/** The trigger covers the card; actions stay reachable above it. */
export const Triggers: Story = {
  render: () => (
    <>
      <RemovableAttachment />
      <Dialog>
        <Attachment className="w-full">
          <AttachmentMedia>
            <HugeiconsIcon icon={FileSearchIcon} strokeWidth={2} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>research-summary.pdf</AttachmentTitle>
            <AttachmentDescription>Open preview dialog</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Copy link">
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            </AttachmentAction>
          </AttachmentActions>
          <DialogTrigger
            render={
              <AttachmentTrigger aria-label="Preview research-summary.pdf" />
            }
          />
        </Attachment>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>research-summary.pdf</DialogTitle>
            <DialogDescription>
              Attachment triggers can open dialogs while actions remain
              reachable.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  ),
  play: async ({ canvas }) => {
    const body = within(document.body)

    const remove = canvas.getByRole("button", {
      name: "Remove contract-review.pdf",
    })
    remove.focus()
    await userEvent.keyboard("{Enter}")
    const restore = await canvas.findByRole("button", {
      name: "Restore attachment",
    })
    restore.focus()
    await userEvent.keyboard("{Enter}")
    await expect(
      await canvas.findByRole("link", { name: "Open contract-review.pdf" })
    ).toBeVisible()

    const preview = canvas.getByRole("button", {
      name: "Preview research-summary.pdf",
    })
    preview.focus()
    await userEvent.keyboard("{Enter}")
    const dialog = await body.findByRole("dialog", {
      name: "research-summary.pdf",
    })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(preview).toHaveFocus())
  },
}

/** Image tiles keep names accessible and actions above the preview trigger. */
function ScreenshotTiles() {
  const [files, setFiles] = React.useState([0, 1, 2, 3, 4, 5, 6])
  const group = React.useRef<HTMLDivElement>(null)
  const focusAt = React.useRef<number | null>(null)
  React.useLayoutEffect(() => {
    if (focusAt.current === null) return
    // The dialog's trigger renders the attachment's: a button on the tile.
    const triggers = group.current?.querySelectorAll<HTMLElement>(
      "[data-variant=tile] > button"
    )
    triggers?.[Math.min(focusAt.current, files.length - 1)]?.focus()
    focusAt.current = null
  }, [files])
  return (
    <AttachmentGroup ref={group} className="w-full gap-2">
      {files.map((id, index) => (
        <Dialog key={id}>
          <Attachment variant="tile">
            <AttachmentMedia variant="image">
              <img src={swatch(id * 45)} alt="" />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>Screenshot {id + 1}.png</AttachmentTitle>
            </AttachmentContent>
            <DialogTrigger
              render={
                <AttachmentTrigger aria-label={`Screenshot ${id + 1}.png`} />
              }
            />
            <AttachmentActions>
              <AttachmentAction
                aria-label={`Remove Screenshot ${id + 1}.png`}
                onClick={() => {
                  focusAt.current = index
                  setFiles(files.filter((file) => file !== id))
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Screenshot {id + 1}.png</DialogTitle>
              <DialogDescription>Image preview</DialogDescription>
            </DialogHeader>
            <img src={swatch(id * 45)} alt={`Screenshot ${id + 1}`} />
          </DialogContent>
        </Dialog>
      ))}
      <Attachment>
        <AttachmentMedia>
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Report.pdf</AttachmentTitle>
          <AttachmentDescription>PDF</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
    </AttachmentGroup>
  )
}

export const Tiles: Story = {
  render: () => <ScreenshotTiles />,
  play: async ({ canvas, canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>(
      "[data-slot=attachment-group]"
    )!
    const tile = group.querySelector<HTMLElement>("[data-variant=tile]")!
    const img = tile.querySelector("img")!
    await waitFor(() => {
      const box = tile.getBoundingClientRect()
      const picture = img.getBoundingClientRect()
      expect([box.width, box.height]).toEqual([64, 64])
      expect([
        picture.width,
        picture.height,
        picture.left - box.left,
        picture.top - box.top,
      ]).toEqual([62, 62, 1, 1])
      expect(getComputedStyle(tile).padding).toBe("0px")
    })
    await expect(group.scrollWidth).toBeGreaterThan(group.clientWidth)
    await expect(getComputedStyle(group).scrollSnapType).toContain("x")
    await expect(getComputedStyle(tile).scrollSnapAlign).toBe("start")
    await expect(canvas.getByText("Report.pdf")).toBeVisible()
    const actions = tile.querySelector<HTMLElement>(
      "[data-slot=attachment-actions]"
    )!
    await expect(getComputedStyle(actions).opacity).toBe("0")
    await expect(asCoarse(tile, () => getComputedStyle(actions).opacity)).toBe(
      "1"
    )
    const hit = coarseHitSize(
      within(tile).getByRole("button", { name: "Remove Screenshot 1.png" })
    )
    await expect(Math.min(hit.width, hit.height)).toBeGreaterThanOrEqual(44)
    await userEvent.tab()
    const trigger = canvas.getByRole("button", {
      name: "Screenshot 1.png",
    })
    await expect(trigger).toHaveFocus()
    await waitFor(() => expect(getComputedStyle(actions).opacity).toBe("1"))
    await expect(getComputedStyle(tile).boxShadow).not.toBe("none")
    await userEvent.keyboard("{Enter}")
    const body = within(document.body)
    const dialog = await body.findByRole("dialog", { name: "Screenshot 1.png" })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const TileRemoveByKeyboard: Story = {
  render: () => <ScreenshotTiles />,
  play: async ({ canvas }) => {
    await userEvent.tab()
    await userEvent.tab()
    const remove = canvas.getByRole("button", {
      name: "Remove Screenshot 1.png",
    })
    await expect(remove).toHaveFocus()
    await waitFor(() =>
      expect(getComputedStyle(remove.parentElement!).opacity).toBe("1")
    )
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: "Screenshot 1.png" })
      ).not.toBeInTheDocument()
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Screenshot 2.png" })
      ).toHaveFocus()
    )
  },
}

function TileStateExamples() {
  const description = React.useId()
  return (
    <AttachmentGroup>
      <Attachment variant="tile" state="uploading">
        <AttachmentMedia variant="image">
          <img src={swatch(210)} alt="" />
        </AttachmentMedia>
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-background/55"
        >
          <Spinner />
        </span>
        <AttachmentContent>
          <AttachmentTitle>Uploading.png</AttachmentTitle>
          <AttachmentDescription>Uploading · 64%</AttachmentDescription>
        </AttachmentContent>
        <AttachmentTrigger aria-label="Uploading.png" />
      </Attachment>
      <Attachment variant="tile" state="error">
        <AttachmentMedia variant="image">
          <img src={swatch(30)} alt="" />
        </AttachmentMedia>
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-background/55 text-destructive"
        >
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
        </span>
        <AttachmentContent>
          <AttachmentTitle>Failed.png</AttachmentTitle>
          <AttachmentDescription id={description}>
            Upload failed. Try again.
          </AttachmentDescription>
        </AttachmentContent>
        <AttachmentTrigger
          aria-label="Failed.png"
          aria-describedby={description}
        />
        <AttachmentActions>
          <AttachmentAction aria-label="Retry Failed.png">
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
          </AttachmentAction>
          <AttachmentAction aria-label="Remove Failed.png">
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </AttachmentGroup>
  )
}

export const TileStates: Story = {
  render: () => <TileStateExamples />,
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole("button", {
      name: "Failed.png",
    })
    await expect(trigger).toHaveAccessibleDescription(
      "Upload failed. Try again."
    )
    const tile = trigger.closest<HTMLElement>("[data-slot=attachment]")!
    await expect(getComputedStyle(tile).borderTopStyle).toBe("dashed")
    await expect(getComputedStyle(tile).borderTopColor).not.toBe(
      getComputedStyle(canvasElement.querySelector("[data-state=uploading]")!)
        .borderTopColor
    )
    await expect(
      getComputedStyle(tile.querySelector("[data-slot=attachment-actions]")!)
        .opacity
    ).toBe("1")
    await expect(
      canvas.getByRole("button", { name: "Retry Failed.png" })
    ).toBeVisible()
    await expect(
      canvasElement.querySelector("[data-slot=spinner]")
    ).toBeVisible()
  },
}
