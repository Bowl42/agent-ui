import { Fragment, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { Globe02Icon } from "@hugeicons/core-free-icons"
import { expect, fn, screen, userEvent, waitFor } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroupAddon } from "@/components/ui/input-group"
import { quiet } from "@/stories/wait"

const tools = [
  "Shell",
  "Web browser",
  "File system",
  "GitHub",
  "Linear",
  "Postgres",
  "Slack",
]

const regions = [
  { value: "Americas", items: ["us-east-1", "us-west-2", "sa-east-1"] },
  { value: "Europe", items: ["eu-west-1", "eu-central-1"] },
  { value: "Asia Pacific", items: ["ap-northeast-1", "ap-southeast-1"] },
]

const meta = {
  title: "Components/Combobox",
  component: Combobox,
  args: { items: tools, onValueChange: fn() },
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput placeholder="Select a tool" aria-label="Tool" />
      <ComboboxContent>
        <ComboboxEmpty>No tools found.</ComboboxEmpty>
        <ComboboxList aria-label="Tools">
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tool" })
    await userEvent.click(input)
    await userEvent.keyboard("git")
    await screen.findByRole("listbox")
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1))
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "GitHub" })).toHaveAttribute(
        "data-highlighted"
      )
    )
    await userEvent.keyboard("{Enter}")
    await expect(input).toHaveValue("GitHub")
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      "GitHub",
      expect.anything()
    )
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  },
}

export const EmptyAndEscape: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tool" })
    await userEvent.click(input)
    await userEvent.keyboard("zzz")
    const empty = await screen.findByText("No tools found.")
    // The popup fades in; wait for the enter transition.
    await waitFor(() => expect(empty).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"))
  },
}

export const AutoHighlight: Story = {
  args: { autoHighlight: true },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tool" })
    await userEvent.click(input)
    await userEvent.keyboard("sl")
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Slack" })).toHaveAttribute(
        "data-highlighted"
      )
    )
    await userEvent.keyboard("{Enter}")
    await expect(input).toHaveValue("Slack")
  },
}

export const Disabled: Story = {
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput placeholder="Select a tool" aria-label="Tool" disabled />
      <ComboboxContent>
        <ComboboxList aria-label="Tools">
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Tool" })).toBeDisabled()
  },
}

export const DisabledItems: Story = {
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput placeholder="Select a tool" aria-label="Tool" />
      <ComboboxContent>
        <ComboboxEmpty>No tools found.</ComboboxEmpty>
        <ComboboxList aria-label="Tools">
          {(item: string) => (
            <ComboboxItem
              key={item}
              value={item}
              disabled={item === "Shell" || item === "Postgres"}
            >
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
}

export const Invalid: Story = {
  render: (args) => (
    <Field data-invalid className="w-72">
      <FieldLabel htmlFor="combobox-invalid">Tool</FieldLabel>
      <Combobox {...args}>
        <ComboboxInput
          id="combobox-invalid"
          placeholder="Select a tool"
          aria-invalid
        />
        <ComboboxContent>
          <ComboboxEmpty>No tools found.</ComboboxEmpty>
          <ComboboxList aria-label="Tools">
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription>The agent starts with this tool.</FieldDescription>
      <FieldError errors={[{ message: "This field is required." }]} />
    </Field>
  ),
}

export const WithClear: Story = {
  args: { defaultValue: tools[0] },
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput placeholder="Select a tool" aria-label="Tool" showClear />
      <ComboboxContent>
        <ComboboxEmpty>No tools found.</ComboboxEmpty>
        <ComboboxList aria-label="Tools">
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tool" })
    await expect(input).toHaveValue("Shell")
    await userEvent.click(canvas.getByRole("button"))
    await expect(input).toHaveValue("")
  },
}

export const WithGroups: Story = {
  args: { items: regions },
  render: (args) => (
    <Combobox {...args}>
      <ComboboxInput placeholder="Select a region" aria-label="Region">
        <InputGroupAddon>
          <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>No regions found.</ComboboxEmpty>
        <ComboboxList aria-label="Regions">
          {(group: (typeof regions)[number]) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
              <ComboboxSeparator />
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Region" }))
    await userEvent.keyboard("eu-")
    const group = await screen.findByRole("group", { name: "Europe" })
    await waitFor(() => expect(group).toBeVisible())
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2))
    // The rule in from the popup's edges, as the rows' text, not across.
    const rule = group
      .querySelector("[data-slot=combobox-separator]")!
      .getBoundingClientRect()
    const option = screen.getAllByRole("option")[0]!.getBoundingClientRect()
    await expect(rule.left).toBeGreaterThan(option.left)
    await expect(rule.right).toBeLessThan(option.right)
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

/** A button opens a popup with its own search row. */
export const InPopup: Story = {
  args: { defaultValue: tools[0] },
  render: (args) => (
    <Combobox {...args}>
      <ComboboxTrigger
        aria-label="Tool"
        render={
          <Button
            variant="outline"
            className="w-64 justify-between font-normal"
          />
        }
      >
        <ComboboxValue />
      </ComboboxTrigger>
      <ComboboxContent aria-label="Tools">
        <ComboboxInput
          showTrigger={false}
          placeholder="Search"
          aria-label="Search tools"
        />
        <ComboboxEmpty>No tools found.</ComboboxEmpty>
        <ComboboxList aria-label="Tools">
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Tool" })
    await expect(trigger).toHaveTextContent("Shell")
    await userEvent.click(trigger)
    const search = await screen.findByRole("combobox", { name: "Search tools" })
    await waitFor(() => expect(search).toHaveFocus())
    // A search field, as a command menu's: its icon on a muted ground, 4px
    // in from the popup's edges, a row's height, no edge, no rule under
    // it, no ring when focused.
    const field = search.closest<HTMLElement>("[data-slot=input-group]")!
    const popup = field.closest<HTMLElement>("[data-slot=combobox-content]")!
    // Once the popup has zoomed in (its size, the field's in it): its
    // transition starts a frame after it opens.
    await quiet(popup)
    const style = getComputedStyle(field)
    await expect(style.borderTopWidth).toBe("0px")
    await expect(style.borderBottomWidth).toBe("0px")
    await expect(pixel(style.backgroundColor)).toEqual(
      themeColor(field, "bg-muted", "background-color")
    )
    await expect(
      (style.boxShadow.match(/[\d.]+px/g) ?? []).every((n) => n === "0px")
    ).toBe(true)
    await expect(field.querySelector("svg")).toBeInTheDocument()
    await expect(field.getBoundingClientRect().width).toBeCloseTo(
      popup.getBoundingClientRect().width - 8,
      0
    )
    await expect(
      field.getBoundingClientRect().top - popup.getBoundingClientRect().top
    ).toBeCloseTo(4, 0)
    await expect(field.getBoundingClientRect().height).toBe(32)
    // No button to open what is open.
    await expect(
      field.querySelector("[data-slot=input-group-button]")
    ).toBeNull()
    await userEvent.keyboard("lin{ArrowDown}{Enter}")
    await waitFor(() => expect(trigger).toHaveTextContent("Linear"))
  },
}

function MultipleTools() {
  const anchor = useComboboxAnchor()
  return (
    <Combobox items={tools} multiple autoHighlight defaultValue={[tools[0]]}>
      <ComboboxChips ref={anchor} className="w-80">
        <ComboboxValue>
          {(values: string[]) => (
            <Fragment>
              {values.map((value) => (
                <ComboboxChip key={value}>{value}</ComboboxChip>
              ))}
              <ComboboxChipsInput aria-label="Tools" placeholder="Add tool" />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No tools found.</ComboboxEmpty>
        <ComboboxList aria-label="Tools">
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export const Multiple: Story = {
  render: () => <MultipleTools />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Tools" })
    await userEvent.click(input)
    await userEvent.keyboard("git{Enter}")
    await waitFor(() => expect(canvas.getByText("GitHub")).toBeVisible())
    await userEvent.keyboard("{Escape}")
    // Backspace in an empty input removes the last chip.
    await userEvent.keyboard("{Backspace}")
    await waitFor(() => expect(canvas.queryByText("GitHub")).toBeNull())
    await expect(canvas.getByText("Shell")).toBeVisible()
  },
}

const families = [
  { value: "Claude", items: ["claude-opus", "claude-sonnet", "claude-haiku"] },
  { value: "GPT", items: ["gpt-5", "gpt-5-mini", "gpt-4.1"] },
  { value: "Gemini", items: ["gemini-pro", "gemini-flash"] },
]

/**
 * Many to choose from, in the page (`inline`): a checkbox before each,
 * there before it is chosen. The arrows go through them from the search
 * field and Enter chooses; a group's are chosen together from a menu
 * outside the list (a listbox holds only options), of those the search
 * shows.
 */
function ManyToChoose() {
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState<string[]>(["claude-sonnet"])
  const shown = families
    .map((family) => ({
      ...family,
      items: family.items.filter((item) => item.includes(query.trim())),
    }))
    .filter((family) => family.items.length > 0)
  const visible = shown.flatMap((family) => family.items)
  const choose = (items: string[], on: boolean) =>
    setChosen((now) =>
      on
        ? [...new Set([...now, ...items])]
        : now.filter((item) => !items.includes(item))
    )
  return (
    <div className="flex w-80 flex-col gap-2">
      <Combobox
        inline
        multiple
        items={shown}
        filter={null}
        inputValue={query}
        onInputValueChange={setQuery}
        value={chosen}
        onValueChange={setChosen}
      >
        <div className="flex gap-2">
          <ComboboxInput
            aria-label="Search models"
            placeholder="Search models"
            showTrigger={false}
            className="flex-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Groups
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Choose a group's shown models
                </DropdownMenuLabel>
                {shown.map((family) => {
                  const all = family.items.every((item) =>
                    chosen.includes(item)
                  )
                  const some = family.items.filter((item) =>
                    chosen.includes(item)
                  ).length
                  return (
                    <DropdownMenuCheckboxItem
                      key={family.value}
                      checked={all}
                      onCheckedChange={(on) => choose(family.items, on)}
                    >
                      {family.value}
                      <span className="ms-auto text-muted-foreground">
                        {some}/{family.items.length}
                      </span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ComboboxList aria-label="Models" className="rounded-lg border">
          {(group: (typeof families)[number]) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(item: string) => (
                  <ComboboxItem key={item} value={item} indicator="checkbox">
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </Combobox>
      <div className="flex items-center gap-2 text-sm">
        <span className="me-auto text-muted-foreground">
          {chosen.length} chosen
        </span>
        <Button variant="ghost" size="sm" onClick={() => choose(visible, true)}>
          Choose shown
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setChosen([])}>
          Clear
        </Button>
      </div>
    </div>
  )
}

export const CheckboxIndicator: Story = {
  render: () => <ManyToChoose />,
  play: async ({ canvas }) => {
    const box = (name: string) =>
      canvas
        .getByRole("option", { name })
        .querySelector<HTMLElement>("[data-slot=combobox-item-checkbox]")!
    // Its tick shows, in the box's text colour, also on the highlighted
    // item, whose descendants take the highlight's colour.
    const tick = (() => {
      const probe = document.createElement("span")
      probe.style.color = "var(--primary-foreground)"
      canvas.getByRole("listbox").append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    })()
    const filled = (name: string) =>
      getComputedStyle(box(name).querySelector("svg")!).display !== "none" &&
      getComputedStyle(box(name).querySelector("path")!).stroke === tick

    // Each has its box, chosen or not; the chosen one is filled.
    await expect(box("claude-opus")).toBeVisible()
    await expect(box("claude-opus")).toHaveAttribute("aria-hidden", "true")
    await expect(filled("claude-opus")).toBe(false)
    await expect(filled("claude-sonnet")).toBe(true)
    await expect(
      canvas.getByRole("option", { name: "claude-sonnet" })
    ).toHaveAttribute("aria-selected", "true")
    await expect(
      getComputedStyle(box("claude-sonnet")).backgroundColor
    ).not.toBe(getComputedStyle(box("claude-opus")).backgroundColor)
    // The box comes first, before the name.
    const option = canvas.getByRole("option", { name: "claude-opus" })
    await expect(option.firstElementChild).toBe(box("claude-opus"))

    // From the search field: the arrows, and Enter chooses.
    const input = canvas.getByRole("combobox", { name: "Search models" })
    await userEvent.click(input)
    await userEvent.keyboard("gpt{ArrowDown}{Enter}")
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: "gpt-5" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    )
    // Chosen while highlighted: the tick shows on the highlight too.
    await expect(canvas.getByRole("option", { name: "gpt-5" })).toHaveAttribute(
      "data-highlighted"
    )
    await expect(filled("gpt-5")).toBe(true)
    await expect(input).toHaveFocus()

    // A group's shown models, from the menu outside the list.
    await userEvent.clear(input)
    await userEvent.type(input, "5-mini")
    await waitFor(() => expect(canvas.getAllByRole("option")).toHaveLength(1))
    await userEvent.click(canvas.getByRole("button", { name: "Groups" }))
    await userEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: /GPT/ })
    )
    await waitFor(() =>
      expect(canvas.getByText("3 chosen")).toBeInTheDocument()
    )
    // Only the shown one: gpt-4.1 is not.
    await userEvent.keyboard("{Escape}")
    await userEvent.clear(input)
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: "gpt-4.1" })).toHaveAttribute(
        "aria-selected",
        "false"
      )
    )
    await expect(filled("gpt-5-mini")).toBe(true)
  },
}
