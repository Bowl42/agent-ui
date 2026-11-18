import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CalculatorIcon,
  Calendar03Icon,
  Robot01Icon,
  Settings02Icon,
  SmileIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { useCommandState } from "cmdk"
import { expect, fn, screen, userEvent, waitFor } from "storybook/test"

import { windowOf } from "@/stories/phone"
import { onOneLine, textStart } from "@/stories/grid-lines"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

const meta = {
  title: "Components/Command",
  component: Command,
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

const onSelect = fn()

function Items() {
  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem value="calendar" onSelect={onSelect}>
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />
          <span>Calendar</span>
        </CommandItem>
        <CommandItem value="emoji" onSelect={onSelect}>
          <HugeiconsIcon icon={SmileIcon} strokeWidth={2} />
          <span>Search emoji</span>
        </CommandItem>
        <CommandItem disabled>
          <HugeiconsIcon icon={CalculatorIcon} strokeWidth={2} />
          <span>Calculator</span>
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem value="profile" onSelect={onSelect}>
          <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
          <span>Profile</span>
          <CommandShortcut>⌘P</CommandShortcut>
        </CommandItem>
        <CommandItem value="agents" onSelect={onSelect}>
          <HugeiconsIcon icon={Robot01Icon} strokeWidth={2} />
          <span>Agents</span>
          <CommandShortcut>⌘A</CommandShortcut>
        </CommandItem>
        <CommandItem value="settings" onSelect={onSelect}>
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
          <span>Settings</span>
          <CommandShortcut>⌘S</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </>
  )
}

export const Default: Story = {
  render: () => (
    <Command className="max-w-sm rounded-lg border">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <Items />
      </CommandList>
    </Command>
  ),
  play: async ({ canvas }) => {
    onSelect.mockClear()
    const input = canvas.getByRole("combobox")
    // A search field as drawn: the page's colour inside a hairline, not
    // a grey fill whose own grey border drew a darker rim.
    const field = input.closest("[data-slot=input-group]")!
    await expect(pixel(getComputedStyle(field).backgroundColor)).toEqual(
      themeColor(field, "bg-background", "background-color")
    )
    await expect(pixel(getComputedStyle(field).borderTopColor)).toEqual(
      themeColor(field, "border border-border", "border-top-color")
    )
    await userEvent.click(input)
    await userEvent.keyboard("agen")
    await waitFor(() =>
      expect(canvas.queryByRole("option", { name: /Calendar/ })).toBeNull()
    )
    await userEvent.keyboard("{Enter}")
    // onSelect gets the item's value.
    await expect(onSelect).toHaveBeenCalledWith("agents")

    await userEvent.clear(input)
    await userEvent.keyboard("zzz")
    await expect(await canvas.findByText("No results found.")).toBeVisible()
    // cmdk leaves the listbox without options while it shows the empty
    // state, which axe reports (aria-required-children); end with results.
    await userEvent.clear(input)
    await expect(
      await canvas.findByRole("option", { name: /Calendar/ })
    ).toBeVisible()
  },
}

function Palette() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <Items />
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

export const Dialog: Story = {
  render: () => <Palette />,
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Open command palette" })
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Command Palette",
    })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
      timeout: 3000,
    })
  },
}

const hits = Array.from({ length: 35 }, (_, index) => `Result ${index + 1}`)

/** The results, memoized as an app's often are. */
const Hits = React.memo(function Hits() {
  return hits.map((hit) => (
    <CommandItem key={hit} value={hit}>
      {hit}
    </CommandItem>
  ))
})

/** Its highlighted item the app's, e.g. to preview it beside the list. */
function Controlled() {
  const [value, setValue] = React.useState(hits[0]!)
  return (
    <div className="flex w-lg max-w-full gap-4">
      <Command
        shouldFilter={false}
        loop
        value={value}
        onValueChange={setValue}
        className="max-w-xs rounded-lg border"
      >
        <CommandInput placeholder="Search..." />
        <CommandList>
          <Hits />
        </CommandList>
      </Command>
      <section aria-label="Preview" className="text-sm">
        {value}
      </section>
    </div>
  )
}

/**
 * Controlled, the highlighted item is scrolled to and is the input's
 * active descendant as the arrows move, also round from the first to the
 * last, even with its items memoized (cmdk alone is a step behind).
 */
export const ControlledValue: Story = {
  render: () => <Controlled />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox")
    const list = canvas.getByRole("listbox")
    const shown = (name: string) => {
      const option = canvas.getByRole("option", { name })
      const box = option.getBoundingClientRect()
      const view = list.getBoundingClientRect()
      return box.top >= view.top - 1 && box.bottom <= view.bottom + 1
    }
    const check = async (name: string) => {
      const option = canvas.getByRole("option", { name })
      await waitFor(() =>
        expect(option).toHaveAttribute("aria-selected", "true")
      )
      await waitFor(() =>
        expect(input).toHaveAttribute("aria-activedescendant", option.id)
      )
      await waitFor(() => expect(shown(name)).toBe(true))
      await expect(
        canvas.getByRole("region", { name: "Preview" })
      ).toHaveTextContent(name)
    }
    await userEvent.click(input)
    await userEvent.keyboard("{ArrowUp}")
    await check("Result 35")
    await userEvent.keyboard("{ArrowDown}")
    await check("Result 1")
    await userEvent.keyboard("{End}")
    await check("Result 35")
    await userEvent.keyboard("{Home}{ArrowDown}{ArrowDown}")
    await check("Result 3")
  },
}

/** Rows of the paged list, memoized as an app's often are. */
const Rows = React.memo(function Rows({ count }: { count: number }) {
  return hits.slice(0, count).map((hit) => (
    <CommandItem key={hit} value={hit}>
      {hit}
    </CommandItem>
  ))
})

/** A page of results, then "Show more": choosing it loads the rest. */
function Paged() {
  const [value, setValue] = React.useState("")
  const [count, setCount] = React.useState(20)
  return (
    <Command
      shouldFilter={false}
      loop
      value={value}
      onValueChange={setValue}
      className="max-w-xs rounded-lg border"
    >
      <CommandInput placeholder="Search..." />
      <CommandList className="max-h-48">
        <Rows count={count} />
        {count < hits.length ? (
          <CommandItem value="more" onSelect={() => setCount(hits.length)}>
            Show more
          </CommandItem>
        ) : null}
      </CommandList>
    </Command>
  )
}

/** The highlighted option is selected, in view and the active descendant. */
async function expectHighlighted(canvas: HTMLElement, name: string) {
  const input = canvas.querySelector<HTMLElement>("[cmdk-input]")!
  const list = canvas.querySelector<HTMLElement>("[cmdk-list]")!
  const option = [...canvas.querySelectorAll<HTMLElement>("[cmdk-item]")].find(
    (item) => item.textContent === name
  )!
  await expect(option).toBeDefined()
  await waitFor(() => expect(option).toHaveAttribute("aria-selected", "true"))
  await waitFor(() =>
    expect(input).toHaveAttribute("aria-activedescendant", option.id)
  )
  await waitFor(() => {
    const box = option.getBoundingClientRect()
    const view = list.getBoundingClientRect()
    expect(box.top).toBeGreaterThanOrEqual(view.top - 1)
    expect(box.bottom).toBeLessThanOrEqual(view.bottom + 1)
  })
}

/**
 * Controlled, with memoized rows: "Show more" loads the last page and
 * goes, and every move after it scrolls to the highlighted row and names
 * it as the active descendant.
 */
export const ControlledShowMore: Story = {
  render: () => <Paged />,
  play: async ({ canvasElement, canvas }) => {
    await userEvent.click(canvas.getByRole("combobox"))
    await userEvent.keyboard("{End}")
    await expectHighlighted(canvasElement, "Show more")
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(canvas.queryByRole("option", { name: "Show more" })).toBeNull()
    )
    await userEvent.keyboard("{ArrowUp}")
    await expectHighlighted(canvasElement, "Result 35")
    await userEvent.keyboard("{ArrowDown}")
    await expectHighlighted(canvasElement, "Result 1")
    await userEvent.keyboard("{End}")
    await expectHighlighted(canvasElement, "Result 35")
    await userEvent.keyboard("{Home}")
    await expectHighlighted(canvasElement, "Result 1")
    await userEvent.keyboard("{ArrowUp}")
    await expectHighlighted(canvasElement, "Result 35")
  },
}

/** Controlled, ArrowDown through memoized rows keeps each one in view. */
export const ControlledArrowDown: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement, canvas }) => {
    await userEvent.click(canvas.getByRole("combobox"))
    await expectHighlighted(canvasElement, "Result 1")
    for (const hit of hits.slice(1)) {
      await userEvent.keyboard("{ArrowDown}")
      await expectHighlighted(canvasElement, hit)
    }
  },
}

const dishes = [
  "Apple pie",
  "Banana bread",
  "Cherry tart",
  "Banana split",
  "Lemon cake",
  "Mango sorbet",
]

/** The app's own search, so the hits keep the list's order. */
function Dishes({ query }: { query: string }) {
  const needle = query.toLowerCase()
  return dishes
    .filter((dish) => dish.toLowerCase().includes(needle))
    .map((dish) => (
      <CommandItem key={dish} value={dish}>
        {dish}
      </CommandItem>
    ))
}

/** Shows the highlighted dish and keeps it, for the next Command. */
function Highlighted({ onChange }: { onChange: (value: string) => void }) {
  const value = useCommandState((state) => state.value)
  React.useEffect(() => onChange(value), [value, onChange])
  return null
}

/**
 * A search kept across a remount (as an app does when it swaps a page for
 * a dialog at a breakpoint): query and highlight given back, controlled
 * or as defaults read with `useCommandState`.
 */
function Remounted({ controlled }: { controlled: boolean }) {
  const [query, setQuery] = React.useState("an")
  const [value, setValue] = React.useState("Banana split")
  const [mount, setMount] = React.useState(0)
  return (
    <div className="flex flex-col items-start gap-4">
      <Button variant="outline" onClick={() => setMount((mount) => mount + 1)}>
        Remount
      </Button>
      <Command
        key={mount}
        shouldFilter={false}
        {...(controlled
          ? { value, onValueChange: setValue }
          : { defaultValue: value })}
        className="max-w-xs rounded-lg border"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search..."
        />
        <CommandList>
          <Dishes query={query} />
        </CommandList>
        {controlled ? null : <Highlighted onChange={setValue} />}
      </Command>
    </div>
  )
}

async function remount({
  canvasElement,
  canvas,
}: {
  canvasElement: HTMLElement
  canvas: { getByRole: typeof screen.getByRole }
}) {
  // Mounted with a query and the second hit: the second hit stays.
  await expectHighlighted(canvasElement, "Banana split")
  await userEvent.click(canvas.getByRole("button", { name: "Remount" }))
  await expectHighlighted(canvasElement, "Banana split")
  // A query the reader types highlights its first hit, though the old
  // one is still a hit.
  await userEvent.click(canvas.getByRole("combobox"))
  await userEvent.keyboard("a")
  await expectHighlighted(canvasElement, "Banana bread")
  await expect(
    canvas.getByRole("option", { name: "Banana split" })
  ).toHaveAttribute("aria-selected", "false")
  await userEvent.keyboard("{ArrowDown}")
  await expectHighlighted(canvasElement, "Banana split")
  await userEvent.click(canvas.getByRole("button", { name: "Remount" }))
  await expectHighlighted(canvasElement, "Banana split")
}

export const RemountControlled: Story = {
  render: () => <Remounted controlled />,
  play: remount,
}

export const RemountUncontrolled: Story = {
  render: () => <Remounted controlled={false} />,
  play: remount,
}

/** The list rendered anew (other keys), the same values in it. */
function Reloaded() {
  const [value, setValue] = React.useState("Cherry tart")
  const [load, setLoad] = React.useState(0)
  return (
    <div className="flex flex-col items-start gap-4">
      <Button variant="outline" onClick={() => setLoad((load) => load + 1)}>
        Reload
      </Button>
      <Command
        shouldFilter={false}
        value={value}
        onValueChange={setValue}
        className="max-w-xs rounded-lg border"
      >
        <CommandInput placeholder="Search..." />
        <CommandList>
          <Dishes key={load} query="" />
        </CommandList>
      </Command>
    </div>
  )
}

/**
 * The active descendant is the option shown, not one that went: named on
 * mount, and again when the list is rendered anew with the same value.
 */
export const ActiveDescendantReloaded: Story = {
  render: () => <Reloaded />,
  play: async ({ canvasElement, canvas }) => {
    await expectHighlighted(canvasElement, "Cherry tart")
    const before = canvas.getByRole("option", { name: "Cherry tart" }).id
    await userEvent.click(canvas.getByRole("button", { name: "Reload" }))
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: "Cherry tart" }).id).not.toBe(
        before
      )
    )
    await expectHighlighted(canvasElement, "Cherry tart")
  },
}

/**
 * A theme class's colour in `within`, as pixels (red, green, blue, alpha):
 * engines write the same colour as oklch, oklab or srgb.
 */
const themeColor = (within: Element, className: string, property: string) => {
  const probe = document.createElement("span")
  probe.className = className
  within.append(probe)
  const color = getComputedStyle(probe).getPropertyValue(property)
  probe.remove()
  return pixel(color)
}

const pixel = (color: string) => {
  const context = document.createElement("canvas").getContext("2d")!
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data]
}

/**
 * size="fixed": 32rem tall and centred whatever its results, so it does
 * not jump as a query narrows them.
 */
export const DialogFixed: Story = {
  ...windowOf("desktop", 1024, 768),
  render: () => (
    <CommandDialog open size="fixed">
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <Items />
        </CommandList>
      </Command>
    </CommandDialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("dialog", {
      name: "Command Palette",
    })
    await waitFor(() => expect(dialog.getBoundingClientRect().height).toBe(512))
    const box = dialog.getBoundingClientRect()
    await expect(Math.abs(box.top - (768 - 512) / 2)).toBeLessThanOrEqual(1)
    await userEvent.type(
      screen.getByPlaceholderText("Type a command or search..."),
      "calc"
    )
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1))
    await expect(dialog.getBoundingClientRect().height).toBe(512)
    // The list fills it, under the field.
    const list = dialog.querySelector("[data-slot=command-list]")!
    await expect(list.getBoundingClientRect().bottom).toBeGreaterThan(
      box.bottom - 16
    )
  },
}

/**
 * size="wide": as "fixed", 42rem wide, for a palette of groups and
 * shortcuts; within the window's edges on a phone.
 */
export const DialogWide: Story = {
  ...windowOf("desktop", 1024, 768),
  render: () => (
    <CommandDialog open size="wide">
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <Items />
        </CommandList>
      </Command>
    </CommandDialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("dialog", {
      name: "Command Palette",
    })
    await waitFor(() => {
      const box = dialog.getBoundingClientRect()
      expect([box.width, box.height]).toEqual([672, 512])
    })
    await onColumns(dialog)
  },
}

/**
 * The palette's columns: the search icon, the groups' headings and the
 * rows' icons on one; the search's text and the rows' on another.
 */
async function onColumns(dialog: HTMLElement) {
  const input = dialog.querySelector<HTMLElement>("[data-slot=command-input]")!
  const item = dialog.querySelector<HTMLElement>("[data-slot=command-item]")!
  await onOneLine("command icons", {
    search: dialog.querySelector("[data-slot=input-group-addon] svg"),
    heading: dialog.querySelector("[cmdk-group-heading]"),
    row: item.querySelector("svg"),
  })
  await onOneLine("command text", {
    search: textStart(input),
    row: item.querySelector("span"),
  })
}

export const DialogWidePhone: Story = {
  ...DialogWide,
  ...windowOf("phone", 390, 844),
  play: async () => {
    const dialog = await screen.findByRole("dialog", {
      name: "Command Palette",
    })
    await waitFor(() =>
      expect(dialog.getBoundingClientRect().width).toBe(390 - 32)
    )
    await onColumns(dialog)
  },
}
