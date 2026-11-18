import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { BluetoothIcon, Delete02Icon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { windowOf } from "@/stories/phone"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const meta = {
  title: "Components/Alert Dialog",
  component: AlertDialog,
  args: { onOpenChange: fn() },
} satisfies Meta<typeof AlertDialog>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

export const Default: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger
        render={<Button variant="outline">Clear history</Button>}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. Every chat in this workspace will be
            permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Clear history" })
    await userEvent.tab()
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{Enter}")

    const dialog = await body.findByRole("alertdialog", {
      name: "Are you absolutely sure?",
    })
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.anything()
    )
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "Cancel" })
      ).toHaveFocus()
    )

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())

    await userEvent.keyboard("{Enter}")
    const open = await body.findByRole("alertdialog")
    // Its buttons under the content, on no band ruled off.
    const footer = getComputedStyle(
      open.querySelector("[data-slot=alert-dialog-footer]")!
    )
    await expect(footer.borderTopWidth).toBe("0px")
    // On the dialog's own colour (it is kept at the foot as the rest
    // scrolls under it): no band of another.
    await expect(footer.backgroundColor).toBe(
      getComputedStyle(open).backgroundColor
    )
  },
}

export const Small: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger render={<Button variant="outline">Small</Button>} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Allow the agent to run tools?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be able to read and write files in this workspace.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Don&apos;t allow</AlertDialogCancel>
          <AlertDialogAction>Allow</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Small" }))
    const dialog = await body.findByRole("alertdialog", {
      name: "Allow the agent to run tools?",
    })
    // Cancel closes the dialog; Action is a plain button the consumer wires.
    const cancel = within(dialog).getByRole("button", { name: "Don't allow" })
    await waitFor(() => expect(cancel).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull())
  },
}

export const WithMedia: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger
        render={<Button variant="outline">With media</Button>}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <HugeiconsIcon icon={BluetoothIcon} strokeWidth={2} />
          </AlertDialogMedia>
          <AlertDialogTitle>Connect accessory?</AlertDialogTitle>
          <AlertDialogDescription>
            Do you want to allow the accessory to connect to this device?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "With media" }))
    await body.findByRole("alertdialog", { name: "Connect accessory?" })
  },
}

export const Destructive: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger
        render={<Button variant="destructive">Delete chat</Button>}
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete chat?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the conversation. Visit{" "}
            <a href="#settings">Settings</a> to delete memories saved from it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete chat" }))
    const dialog = await body.findByRole("alertdialog", {
      name: "Delete chat?",
    })
    const link = within(dialog).getByRole("link", { name: "Settings" })
    await waitFor(() => expect(link).toBeVisible())
  },
}

export const InDialog: Story = {
  render: (args) => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workspace settings</DialogTitle>
          <DialogDescription>
            Resetting asks for confirmation first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <AlertDialog {...args}>
            <AlertDialogTrigger render={<Button />}>
              Reset workspace
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset workspace?</AlertDialogTitle>
                <AlertDialogDescription>
                  All runs and settings return to their defaults.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }))
    const dialog = await body.findByRole("dialog", {
      name: "Workspace settings",
    })
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Reset workspace" })
    )
    const alert = await body.findByRole("alertdialog", {
      name: "Reset workspace?",
    })
    await waitFor(() =>
      expect(
        within(alert).getByRole("button", { name: "Cancel" })
      ).toHaveFocus()
    )

    // Escape closes only the topmost layer. (Asserted via data-closed: the
    // exit animation may not finish when Escape lands mid-enter-animation.)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(alert).toHaveAttribute("data-closed"))
    await expect(dialog).not.toHaveAttribute("data-closed")
  },
}

/** Taller than the window: no taller than it, scrolling. */
export const TallerThanTheWindow: Story = {
  ...windowOf("short", 800, 360),
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        Reset
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            {Array.from(
              { length: 12 },
              () =>
                "Every conversation, file and setting in it goes, and cannot be brought back. "
            ).join("")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Reset" }))
    const dialog = await within(document.body).findByRole("alertdialog")
    await waitFor(() =>
      expect(dialog.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight - 15.5
      )
    )
    await expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight)
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" })
    )
  },
}

/** On a phone, a sheet from the bottom, as a dialog's. */
export const OnAPhone: Story = {
  ...windowOf("phone", 390, 844),
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        Reset
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            Every conversation, file and setting in it goes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Reset" }))
    const dialog = await within(document.body).findByRole("alertdialog")
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.left, box.width, Math.round(box.bottom)]).toEqual([
        0,
        window.innerWidth,
        window.innerHeight,
      ])
    })
  },
}
