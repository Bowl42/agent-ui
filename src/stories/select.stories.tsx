import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiBrain01Icon, Robot01Icon, ZapIcon } from "@hugeicons/core-free-icons"
import { expect, fn, screen, userEvent, waitFor } from "storybook/test"

import { onAPhone, opened, sheetGeometry } from "@/stories/phone"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const models = [
  { label: "Select a model", value: null },
  { label: "Claude Opus", value: "opus" },
  { label: "Claude Sonnet", value: "sonnet" },
  { label: "Claude Haiku", value: "haiku" },
  { label: "Legacy model", value: "legacy", disabled: true },
]

const meta = {
  title: "Components/Select",
  component: Select,
  args: { items: models, onValueChange: fn() },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger aria-label="Model" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {models.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={item.disabled}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Model" })
    await expect(trigger).toHaveTextContent("Select a model")
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    const listbox = await screen.findByRole("listbox")
    await waitFor(() => expect(listbox).toBeVisible())
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Select a model" })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "Claude Sonnet" })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await expect(trigger).toHaveTextContent("Claude Sonnet")
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      "sonnet",
      expect.anything()
    )
    await expect(trigger).toHaveFocus()
  },
}

/**
 * On a phone, the list is a sheet from the bottom, its options 44px tall,
 * not placed over the trigger; choosing one closes it.
 */
export const Phone: Story = {
  ...onAPhone,
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Model" })
    await userEvent.click(trigger)
    const listbox = await screen.findByRole("listbox")
    const popup = await opened(
      listbox.closest<HTMLElement>("[data-slot=select-content]")!
    )
    await expect(popup).toHaveAttribute("data-phone-sheet")
    await expect(sheetGeometry(popup, screen.getAllByRole("option"))).toEqual({
      across: true,
      atBottom: true,
      rows: [44, 44, 44, 44, 44],
    })
    await userEvent.click(screen.getByRole("option", { name: "Claude Haiku" }))
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      "haiku",
      expect.anything()
    )
  },
}

const longNames = [
  { label: "main", value: "main" },
  {
    label:
      "~/code/agent-ui/src/components/agent-app/very-long-folder-name-without-spaces",
    value: "deep",
  },
  {
    label: "A project with a long name that does not fit on a phone at all",
    value: "long",
  },
]

/**
 * Options straight in the list, not in a group, inset as a group's are;
 * a long name wraps (anywhere, if it has no spaces), never past the
 * sheet's edge.
 */
export const PhoneLongNames: Story = {
  ...onAPhone,
  args: { items: longNames },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger aria-label="Project" className="w-48">
        <SelectValue placeholder="Project" />
      </SelectTrigger>
      <SelectContent>
        {longNames.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Project" }))
    const listbox = await screen.findByRole("listbox")
    const popup = await opened(
      listbox.closest<HTMLElement>("[data-slot=select-content]")!
    )
    const sheet = popup.getBoundingClientRect()
    for (const option of screen.getAllByRole("option")) {
      const box = option.getBoundingClientRect()
      // Inset from the sheet's edges.
      await expect(box.left - sheet.left).toBeGreaterThanOrEqual(4)
      await expect(sheet.right - box.right).toBeGreaterThanOrEqual(4)
      // Nothing past its edge.
      await expect(option.scrollWidth).toBeLessThanOrEqual(option.clientWidth)
    }
    // The long ones on more than a line.
    await expect(
      screen.getByRole("option", { name: /^A project/ }).clientHeight
    ).toBeGreaterThan(44)
  },
}

export const EscapeCloses: Story = {
  play: async ({ args, canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Model" })
    await userEvent.click(trigger)
    await screen.findByRole("listbox")
    await expect(
      screen.getByRole("option", { name: "Legacy model" })
    ).toHaveAttribute("aria-disabled", "true")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await expect(trigger).toHaveTextContent("Select a model")
    await expect(args.onValueChange).not.toHaveBeenCalled()
  },
}

export const WithIcons: Story = {
  render: (args) => (
    <Select
      {...args}
      items={[
        { label: "Fast", value: "fast" },
        { label: "Balanced", value: "balanced" },
        { label: "Deep", value: "deep" },
      ]}
      defaultValue="balanced"
    >
      <SelectTrigger aria-label="Reasoning" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="fast">
            <HugeiconsIcon icon={ZapIcon} strokeWidth={2} />
            Fast
          </SelectItem>
          <SelectItem value="balanced">
            <HugeiconsIcon icon={Robot01Icon} strokeWidth={2} />
            Balanced
          </SelectItem>
          <SelectItem value="deep">
            <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />
            Deep
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

const builtIn = [
  { label: "Shell", value: "shell" },
  { label: "Web browser", value: "browser" },
  { label: "File system", value: "files" },
]
const servers = [
  { label: "GitHub", value: "github" },
  { label: "Linear", value: "linear" },
]

export const WithGroups: Story = {
  args: {
    items: [{ label: "Select a tool", value: null }, ...builtIn, ...servers],
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger aria-label="Tool" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Built in</SelectLabel>
          {builtIn.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>MCP servers</SelectLabel>
          {servers.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Tool" }))
    const group = await screen.findByRole("group", { name: "MCP servers" })
    await waitFor(() => expect(group).toBeVisible())
    await userEvent.click(screen.getByRole("option", { name: "Linear" }))
    await expect(
      canvas.getByRole("combobox", { name: "Tool" })
    ).toHaveTextContent("Linear")
    // Let the popup finish closing before the accessibility check.
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  },
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(["sm", "default"] as const).map((size) => (
        <Select key={size} {...args}>
          <SelectTrigger
            size={size}
            aria-label={`Model (${size})`}
            className="w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {models.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ))}
    </div>
  ),
}

export const Multiple: Story = {
  render: () => (
    <Select items={models.slice(1, 4)} multiple defaultValue={[]}>
      <SelectTrigger aria-label="Models" className="w-56">
        <SelectValue>
          {(value: string[]) =>
            value.length === 0
              ? "Select models"
              : value.length === 1
                ? models.find((m) => m.value === value[0])?.label
                : `${value.length} models selected`
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {models.slice(1, 4).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Models" })
    await userEvent.click(trigger)
    await userEvent.click(
      await screen.findByRole("option", { name: "Claude Opus" })
    )
    await userEvent.click(screen.getByRole("option", { name: "Claude Haiku" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await expect(trigger).toHaveTextContent("2 models selected")
  },
}

export const WithField: Story = {
  render: (args) => (
    <Field className="w-72">
      <FieldLabel htmlFor="select-default-model">Default model</FieldLabel>
      <Select {...args}>
        <SelectTrigger id="select-default-model">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {models.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription>Used for new chats in this workspace.</FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("combobox", { name: "Default model" })
    ).toBeVisible()
  },
}

export const Invalid: Story = {
  render: (args) => (
    <Field data-invalid className="w-72">
      <FieldLabel htmlFor="select-invalid">Default model</FieldLabel>
      <Select {...args}>
        <SelectTrigger id="select-invalid" aria-invalid>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {models.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError errors={[{ message: "Choose a model." }]} />
    </Field>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Model" })
    await userEvent.click(trigger)
    await expect(screen.queryByRole("listbox")).toBeNull()
  },
}

export const InDialog: Story = {
  render: (args) => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Change model
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change model</DialogTitle>
          <DialogDescription>
            Applies to the rest of this chat.
          </DialogDescription>
        </DialogHeader>
        <Select {...args}>
          <SelectTrigger aria-label="Model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {models.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Change model" }))
    const dialog = await screen.findByRole("dialog", { name: "Change model" })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.click(screen.getByRole("combobox", { name: "Model" }))
    await userEvent.click(
      await screen.findByRole("option", { name: "Claude Haiku" })
    )
    await expect(
      screen.getByRole("combobox", { name: "Model" })
    ).toHaveTextContent("Claude Haiku")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

const longPaths = [
  { label: "Pick the memory to replace", value: "none" },
  ...Array.from({ length: 12 }, (_, index) => ({
    label: `Archive folder: spare folder ${12 - index}`,
    value: `spare-${12 - index}`,
  })),
  {
    label: `Archive folder: /${"unbroken_directory_name".repeat(22)}/last`,
    value: "deep",
  },
  ...[1, 2].map((index) => ({
    label: `A long sentence about memory ${index}, `.repeat(4),
    value: `long-${index}`,
  })),
]

// A phone's width, as `useIsMobile` reads it, which a story turns: the
// listeners of the query it asks, told as it changes.
const phoneWidth = { matches: true, listeners: new Set<() => void>() }

/**
 * A sheet on a phone, then, the window wider, opened by its trigger,
 * the page scrolled: below its trigger and in the window, not pinned to
 * the bottom as the sheet was (Base UI puts the positioner's styles back
 * as it first found them each time it closes). No `items`: its options
 * stay mounted, closed, for the trigger's label.
 */
export const FromASheetToTheTrigger: Story = {
  args: { items: undefined, defaultValue: "spare-6" },
  beforeEach: () => {
    const real = window.matchMedia
    window.matchMedia = (query: string) =>
      query === "(max-width: 639px)"
        ? ({
            get matches() {
              return phoneWidth.matches
            },
            media: query,
            addEventListener: (_: string, listener: () => void) =>
              phoneWidth.listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) =>
              phoneWidth.listeners.delete(listener),
          } as unknown as MediaQueryList)
        : real.call(window, query)
    phoneWidth.matches = true
    return () => {
      window.matchMedia = real
      phoneWidth.listeners.clear()
    }
  },
  render: (args) => (
    <div>
      <div className="h-screen" />
      <Select {...args}>
        <SelectTrigger aria-label="Memory" className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {longPaths.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="h-screen" />
    </div>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Memory" })
    const open = async () => {
      trigger.scrollIntoView({ block: "start" })
      await userEvent.click(trigger)
      const listbox = await screen.findByRole("listbox")
      return opened(listbox.closest<HTMLElement>("[data-slot=select-content]")!)
    }
    const close = async () => {
      await userEvent.keyboard("{Escape}")
      await waitFor(() =>
        expect(trigger).toHaveAttribute("aria-expanded", "false")
      )
    }
    // A sheet: closed, and an option chosen in it.
    await expect(await open()).toHaveAttribute("data-phone-sheet")
    await close()
    await open()
    await userEvent.click(
      screen.getByRole("option", { name: /spare folder 3$/ })
    )
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    )
    // Wider: by its trigger, twice (each close puts styles back).
    phoneWidth.matches = false
    phoneWidth.listeners.forEach((listener) => listener())
    for (let time = 0; time < 2; time++) {
      const popup = await open()
      await expect(popup).not.toHaveAttribute("data-phone-sheet")
      await waitFor(() => {
        const box = popup.getBoundingClientRect()
        expect(box.top).toBeGreaterThanOrEqual(
          trigger.getBoundingClientRect().bottom
        )
        expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
      })
      await close()
    }
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  },
}

/**
 * Last in this file: it sets a short window, which the stories after it
 * could keep.
 *
 * Long options, the chosen one many lines tall and far down, in a short
 * window, its text 12px to 18px, the trigger low in it: the list opens
 * above the trigger (not with the chosen one over it, which would put it
 * out of the window), in the window, the chosen one in view, scrolling
 * within.
 */
export const LongOptionsShortWindow: Story = {
  parameters: {
    viewport: {
      options: {
        short: {
          name: "Short",
          styles: { width: "821px", height: "400px" },
          type: "desktop",
        },
      },
    },
  },
  globals: { viewport: { value: "short", isRotated: false } },
  args: { items: longPaths, defaultValue: "deep" },
  render: (args) => (
    <div className="fixed inset-x-0 bottom-8 px-28">
      <Select {...args}>
        <SelectTrigger aria-label="Memory" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {longPaths.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ),
  play: async ({ canvas }) => {
    // A reader's text, 12px to 18px (of 14px, 100%), the larger the
    // taller each option.
    const root = document.documentElement
    try {
      for (const size of ["85.714%", "100%", "114.286%", "128.571%"]) {
        root.style.fontSize = size
        await userEvent.click(canvas.getByRole("combobox", { name: "Memory" }))
        const listbox = await screen.findByRole("listbox")
        const popup = await opened(
          listbox.closest<HTMLElement>("[data-slot=select-content]")!
        )
        await waitFor(() => {
          // The popup and its listbox, the box seen, in the window.
          const box = popup.getBoundingClientRect()
          expect(box.top).toBeGreaterThanOrEqual(0)
          expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
          const list = listbox.getBoundingClientRect()
          expect(list.top).toBeGreaterThanOrEqual(box.top - 0.5)
          expect(list.bottom).toBeLessThanOrEqual(box.bottom + 0.5)
          // The chosen one in view in it, at least in part.
          const at = screen
            .getByRole("option", { name: /^Archive folder: \/unbroken/ })
            .getBoundingClientRect()
          expect(at.bottom).toBeGreaterThan(box.top)
          expect(at.top).toBeLessThan(box.bottom)
        })
        // End and Home: the last and the first wholly in view.
        await userEvent.keyboard("{End}")
        await waitFor(() => {
          const last = screen.getAllByRole("option").at(-1)!
          expect(last).toHaveFocus()
          expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
            listbox.getBoundingClientRect().bottom + 1
          )
        })
        await userEvent.keyboard("{Home}")
        await waitFor(() => {
          const first = screen.getAllByRole("option")[0]!
          expect(first).toHaveFocus()
          expect(first.getBoundingClientRect().top).toBeGreaterThanOrEqual(
            listbox.getBoundingClientRect().top - 1
          )
        })
        await userEvent.keyboard("{Escape}")
        await waitFor(() =>
          expect(
            canvas.getByRole("combobox", { name: "Memory" })
          ).toHaveAttribute("aria-expanded", "false")
        )
        // Closed, before the next size or the accessibility check.
        await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
      }
    } finally {
      root.style.fontSize = ""
    }
  },
}
