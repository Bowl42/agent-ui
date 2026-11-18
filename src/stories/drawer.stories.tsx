import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { windowOf } from "@/stories/phone"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

const meta = {
  title: "Components/Drawer",
  component: Drawer,
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Move goal
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Move goal</DrawerTitle>
          <DrawerDescription>Set the daily token budget.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <div className="h-40 w-full bg-muted" />
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose render={<Button variant="outline" />}>
            Cancel
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Move goal" })
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{Enter}")

    const drawer = await body.findByRole("dialog", { name: "Move goal" })
    await expect(drawer).toHaveAccessibleDescription(
      "Set the daily token budget."
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())

    await userEvent.keyboard("{Enter}")
    const reopened = await body.findByRole("dialog", { name: "Move goal" })
    await userEvent.click(
      within(reopened).getByRole("button", { name: "Cancel" })
    )
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

const directions = ["up", "right", "down", "left"] as const

export const Position: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {directions.map((direction) => (
        <Drawer key={direction} swipeDirection={direction}>
          <DrawerTrigger
            render={<Button variant="outline" className="capitalize" />}
          >
            {direction}
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Move goal</DrawerTitle>
              <DrawerDescription>Set the daily token budget.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 p-4">
              <div className="bg-muted group-data-[swipe-axis=x]/drawer-popup:size-full group-data-[swipe-axis=y]/drawer-popup:h-40 group-data-[swipe-axis=y]/drawer-popup:w-full" />
            </div>
            <DrawerFooter>
              <Button>Submit</Button>
              <DrawerClose render={<Button variant="outline" />}>
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const direction of directions) {
      await userEvent.click(canvas.getByRole("button", { name: direction }))
      const drawer = await body.findByRole("dialog", { name: "Move goal" })
      await expect(drawer).toHaveAttribute("data-swipe-direction", direction)
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    }
  },
}

export const SwipeHandle: Story = {
  render: () => (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button variant="outline" />}>
        With handle
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer</DrawerTitle>
          <DrawerDescription>Drawer with a swipe handle.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <div className="h-40 w-full bg-muted" />
        </div>
      </DrawerContent>
    </Drawer>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "With handle" }))
    await body.findByRole("dialog", { name: "Drawer" })

    // The grabber is a 36x5 bar; the scrim does not blur the page.
    const bar = getComputedStyle(
      document.querySelector("[data-slot=drawer-swipe-handle]")!,
      "::after"
    )
    await expect(bar.width).toBe("36px")
    await expect(bar.height).toBe("5px")
    const overlay = document.querySelector("[data-slot=drawer-overlay]")!
    await expect(getComputedStyle(overlay).backdropFilter).toBe("none")
  },
}

const paragraphs = [
  "Your changes are saved automatically as you type.",
  "Tool calls run in a sandbox and can be replayed from the run log.",
  "Requests are rate-limited per workspace. Exceeding the limit pauses the run until the window resets.",
  "Long runs are summarised every few steps so the context stays small.",
]

export const Scrollable: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Scrollable
      </DrawerTrigger>
      <DrawerContent className="data-[swipe-direction=down]:h-80">
        <DrawerHeader>
          <DrawerTitle>Run notes</DrawerTitle>
          <DrawerDescription>A drawer with a fixed height.</DrawerDescription>
        </DrawerHeader>
        <div
          className="flex-1 overflow-y-auto p-4"
          role="region"
          aria-label="Notes"
          tabIndex={0}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <p key={index} className="mb-4 leading-normal">
              {paragraphs[index % paragraphs.length]}
            </p>
          ))}
        </div>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Scrollable" }))
    const drawer = await body.findByRole("dialog", { name: "Run notes" })
    await expect(
      within(drawer).getByRole("region", { name: "Notes" })
    ).toBeInTheDocument()
  },
}

export const Nested: Story = {
  render: () => (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button variant="outline" />}>
        Open drawer
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>First drawer</DrawerTitle>
          <DrawerDescription>Open another drawer on top.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <div className="h-40 w-full bg-muted" />
        </div>
        <DrawerFooter>
          <Drawer>
            <DrawerTrigger render={<Button />}>
              Open nested drawer
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Nested drawer</DrawerTitle>
                <DrawerDescription>
                  The parent drawer stays mounted behind this one.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose render={<Button variant="outline" />}>
                  Close
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open drawer" }))
    const first = await body.findByRole("dialog", { name: "First drawer" })
    await userEvent.click(
      within(first).getByRole("button", { name: "Open nested drawer" })
    )
    await body.findByRole("dialog", { name: "Nested drawer" })
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByRole("dialog", { name: "Nested drawer" })).toBeNull()
    )
    await expect(
      body.getByRole("dialog", { name: "First drawer" })
    ).toBeInTheDocument()
  },
}

export const NonModal: Story = {
  render: () => (
    <Drawer modal={false} disablePointerDismissal swipeDirection="right">
      <DrawerTrigger render={<Button variant="outline" />}>
        Non-modal
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Non-modal drawer</DrawerTitle>
          <DrawerDescription>The page behind stays usable.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Non-modal" })
    await userEvent.click(trigger)
    const drawer = await body.findByRole("dialog", { name: "Non-modal drawer" })
    await userEvent.click(document.body)
    await expect(drawer).toBeInTheDocument()
    await userEvent.click(within(drawer).getByRole("button", { name: "Close" }))
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

function Sized({
  size,
  rows,
}: {
  size?: "default" | "tall" | "full"
  rows: number
}) {
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Choose a model
      </DrawerTrigger>
      <DrawerContent size={size ?? "default"}>
        <DrawerHeader>
          <DrawerTitle>Choose a model</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {Array.from({ length: rows }, (_, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start"
            >
              Model {index + 1}
            </Button>
          ))}
        </div>
        <DrawerFooter>
          <Button>Use it</Button>
          <DrawerClose render={<Button variant="outline" />}>
            Cancel
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

async function openSized(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole("button", { name: "Choose a model" }))
  const drawer = await body.findByRole("dialog", { name: "Choose a model" })
  // Settled: its top still for a frame.
  let last = NaN
  await waitFor(() => {
    const top = drawer.getBoundingClientRect().top
    const still = top === last
    last = top
    expect(still).toBe(true)
  })
  return drawer
}

/**
 * size="tall": a long list up to 1rem under the window's top (the status
 * bar's edge, where it has one), not 6rem; size="full": that tall
 * whatever it holds.
 */
export const Sizes: Story = {
  ...windowOf("phone", 390, 844),
  render: () => <Sized size="tall" rows={60} />,
  play: async ({ canvas }) => {
    const drawer = await openSized(canvas)
    await waitFor(() =>
      expect(
        Math.abs(drawer.getBoundingClientRect().top - 16)
      ).toBeLessThanOrEqual(1)
    )
  },
}

export const Full: Story = {
  ...windowOf("phone", 390, 844),
  render: () => <Sized size="full" rows={2} />,
  play: async ({ canvas }) => {
    const drawer = await openSized(canvas)
    await waitFor(() =>
      expect(
        Math.abs(drawer.getBoundingClientRect().top - 16)
      ).toBeLessThanOrEqual(1)
    )
  },
}

/**
 * On a short screen (a phone on its side), its footer's buttons side by
 * side, the first at the end, so the list keeps its room.
 */
export const ShortScreen: Story = {
  ...windowOf("landscape", 844, 390),
  render: () => <Sized rows={4} />,
  play: async ({ canvas }) => {
    const drawer = await openSized(canvas)
    const use = within(drawer).getByRole("button", { name: "Use it" })
    const cancel = within(drawer).getByRole("button", { name: "Cancel" })
    await expect(use.getBoundingClientRect().top).toBe(
      cancel.getBoundingClientRect().top
    )
    await expect(use.getBoundingClientRect().left).toBeGreaterThan(
      cancel.getBoundingClientRect().left
    )
  },
}
