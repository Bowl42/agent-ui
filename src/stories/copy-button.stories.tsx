import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  expect,
  mocked,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"

const meta = {
  title: "Components/Copy Button",
  component: CopyButton,
  args: { value: "It is keyed on the images' content now." },
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue(undefined)
    return () => writeText.mockRestore()
  },
} satisfies Meta<typeof CopyButton>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/**
 * It copies its value; its name, its tooltip and an announcement say
 * "Copied", then go back.
 */
export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    const copy = canvas.getByRole("button", { name: "Copy" })
    await userEvent.hover(copy)
    await expect(await body.findByText("Copy")).toBeInTheDocument()
    await userEvent.click(copy)
    await expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith(
      args.value
    )
    await waitFor(() => expect(copy).toHaveAccessibleName("Copied"))
    await expect(copy).toHaveAttribute("data-copied")
    await expect(canvasElement.querySelector("[aria-live]")).toHaveTextContent(
      "Copied"
    )
    await expect(
      body.getByText("Copied", { selector: "[data-slot=tooltip-content]" })
    ).toBeInTheDocument()
    await waitFor(() => expect(copy).toHaveAccessibleName("Copy"), {
      timeout: 3000,
    })
  },
}

/**
 * `showLabel`: its word beside the icon, no tooltip; as wide copied as
 * not, so what is beside it does not move.
 */
export const ShowLabel: Story = {
  args: { showLabel: true, variant: "outline" },
  play: async ({ args, canvas }) => {
    const copy = canvas.getByRole("button", { name: "Copy" })
    await expect(copy).toHaveTextContent("Copy")
    const width = copy.getBoundingClientRect().width
    await userEvent.click(copy)
    await expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith(
      args.value
    )
    await waitFor(() => expect(copy).toHaveAccessibleName("Copied"))
    await expect(copy.getBoundingClientRect().width).toBe(width)
    await expect(body.queryByRole("tooltip")).toBeNull()
    await expect(
      document.querySelector("[data-slot=tooltip-content]")
    ).toBeNull()
  },
}

/** `labels` name it in the app's language. */
export const Labels: Story = {
  args: { labels: { copy: "Antwort kopieren", copied: "Kopiert" } },
  play: async ({ canvas, canvasElement }) => {
    const copy = canvas.getByRole("button", { name: "Antwort kopieren" })
    await userEvent.click(copy)
    await waitFor(() => expect(copy).toHaveAccessibleName("Kopiert"))
    await expect(canvasElement.querySelector("[aria-live]")).toHaveTextContent(
      "Kopiert"
    )
  },
}

/**
 * When the clipboard refuses, nothing claims it was copied: it says it
 * could not, then goes back.
 */
export const Fails: Story = {
  beforeEach: () => {
    mocked(navigator.clipboard.writeText).mockRejectedValue(
      new DOMException("Denied", "NotAllowedError")
    )
  },
  play: async ({ canvas, canvasElement }) => {
    const copy = canvas.getByRole("button", { name: "Copy" })
    await userEvent.click(copy)
    await expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalled()
    await waitFor(() => expect(copy).toHaveAccessibleName("Could not copy"))
    await expect(copy).not.toHaveAttribute("data-copied")
    await expect(copy).toHaveAttribute("data-failed")
    // In the error colour, so it does not read as "close".
    const probe = document.createElement("span")
    probe.style.color = "var(--destructive)"
    canvasElement.append(probe)
    // The shown one of its icons, the last: the crossed circle.
    await expect(
      getComputedStyle(copy.querySelector("svg:last-child")!).color
    ).toBe(getComputedStyle(probe).color)
    probe.remove()
    await expect(canvasElement.querySelector("[aria-live]")).toHaveTextContent(
      "Could not copy"
    )
    await waitFor(() => expect(copy).toHaveAccessibleName("Copy"), {
      timeout: 3000,
    })
  },
}

function Streaming() {
  const [value, setValue] = React.useState("It is keyed")
  return (
    <div className="flex items-center gap-2">
      <CopyButton value={value} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setValue((text) => `${text} on the images.`)}
      >
        More
      </Button>
    </div>
  )
}

/**
 * Once its value has changed, e.g. as a reply streams, it no longer says
 * it was copied.
 */
export const ValueChanged: Story = {
  render: () => <Streaming />,
  play: async ({ canvas, canvasElement }) => {
    const copy = canvas.getByRole("button", { name: "Copy" })
    await userEvent.click(copy)
    await waitFor(() => expect(copy).toHaveAccessibleName("Copied"))
    await userEvent.click(canvas.getByRole("button", { name: "More" }))
    await expect(copy).toHaveAccessibleName("Copy")
    await expect(
      canvasElement.querySelector("[aria-live]")
    ).toBeEmptyDOMElement()
  },
}
