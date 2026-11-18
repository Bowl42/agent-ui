import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BubbleChatIcon,
  Edit02Icon,
  SecurityCheckIcon,
  ShieldEnergyIcon,
  TaskDone01Icon,
} from "@hugeicons/core-free-icons"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import {
  Composer,
  ComposerEditor,
  ComposerSubmit,
  ComposerToolbar,
} from "@/components/composer"
import {
  ComposerModePicker,
  ComposerOptionButton,
  ComposerSelect,
  ComposerSelectContent,
  ComposerSelectItem,
  ComposerSelectList,
  ComposerSelectTrigger,
  ComposerSelectValue,
} from "@/components/composer-select"

/** The app's modes, as it words them. */
const modes = [
  {
    value: "agent",
    label: "Agent",
    description: "Reads, edits and runs commands.",
    icon: Edit02Icon,
  },
  {
    value: "plan",
    label: "Plan",
    description: "Reads and plans; changes nothing.",
    icon: TaskDone01Icon,
  },
  {
    value: "ask",
    label: "Ask",
    description: "Answers from what it reads.",
    icon: BubbleChatIcon,
  },
]

/** A composer with a mode picker in its toolbar; the app keeps the choice. */
function Demo({
  onValueChange,
  more = 0,
  popups,
}: {
  onValueChange: (value: string) => void
  /** Modes past the three, for a list longer than the room above. */
  more?: number
  popups?: "composer" | "trigger"
}) {
  const [mode, setMode] = React.useState("agent")
  const items = [
    ...modes,
    ...Array.from({ length: more }, (_, index) => ({
      value: `mode-${index + 1}`,
      label: `Mode ${index + 1}`,
      description: "One of many.",
      icon: TaskDone01Icon,
    })),
  ]
  const label = modes.find((item) => item.value === mode)?.label
  return (
    <div className="flex w-2xl max-w-full flex-col pt-72">
      <Composer {...(popups ? { popups } : {})}>
        <ComposerEditor aria-label="Message" placeholder="Ask anything" />
        <ComposerToolbar>
          <ComposerSelect
            value={mode}
            onValueChange={(next) => {
              onValueChange(next)
              setMode(next)
            }}
          >
            <ComposerSelectTrigger aria-label={`Mode: ${label}`}>
              <ComposerSelectValue>{label}</ComposerSelectValue>
            </ComposerSelectTrigger>
            <ComposerSelectContent title="Mode">
              <ComposerSelectList aria-label="Mode">
                {items.map((item) => (
                  <ComposerSelectItem
                    key={item.value}
                    value={item.value}
                    description={item.description}
                    icon={<HugeiconsIcon icon={item.icon} strokeWidth={2} />}
                  >
                    {item.label}
                  </ComposerSelectItem>
                ))}
              </ComposerSelectList>
            </ComposerSelectContent>
          </ComposerSelect>
          <ComposerSubmit className="ms-auto" />
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

const meta = {
  title: "Components/Composer Select",
  component: Demo,
  parameters: { layout: "centered" },
  args: { onValueChange: fn() },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The trigger says the choice; its list opens over the composer, the
 * chosen item ticked and focused. Arrows move, Enter chooses and closes,
 * and the focus goes back to the trigger.
 */
export const Default: Story = {
  play: async ({ canvas, args }) => {
    const trigger = canvas.getByRole("button", { name: "Mode: Agent" })
    await userEvent.click(trigger)
    const list = await screen.findByRole("listbox", { name: "Mode" })
    const agent = within(list).getByRole("option", { name: /^Agent/ })
    await waitFor(() => expect(agent).toHaveFocus())
    await expect(agent).toHaveAttribute("aria-selected", "true")
    await expect(agent).toHaveAccessibleName(
      "Agent Reads, edits and runs commands."
    )

    const tick = agent.querySelector("svg:last-child")!
    const description = agent.querySelector(
      "[data-slot=composer-select-item-description]"
    )!
    // Resolve the theme colour through the browser's computed colour format.
    const probe = document.createElement("span")
    probe.style.color = "var(--subtle-foreground)"
    description.append(probe)
    try {
      await waitFor(() => {
        expect(tick.getBoundingClientRect().width).toBe(14)
        expect(getComputedStyle(tick).color).toBe(getComputedStyle(probe).color)
        expect(getComputedStyle(tick).visibility).toBe("visible")
      })
    } finally {
      probe.remove()
    }
    const unchecked = within(list).getByRole("option", { name: /^Plan/ })
    await expect(
      getComputedStyle(unchecked.querySelector("svg:last-child")!).visibility
    ).toBe("hidden")

    // The labels start in one column, the ticks end in one.
    const options = within(list).getAllByRole("option")
    const left = (element: Element) =>
      Math.round(element.getBoundingClientRect().left)
    await expect(
      new Set(options.map((option) => left(option.querySelector("span")!))).size
    ).toBe(1)

    await userEvent.keyboard("{ArrowDown}")
    await expect(
      within(list).getByRole("option", { name: /^Plan/ })
    ).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("plan")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Mode: Plan" })).toHaveFocus()
    )
  },
}

/** Opened 8px clear of the composer by default, never over its text. */
export const ClearOfTheComposer: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mode: Agent" }))
    const popup = await screen.findByRole("dialog")
    await waitFor(() => expect(document.getAnimations()).toHaveLength(0))
    const composer = canvasElement
      .querySelector("[data-slot=input-group]")!
      .getBoundingClientRect()
    await expect(
      Math.round(composer.top - popup.getBoundingClientRect().bottom)
    ).toBe(8)
  },
}

/** `popups="trigger"`: by the button that opened it, over the text. */
export const ByTheTrigger: Story = {
  args: { popups: "trigger" },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Mode: Agent" })
    await userEvent.click(trigger)
    const popup = await screen.findByRole("dialog")
    await waitFor(() => expect(document.getAnimations()).toHaveLength(0))
    await expect(
      Math.round(
        trigger.getBoundingClientRect().top -
          popup.getBoundingClientRect().bottom
      )
    ).toBe(4)
  },
}

/** Open, for a look at its items: label, description, tick. */
export const Open: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mode: Agent" }))
    await screen.findByRole("listbox", { name: "Mode" })
    await userEvent.hover(screen.getByRole("option", { name: /^Plan/ }))
  },
}

/** Escape closes it without a change. */
export const Escape: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mode: Agent" }))
    await screen.findByRole("listbox", { name: "Mode" })
    await userEvent.keyboard("{ArrowDown}{Escape}")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await expect(args.onValueChange).not.toHaveBeenCalled()
  },
}

/**
 * Longer than the room above the composer: no taller than it, the rest
 * scrolled to; the chosen item in sight.
 */
export const LongList: Story = {
  args: { more: 30 },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mode: Agent" }))
    const list = await screen.findByRole("listbox", { name: "Mode" })
    const popup = list.closest<HTMLElement>(
      "[data-slot=composer-select-content]"
    )!
    await waitFor(() =>
      expect(popup.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
    )
    const body = list.parentElement!
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
    // Of so many, its search has the focus (once it is in the popup, a
    // frame after it opens: a key before then goes to the trigger).
    const search = screen.getByRole("searchbox", { name: "Search" })
    await waitFor(() => expect(search).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(within(list).getAllByRole("option")[0]).toHaveFocus()
    )
    await userEvent.keyboard("{End}")
    const last = screen.getByRole("option", { name: /^Mode 30/ })
    await waitFor(() =>
      expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        popup.getBoundingClientRect().bottom + 1
      )
    )
    // The search stays at the top as the items scroll under it.
    await expect(search.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      popup.getBoundingClientRect().top
    )
  },
}

/** On a phone, a sheet from the bottom with its title and Done. */
export const Phone: Story = {
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
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mode: Agent" }))
    const sheet = within(await screen.findByRole("dialog", { name: "Mode" }))
    await userEvent.click(sheet.getByRole("option", { name: /^Ask/ }))
    await expect(args.onValueChange).toHaveBeenCalledWith("ask")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    await userEvent.click(canvas.getByRole("button", { name: "Mode: Ask" }))
    const again = within(await screen.findByRole("dialog", { name: "Mode" }))
    await userEvent.click(again.getByRole("button", { name: "Done" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

/**
 * A mode that lets the agent act unasked (`tone="destructive"`): chosen,
 * the toolbar says so in the destructive colour, its icon too, and its
 * icon in the list; the others stay grey.
 */
export const DestructiveMode: Story = {
  render: function Render() {
    const [mode, setMode] = React.useState("full")
    return (
      <div className="w-xl">
        <Composer>
          <ComposerEditor aria-label="Message" placeholder="Ask anything" />
          <ComposerToolbar>
            <ComposerModePicker
              modes={[
                {
                  value: "ask",
                  label: "Ask first",
                  description: "Asks before it edits or runs a command",
                  icon: <HugeiconsIcon icon={SecurityCheckIcon} />,
                },
                {
                  value: "full",
                  label: "Full access",
                  description:
                    "Edits files, runs commands and uses the network without asking",
                  icon: <HugeiconsIcon icon={ShieldEnergyIcon} />,
                  tone: "destructive",
                },
              ]}
              value={mode}
              onValueChange={setMode}
            />
            <ComposerSubmit />
          </ComposerToolbar>
        </Composer>
        <span data-testid="destructive" className="text-destructive" />
      </div>
    )
  },
  play: async ({ canvas }) => {
    const red = getComputedStyle(canvas.getByTestId("destructive")).color
    const trigger = canvas.getByRole("button", {
      name: "Permissions: Full access",
    })
    await expect(getComputedStyle(trigger).color).toBe(red)
    await expect(getComputedStyle(trigger.querySelector("svg")!).color).toBe(
      red
    )
    await userEvent.click(trigger)
    const list = await screen.findByRole("listbox")
    await expect(
      getComputedStyle(
        within(list)
          .getByRole("option", { name: /^Full access/ })
          .querySelector("svg")!
      ).color
    ).toBe(red)
    await userEvent.click(
      within(list).getByRole("option", { name: /^Ask first/ })
    )
    const ask = await canvas.findByRole("button", {
      name: "Permissions: Ask first",
    })
    await expect(getComputedStyle(ask).color).not.toBe(red)
  },
}

/** The modes of `ModeFooter` and `PhoneModeFooter`. */
function FooterPicker() {
  const [mode, setMode] = React.useState("ask")
  return (
    <div className="w-xl max-w-full">
      <Composer>
        <ComposerEditor aria-label="Message" placeholder="Ask anything" />
        <ComposerToolbar>
          <ComposerModePicker
            modes={[
              {
                value: "ask",
                label: "Ask first",
                description: "Asks before it edits or runs a command",
                icon: <HugeiconsIcon icon={SecurityCheckIcon} />,
              },
              {
                value: "full",
                label: "Full access",
                description:
                  "Edits files, runs commands and uses the network without asking",
                icon: <HugeiconsIcon icon={ShieldEnergyIcon} />,
                tone: "destructive",
              },
            ]}
            value={mode}
            onValueChange={setMode}
            footer={
              <>
                Applies to this conversation only ·{" "}
                <a href="https://example.com/modes">Learn more</a>
              </>
            }
          />
          <ComposerSubmit />
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

/**
 * A line under the modes (`footer`): small grey text about them past a
 * hairline, its link underlined, after the modes by Tab, the modes still
 * in the destructive colour where one is.
 */
export const ModeFooter: Story = {
  render: () => <FooterPicker />,
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Permissions: Ask first" })
    )
    const list = await screen.findByRole("listbox")
    const footer = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot=composer-select-footer]"
      )
      expect(found).toBeVisible()
      return found!
    })
    const link = within(footer).getByRole("link", { name: "Learn more" })
    await expect(footer).toHaveTextContent("Applies to this conversation only")
    // Under the list, as wide as the popup, past its hairline.
    await expect(footer.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      list.getBoundingClientRect().bottom - 1
    )
    await expect(getComputedStyle(footer).borderTopWidth).toBe("1px")
    await expect(getComputedStyle(footer).fontSize).toBe("12px")
    await expect(getComputedStyle(link).textDecorationLine).toBe("underline")
    // Grey text, not the list's.
    await expect(getComputedStyle(footer).color).not.toBe(
      getComputedStyle(list).color
    )
    // Tab goes from the chosen mode to the link.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(list).getByRole("option", { name: /^Ask first/ })
      )
    )
    await userEvent.tab()
    await expect(link).toHaveFocus()
  },
}

/** The footer at the sheet's foot on a phone, above the home indicator. */
export const PhoneModeFooter: Story = {
  ...Phone,
  render: () => <FooterPicker />,
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Permissions: Ask first" })
    )
    const sheet = await screen.findByRole("dialog", { name: "Permissions" })
    const footer = sheet.querySelector<HTMLElement>(
      "[data-slot=composer-select-footer]"
    )!
    await waitFor(() => expect(footer).toBeVisible())
    await expect(
      within(footer).getByRole("link", { name: "Learn more" })
    ).toBeVisible()
    const list = within(sheet).getByRole("listbox")
    await expect(footer.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      list.getBoundingClientRect().bottom - 1
    )
  },
}

/**
 * The mode picker in the app's words, on a phone too: its sheet's
 * title, and its Done button.
 */
export const ModePickerLabels: Story = {
  ...Phone,
  render: function Render() {
    const [mode, setMode] = React.useState("ask")
    return (
      <Composer>
        <ComposerEditor aria-label="Message" />
        <ComposerToolbar>
          <ComposerModePicker
            modes={[
              { value: "ask", label: "Demander d'abord" },
              { value: "full", label: "Accès complet", tone: "destructive" },
            ]}
            value={mode}
            onValueChange={setMode}
            title="Autorisations"
            label={(mode) => `Autorisations : ${mode}`}
            doneLabel="Terminé"
          />
          <ComposerSubmit />
        </ComposerToolbar>
      </Composer>
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Autorisations : Demander d'abord" })
    )
    const sheet = within(
      await screen.findByRole("dialog", { name: "Autorisations" })
    )
    await userEvent.click(sheet.getByRole("button", { name: "Terminé" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

/**
 * A button in a trigger's look that opens something else (a dialog of
 * the app's): the same pill beside the composer's selects, one height,
 * one size and grey.
 */
export const OptionButton: Story = {
  render: () => (
    <div className="w-xl">
      <Composer>
        <ComposerEditor placeholder="Ask anything" aria-label="Message" />
        <ComposerToolbar>
          <ComposerSelect value="agent" onValueChange={() => {}}>
            <ComposerSelectTrigger aria-label="Mode: Agent">
              <ComposerSelectValue>Agent</ComposerSelectValue>
            </ComposerSelectTrigger>
            <ComposerSelectContent title="Mode">
              <ComposerSelectList aria-label="Mode">
                <ComposerSelectItem value="agent">Agent</ComposerSelectItem>
              </ComposerSelectList>
            </ComposerSelectContent>
          </ComposerSelect>
          <ComposerOptionButton chevron onClick={fn()}>
            Environment
          </ComposerOptionButton>
          <ComposerSubmit className="ms-auto" />
        </ComposerToolbar>
      </Composer>
    </div>
  ),
  play: async ({ canvas }) => {
    const select = canvas.getByRole("button", { name: "Mode: Agent" })
    const option = canvas.getByRole("button", { name: "Environment" })
    for (const property of [
      "height",
      "fontSize",
      "color",
      "borderRadius",
    ] as const)
      await expect(getComputedStyle(option)[property]).toBe(
        getComputedStyle(select)[property]
      )
    await expect(option.querySelector("svg")).not.toBeNull()
  },
}

const worktrees = Array.from({ length: 26 }, (_, index) => ({
  value: `wt-${index}`,
  label: index === 0 ? "main" : `feature/task-${index}`,
  description: `/work/repo/.worktrees/${index === 0 ? "main" : `task-${index}`}`,
  detail: index % 7 === 3 ? "Detached" : undefined,
  keywords: index === 12 ? ["release candidate"] : undefined,
}))

function Checkout({
  searchFrom,
  onValueChange,
}: {
  searchFrom?: number
  onValueChange?: (value: string) => void
}) {
  const [value, setValue] = React.useState("wt-5")
  const label = worktrees.find((item) => item.value === value)?.label
  return (
    <div className="flex w-2xl max-w-full flex-col pt-96">
      <Composer>
        <ComposerEditor aria-label="Message" placeholder="Ask anything" />
        <ComposerToolbar>
          <ComposerSelect
            value={value}
            onValueChange={(next) => {
              onValueChange?.(next)
              setValue(next)
            }}
          >
            <ComposerSelectTrigger aria-label={`Checkout: ${label}`}>
              <ComposerSelectValue>{label}</ComposerSelectValue>
            </ComposerSelectTrigger>
            <ComposerSelectContent title="Checkout">
              <ComposerSelectList
                aria-label="Checkout"
                {...(searchFrom !== undefined ? { searchFrom } : {})}
                labels={{ search: "Find a worktree", empty: "No worktree" }}
              >
                {worktrees.map((item) => (
                  <ComposerSelectItem
                    key={item.value}
                    value={item.value}
                    description={item.description}
                    detail={item.detail}
                    keywords={item.keywords}
                  >
                    {item.label}
                  </ComposerSelectItem>
                ))}
              </ComposerSelectList>
            </ComposerSelectContent>
          </ComposerSelect>
          <ComposerSubmit className="ms-auto" />
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

/**
 * Of more than 10 items, a search over them: it has the focus, filters
 * by label, description, detail and keywords in their order, the match
 * in the text's colour; ArrowDown goes to the items, typing on one back
 * to the search, Enter chooses the first; nothing found says so; the
 * chosen item, filtered out, stays chosen.
 */
export const Search: Story = {
  render: (args) => <Checkout onValueChange={args.onValueChange} />,
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Checkout: feature/task-5" })
    )
    const field = await screen.findByRole("searchbox", {
      name: "Find a worktree",
    })
    await waitFor(() => expect(field).toHaveFocus())
    const list = screen.getByRole("listbox", { name: "Checkout" })
    const shown = () => within(list).queryAllByRole("option")
    await expect(shown()).toHaveLength(26)

    await userEvent.keyboard("TASK-1")
    // task-1, task-10 … task-19, in their order.
    await waitFor(() => expect(shown()).toHaveLength(11))
    await expect(shown()[0]).toHaveTextContent(/^feature\/task-1\b/)
    await expect(
      shown()[0]!.querySelector("[data-slot=composer-select-match]")
    ).toHaveTextContent("task-1")
    // The match marked inside one run of text: not spaced from the rest.
    const label = shown()[1]!.querySelector(
      "[data-slot=composer-select-match]"
    )!.parentElement!
    await expect(getComputedStyle(label.parentElement!).display).toBe("flex")
    await expect(label.parentElement!.children).toHaveLength(1)
    // The chosen one is filtered out, and still chosen.
    await expect(list.querySelector("[data-value=wt-5]")).toHaveAttribute(
      "aria-selected",
      "true"
    )

    // By description and by keywords.
    await userEvent.clear(field)
    await userEvent.type(field, "worktrees/main")
    await waitFor(() => expect(shown()).toHaveLength(1))
    await userEvent.clear(field)
    await userEvent.type(field, "candidate")
    await waitFor(() => expect(shown()).toHaveLength(1))
    await expect(shown()[0]).toHaveTextContent(/^feature\/task-12/)

    // Nothing found.
    await userEvent.clear(field)
    await userEvent.type(field, "zzz")
    await expect(await screen.findByRole("status")).toHaveTextContent(
      "No worktree"
    )

    // Down to the items; typing on one goes back to the search.
    await userEvent.clear(field)
    await userEvent.type(field, "task-2")
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(shown()[0]).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    await expect(shown()[1]).toHaveFocus()
    await userEvent.keyboard("5")
    await waitFor(() => expect(field).toHaveFocus())
    await expect(field).toHaveValue("task-25")
    // Enter chooses the first shown.
    await userEvent.keyboard("{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("wt-25")
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "Checkout" })).toBeNull()
    )
  },
}

/** At or under `searchFrom` items, no search. */
export const SearchFrom: Story = {
  render: (args) => (
    <Checkout searchFrom={30} onValueChange={args.onValueChange} />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Checkout: feature/task-5" })
    )
    await screen.findByRole("listbox", { name: "Checkout" })
    await expect(screen.queryByRole("searchbox")).toBeNull()
  },
}

/** A few items until there is a search, then all; one that reads it. */
function CheckoutPinned({
  onValueChange,
}: {
  onValueChange?: (value: string) => void
}) {
  const [search, setSearch] = React.useState("")
  const items = search.trim() ? worktrees : worktrees.slice(0, 3)
  return (
    <div className="flex w-2xl max-w-full flex-col pt-96">
      <Composer>
        <ComposerEditor aria-label="Message" placeholder="Ask anything" />
        <ComposerToolbar>
          <ComposerSelect
            value="wt-0"
            onValueChange={onValueChange ?? fn()}
            // The search the app's: cleared by it as the select closes.
            onOpenChange={(open) => {
              if (!open) setSearch("")
            }}
          >
            <ComposerSelectTrigger aria-label="Checkout: main">
              <ComposerSelectValue>main</ComposerSelectValue>
            </ComposerSelectTrigger>
            <ComposerSelectContent title="Checkout">
              <ComposerSelectList
                aria-label="Checkout"
                searchFrom={0}
                search={search}
                onSearchChange={setSearch}
                labels={{ search: "Find a worktree", empty: "No worktree" }}
              >
                <ComposerSelectItem value="new" pinned>
                  {search.trim()
                    ? `New worktree ${search.trim()}`
                    : "New worktree"}
                </ComposerSelectItem>
                {items.map((item) => (
                  <ComposerSelectItem
                    key={item.value}
                    value={item.value}
                    description={item.description}
                  >
                    {item.label}
                  </ComposerSelectItem>
                ))}
              </ComposerSelectList>
            </ComposerSelectContent>
          </ComposerSelect>
          <ComposerSubmit className="ms-auto" />
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

/**
 * The search's text the app's: a few items without one, all with one. A
 * pinned item stays first whatever is searched for, its label unmarked,
 * and Enter chooses it; found nothing besides it says so.
 */
export const SearchPinned: Story = {
  render: (args) => <CheckoutPinned onValueChange={args.onValueChange} />,
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Checkout: main" })
    )
    const field = await screen.findByRole("searchbox", {
      name: "Find a worktree",
    })
    await waitFor(() => expect(field).toHaveFocus())
    const list = screen.getByRole("listbox", { name: "Checkout" })
    const shown = () => within(list).queryAllByRole("option")
    await expect(shown()).toHaveLength(4)

    await userEvent.keyboard("task-2")
    // task-2, task-20 … task-25, rendered for the search, under the pinned.
    await waitFor(() => expect(shown()).toHaveLength(8))
    await expect(shown()[0]).toHaveTextContent("New worktree task-2")
    await expect(
      shown()[0]!.querySelector("[data-slot=composer-select-match]")
    ).toBeNull()
    await expect(shown()[1]).toHaveTextContent(/^feature\/task-2\b/)

    await userEvent.clear(field)
    await userEvent.type(field, "zzz")
    await expect(await screen.findByRole("status")).toHaveTextContent(
      "No worktree"
    )
    await expect(shown()).toHaveLength(1)
    await expect(shown()[0]).toHaveTextContent("New worktree zzz")

    await userEvent.keyboard("{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("new")
  },
}
