import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import * as React from "react"
import { Toaster, toast } from "@/components/ui/toast"

const meta = {
  title: "Components/Toast",
  component: Toaster,
  decorators: [
    (Story, { parameters }) => (
      <Toaster {...(parameters.toaster ?? {})}>
        <Story />
      </Toaster>
    ),
  ],
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Button
      variant="outline"
      onClick={() =>
        toast.add({
          title: "Run finished",
          description: "Summarise inbox completed in 42s.",
        })
      }
    >
      Show toast
    </Button>
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Show toast" })
    await userEvent.tab()
    await expect(button).toHaveFocus()
    await userEvent.keyboard("{Enter}")

    const toastEl = await screen.findByRole("dialog", { name: "Run finished" })
    await expect(toastEl).toHaveAccessibleDescription(
      "Summarise inbox completed in 42s."
    )
    // F6 moves focus into the notifications region and expands the stack,
    // which exposes the close button.
    await userEvent.keyboard("{F6}")
    const close = await within(toastEl).findByRole("button", {
      name: "Close toast",
    })
    close.focus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(screen.queryByText("Run finished")).not.toBeInTheDocument()
    )
  },
}

function showUndoToast() {
  const id = toast.add({
    title: "Chat archived",
    description: "You can undo this action.",
    actionProps: {
      children: "Undo",
      onClick() {
        toast.close(id)
        // A toast is a dialog: give it a title so it has a name.
        toast.add({ title: "Chat restored" })
      },
    },
  })
}

export const WithAction: Story = {
  render: () => (
    <Button variant="outline" onClick={showUndoToast}>
      Archive chat
    </Button>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive chat" }))
    const undo = await screen.findByRole("button", { name: "Undo" })
    await userEvent.click(undo)
    await expect(await screen.findByText("Chat restored")).toBeVisible()
    await waitFor(() =>
      expect(screen.queryByText("Chat archived")).not.toBeInTheDocument()
    )
  },
}

function showPromiseToast() {
  void toast.promise(
    new Promise<{ name: string }>((resolve) => {
      window.setTimeout(() => resolve({ name: "Deploy agent" }), 500)
    }),
    {
      // Plain strings become a description only, leaving the toast (a
      // dialog) without a name; pass titles instead.
      loading: { title: "Starting run…" },
      success: (data) => ({ title: `${data.name} finished.` }),
      error: { title: "The run failed." },
    }
  )
}

export const PromiseToast: Story = {
  name: "Promise",
  render: () => (
    <Button variant="outline" onClick={showPromiseToast}>
      Start run
    </Button>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Start run" }))
    await expect(await screen.findByText("Starting run…")).toBeVisible()
    await expect(
      await screen.findByText("Deploy agent finished.", undefined, {
        timeout: 3000,
      })
    ).toBeVisible()
  },
}

export const Types: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(["success", "info", "warning", "error"] as const).map((type) => (
        <Button
          key={type}
          variant="outline"
          onClick={() =>
            toast.add({ type, title: `A ${type} toast`, timeout: 0 })
          }
        >
          {type}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "error" }))
    await expect(await screen.findByText("A error toast")).toBeVisible()
  },
}

/** What the app keeps at the window's end, e.g. a native view: 100px. */
function EndInset({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    const root = document.documentElement.style
    root.setProperty("--toast-inset-end", "100px")
    return () => {
      root.removeProperty("--toast-inset-end")
    }
  }, [])
  return children
}

/**
 * position="top-end": at the window's top end (under a titlebar and the
 * status bar), clear of what the app keeps at the end
 * (--toast-inset-end); a pinned card, not a toast, stays there, the
 * toasts under it.
 */
export const TopEnd: Story = {
  parameters: {
    toaster: {
      position: "top-end",
      pinned: (
        <div className="rounded-xl bg-popover p-3 text-sm shadow-lg">
          Allow notifications to hear when a run ends.
        </div>
      ),
    },
  },
  render: () => (
    <EndInset>
      <Button
        variant="outline"
        onClick={() => toast.add({ title: "Copied the link" })}
      >
        Copy link
      </Button>
    </EndInset>
  ),
  play: async ({ canvas }) => {
    const viewport = document.querySelector<HTMLElement>(
      "[data-slot=toast-viewport]"
    )!
    await expect(viewport).toHaveAttribute("data-position", "top-end")
    const pinned = await screen.findByText(/Allow notifications/)
    const card = pinned.getBoundingClientRect()
    await expect(card.top).toBe(16)
    if (window.innerWidth >= 640)
      await expect(window.innerWidth - card.right).toBe(116)
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }))
    const shown = await screen.findByRole("dialog", { name: "Copied the link" })
    await waitFor(() => {
      const box = shown.getBoundingClientRect()
      expect(box.top).toBeGreaterThanOrEqual(card.bottom)
      expect(box.top - card.bottom).toBeLessThanOrEqual(13)
    })
    toast.close()
    await waitFor(() =>
      expect(screen.queryByText("Copied the link")).not.toBeInTheDocument()
    )
  },
}
