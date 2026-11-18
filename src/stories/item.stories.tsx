import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  BubbleChatIcon,
  Delete02Icon,
  InboxIcon,
  PinIcon,
  Robot01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent } from "storybook/test"
import { onRows } from "@/stories/grid-lines"

import { SearchHighlight } from "@/components/search-highlight"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemGroupLabel,
  ItemHeader,
  ItemLink,
  ItemMeta,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"

const meta = {
  title: "Components/Item",
  component: Item,
  args: { variant: "default", size: "default" },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["default", "outline", "muted"],
    },
    size: { control: "inline-radio", options: ["default", "sm", "xs"] },
  },
  decorators: [
    (Story) => (
      <div className="flex w-md flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Item>

export default meta
type Story = StoryObj<typeof meta>

const onAction = fn()

export const Default: Story = {
  render: (args) => (
    <>
      <Item {...args}>
        <ItemContent>
          <ItemTitle>Title only</ItemTitle>
        </ItemContent>
      </Item>
      <Item {...args}>
        <ItemContent>
          <ItemTitle>Title + description</ItemTitle>
          <ItemDescription>
            A description that provides additional context.
          </ItemDescription>
        </ItemContent>
      </Item>
      <Item {...args}>
        <ItemMedia variant="icon">
          <HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Media + title + description + button</ItemTitle>
          <ItemDescription>
            Complete item with media, title, description, and a button.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" onClick={onAction}>
            Action
          </Button>
        </ItemActions>
      </Item>
      <Item {...args}>
        <ItemContent>
          <ItemTitle>Multiple actions</ItemTitle>
          <ItemDescription>
            Item with two buttons in its actions.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button size="sm">Confirm</Button>
        </ItemActions>
      </Item>
    </>
  ),
  play: async ({ canvas }) => {
    onAction.mockClear()
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Action" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(onAction).toHaveBeenCalledOnce()
  },
}

export const Outline: Story = { ...Default, args: { variant: "outline" } }

export const Muted: Story = { ...Default, args: { variant: "muted" } }

export const Small: Story = {
  ...Default,
  args: { variant: "outline", size: "sm" },
}

export const ExtraSmall: Story = {
  ...Default,
  args: { variant: "outline", size: "xs" },
}

/** `render` makes the whole item a link. */
export const AsLink: Story = {
  render: (args) => (
    <nav aria-label="Workspace" className="flex flex-col gap-2">
      <Item {...args} render={<a href="#chats" />}>
        <ItemMedia variant="icon">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Chats</ItemTitle>
          <ItemDescription>
            Every conversation with your agents.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-4 rtl:rotate-180"
          />
        </ItemActions>
      </Item>
      <Item {...args} render={<a href="#agents" />}>
        <ItemMedia variant="icon">
          <HugeiconsIcon icon={Robot01Icon} strokeWidth={2} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Agents</ItemTitle>
          <ItemDescription>Models, prompts and tools.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-4 rtl:rotate-180"
          />
        </ItemActions>
      </Item>
    </nav>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole("link", { name: /Chats/ })).toHaveFocus()
    await userEvent.tab()
    await expect(canvas.getByRole("link", { name: /Agents/ })).toHaveFocus()
  },
}

/** `render={<button />}`: a row the app acts on, as a link answers. */
export const AsButton: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Item {...args} render={<button type="button" onClick={onAction} />}>
        <ItemMedia variant="icon">
          <HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Inbox</ItemTitle>
          <ItemDescription>What the agents left for you.</ItemDescription>
        </ItemContent>
      </Item>
      <Item {...args} render={<button type="button" disabled />}>
        <ItemContent>
          <ItemTitle>Archive</ItemTitle>
          <ItemDescription>Nothing archived yet.</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
  play: async ({ canvas }) => {
    const inbox = canvas.getByRole("button", { name: /Inbox/ })
    await expect(getComputedStyle(inbox).textAlign).toBe("start")
    // Hovered and pressed, as a pointer would: a script's pointer is not
    // one the style sheets see.
    await expect(stateBackground(inbox, ":hover")).toBeTruthy()
    await expect(stateBackground(inbox, ":active")).toBeTruthy()
    await userEvent.click(inbox)
    await expect(onAction).toHaveBeenCalled()
    await expect(
      getComputedStyle(canvas.getByRole("button", { name: /Archive/ })).opacity
    ).toBe("0.5")
  },
}

/** The background the style sheets give `element` in a `state` of its own. */
function stateBackground(element: Element, state: ":hover" | ":active") {
  let background = ""
  const visit = (rules: CSSRuleList, parent: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const selector = parent
          ? rule.selectorText.replaceAll("&", parent)
          : rule.selectorText
        // The state itself, not a class's name escaping it.
        const own = new RegExp(`(?<!\\\\)${state}`, "g")
        if (own.test(selector) && rule.style.backgroundColor)
          try {
            if (element.matches(selector.replace(own, "")))
              background = rule.style.backgroundColor
          } catch {
            // A selector this browser does not take.
          }
        visit(rule.cssRules, selector)
      } else if ("cssRules" in rule)
        visit((rule as CSSGroupingRule).cssRules, parent)
    }
  }
  for (const sheet of Array.from(document.styleSheets))
    try {
      visit(sheet.cssRules, "")
    } catch {
      // Another origin's.
    }
  return background
}

const tools = [
  { name: "Web search", description: "Searches the web for a query." },
  { name: "Code runner", description: "Runs code in a sandbox." },
  { name: "File reader", description: "Reads files from the workspace." },
]

/** ItemGroup is a list, so each Item takes role="listitem". */
export const Group: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <ItemGroup aria-label="Tools">
      {tools.map((tool) => (
        <Item key={tool.name} {...args} role="listitem">
          <ItemMedia variant="icon">
            <HugeiconsIcon icon={Wrench01Icon} strokeWidth={2} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{tool.name}</ItemTitle>
            <ItemDescription>{tool.description}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list", { name: "Tools" })
    await expect(list.querySelectorAll("[role=listitem]")).toHaveLength(3)
    await onRows("items", [...list.querySelectorAll("[data-slot=item]")], {
      icon: (row) => row.querySelector("[data-slot=item-media] svg"),
      title: (row) => row.querySelector("[data-slot=item-title]"),
      description: (row) => row.querySelector("[data-slot=item-description]"),
      "end:action": (row) =>
        [...row.querySelectorAll("[data-slot=item-actions] button")].at(-1),
    })
  },
}

/**
 * Numbered rows (a list of sources in order): each number on a round
 * mark of one width, so the names start on one line from 1 to 12.
 */
export const Numbered: Story = {
  args: { size: "compact" },
  render: (args) => (
    <ItemGroup aria-label="Search sources">
      {[
        "Brave",
        "Bing",
        "Google",
        "Kagi",
        "Exa",
        "Tavily",
        "Jina",
        "SerpAPI",
        "You",
        "DuckDuckGo",
        "Perplexity",
        "Searx",
      ].map((name, index) => (
        <Item key={name} {...args} role="listitem">
          <ItemMedia variant="number">{index + 1}</ItemMedia>
          <ItemContent>
            <ItemTitle>{name}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  ),
  play: async ({ canvas }) => {
    const rows = [
      ...canvas
        .getByRole("list", { name: "Search sources" })
        .querySelectorAll("[data-slot=item]"),
    ]
    await onRows("numbered", rows, {
      // The mark's box, not its digits: they are centred in it.
      number: (row) =>
        row.querySelector("[data-slot=item-media]")!.getBoundingClientRect()
          .left,
      name: (row) => row.querySelector("[data-slot=item-title]"),
    })
    const widths = rows.map(
      (row) =>
        row.querySelector("[data-slot=item-media]")!.getBoundingClientRect()
          .width
    )
    await expect(new Set(widths).size).toBe(1)
    await expect(widths[0]).toBe(20)
  },
}

export const WithSeparator: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <ItemGroup aria-label="Mailboxes">
      {["Inbox", "Sent", "Drafts"].map((name, index) => (
        <div key={name} role="listitem">
          {index > 0 && <ItemSeparator />}
          <Item {...args}>
            <ItemMedia variant="icon">
              <HugeiconsIcon icon={InboxIcon} strokeWidth={2} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{name}</ItemTitle>
              <ItemDescription>
                View {name.toLowerCase()} messages.
              </ItemDescription>
            </ItemContent>
          </Item>
        </div>
      ))}
    </ItemGroup>
  ),
}

export const HeaderAndFooter: Story = {
  render: (args) => (
    <>
      {(["default", "outline", "muted"] as const).map((variant) => (
        <Item key={variant} {...args} variant={variant}>
          <ItemHeader>
            <span className="text-sm font-medium">Research agent</span>
          </ItemHeader>
          <ItemContent>
            <ItemTitle>Market summary</ItemTitle>
            <ItemDescription>
              Collected 24 sources and wrote a two-page summary.
            </ItemDescription>
          </ItemContent>
          <ItemFooter>
            <span className="text-sm text-muted-foreground">
              Finished 5 minutes ago
            </span>
          </ItemFooter>
        </Item>
      ))}
    </>
  ),
}

const avatar =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#52525b"/><circle cx="4" cy="4" r="2" fill="#e4e4e7"/></svg>'
  )

export const WithImage: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <>
      {(["default", "sm", "xs"] as const).map((size) => (
        <Item key={size} {...args} size={size}>
          <ItemMedia variant="image">
            <img src={avatar} alt="Planner agent" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Planner</ItemTitle>
            <ItemDescription>Breaks tasks into steps.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Open
            </Button>
          </ItemActions>
        </Item>
      ))}
    </>
  ),
}

const results = [
  {
    id: "c1",
    href: "#c1",
    title: "Cache images by content",
    when: "2h",
    snippet: "…keyed by a hash of the image, so the cache survives a rename…",
  },
  {
    id: "c2",
    href: "#c2",
    title: "Evict the image cache on deploy",
    when: "1d",
    snippet: "…the cache is cleared once the new build is live…",
  },
  {
    id: "c3",
    href: undefined,
    title: "Draft: image cache sizes",
    when: "3d",
    snippet: "…how large the cache may grow before it evicts…",
  },
]

/**
 * Rows with actions, e.g. search results or a list of conversations: the
 * title a link stretched over the row, so the whole row opens it, the
 * buttons in `ItemActions` above it; a snippet a second description, its
 * matches marked by `SearchHighlight`. A row with no address is no link.
 */
export const RowsWithActions: Story = {
  args: { size: "sm" },
  render: (args) => (
    <ItemGroup aria-label="Results">
      {results.map((result) => (
        <Item key={result.id} {...args} role="listitem">
          <ItemContent>
            <ItemTitle>
              {result.href ? (
                // The link's area is the row's; its focus ring round the row.
                <ItemLink href={result.href}>{result.title}</ItemLink>
              ) : (
                result.title
              )}
            </ItemTitle>
            <ItemDescription>{result.when}</ItemDescription>
            <ItemDescription>
              <SearchHighlight terms={["cache"]}>
                {result.snippet}
              </SearchHighlight>
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Pin ${result.title}`}
              onClick={onAction}
            >
              <HugeiconsIcon icon={PinIcon} strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${result.title}`}
              onClick={onAction}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    await onRows(
      "rows",
      [...canvasElement.querySelectorAll("[data-slot=item]")],
      {
        title: (row) => row.querySelector("[data-slot=item-title]"),
        "end:action": (row) =>
          [...row.querySelectorAll("[data-slot=item-actions] button")].at(-1),
      }
    )
    const link = canvas.getByRole("link", { name: "Cache images by content" })
    const row = link.closest<HTMLElement>("[data-slot=item]")!
    // Anywhere on the row but its buttons is the link.
    const description = row.querySelectorAll("[data-slot=item-description]")[1]!
    const box = description.getBoundingClientRect()
    await expect(
      document.elementFromPoint(box.left + 4, box.top + box.height / 2)
    ).toBe(link)
    const pin = canvas.getByRole("button", {
      name: "Pin Cache images by content",
    })
    const at = pin.getBoundingClientRect()
    await expect(
      document
        .elementFromPoint(at.left + at.width / 2, at.top + at.height / 2)
        ?.closest("button")
    ).toBe(pin)
    // In the tab order: the link, then its buttons.
    await userEvent.tab()
    await expect(link).toHaveFocus()
    // Its ring round the row.
    await expect(getComputedStyle(link, "::after").boxShadow).not.toBe("none")
    await expect(getComputedStyle(link, "::after").position).toBe("absolute")
    await expect(getComputedStyle(row).position).toBe("relative")
    await userEvent.tab()
    await expect(pin).toHaveFocus()
    // No address, no link.
    await expect(
      canvas.queryByRole("link", { name: "Draft: image cache sizes" })
    ).toBeNull()
  },
}

/**
 * A master–detail list: the entry open beside it is the current one
 * (aria-current), on the hover's grey, kept; a selected option
 * (aria-selected) and a row marked data-active too.
 */
export const Current: Story = {
  args: { size: "sm" },
  render: (args) => (
    <ItemGroup aria-label="Keys">
      {["Production", "Staging", "Local"].map((name, index) => (
        <div key={name} role="listitem">
          <Item
            {...args}
            render={<a href={`#${name}`} />}
            aria-current={index === 1 ? "page" : undefined}
          >
            <ItemContent>
              <ItemTitle>{name}</ItemTitle>
            </ItemContent>
          </Item>
        </div>
      ))}
    </ItemGroup>
  ),
  play: async ({ canvas }) => {
    const background = (name: string) =>
      getComputedStyle(canvas.getByText(name).closest("[data-slot=item]")!)
        .backgroundColor
    const muted = getComputedStyle(document.documentElement)
      .getPropertyValue("--muted")
      .trim()
    await expect(muted).not.toBe("")
    await expect(background("Staging")).not.toBe(background("Production"))
    await expect(background("Production")).toBe("rgba(0, 0, 0, 0)")
  },
}

const runs = [
  { day: "Today", title: "Fix the slow deploy", cost: "$0.42", time: "2m" },
  { day: "Today", title: "Clamp styles", cost: "$12.08", time: "1h" },
  { day: "Yesterday", title: "Rate limits", cost: "$3.10", time: "23h" },
  { day: "Yesterday", title: "A long question", cost: "$0.07", time: "1d" },
]

/**
 * Facts in columns across the rows, without a table: an ItemGroup with
 * `columns` (two here: a cost and a time), each `ItemMeta` in the
 * column of its fact, as wide as its widest; runs of rows under a
 * subheading (`ItemGroupLabel`), the columns going on across them.
 */
export const Columns: Story = {
  args: { size: "sm" },
  render: (args) => (
    <ItemGroup aria-label="Runs" columns={2}>
      {runs.map((run, index) => (
        <React.Fragment key={run.title}>
          {run.day !== runs[index - 1]?.day && (
            <ItemGroupLabel role="presentation">{run.day}</ItemGroupLabel>
          )}
          <Item {...args} role="listitem">
            <ItemContent>
              <ItemTitle>{run.title}</ItemTitle>
            </ItemContent>
            <ItemMeta>{run.cost}</ItemMeta>
            <ItemMeta>{run.time}</ItemMeta>
          </Item>
        </React.Fragment>
      ))}
    </ItemGroup>
  ),
  play: async ({ canvasElement }) => {
    const items = Array.from(canvasElement.querySelectorAll("[data-slot=item]"))
    const metas = items.map((item) =>
      Array.from(item.querySelectorAll("[data-slot=item-meta]")).map((meta) => {
        // Whole pixels: Firefox's subgrid lands a hair off them.
        const box = meta.getBoundingClientRect()
        return { left: Math.round(box.left), right: Math.round(box.right) }
      })
    )
    // Each fact's column: the same edges in every row.
    for (const row of metas) {
      await expect(row[0]!.left).toBe(metas[0]![0]!.left)
      await expect(row[0]!.right).toBe(metas[0]![0]!.right)
      await expect(row[1]!.left).toBe(metas[0]![1]!.left)
    }
    // As wide as its widest ("$12.08"), 16px apart.
    await expect(metas[0]![1]!.left - metas[0]![0]!.right).toBe(16)
    // The subheadings where the rows' words start, the second 16px over.
    const labels = Array.from(
      canvasElement.querySelectorAll("[data-slot=item-group-label]")
    )
    await expect(labels).toHaveLength(2)
    const words = Math.round(
      items[0]!.querySelector("[data-slot=item-title]")!.getBoundingClientRect()
        .left
    )
    // Past a 1px edge, as an item's, and its 12px.
    await expect(Math.round(labels[0]!.getBoundingClientRect().left) + 13).toBe(
      words
    )
    await expect(getComputedStyle(labels[1]!).paddingTop).toBe("16px")
  },
}

/**
 * A title with a part cut short (a project and its long path): cut in its
 * column, not run over the facts beside it.
 */
export const ColumnsLongTitle: Story = {
  args: { size: "sm" },
  render: (args) => (
    <ItemGroup aria-label="Projects" columns={1} className="w-120">
      <Item {...args} role="listitem">
        <ItemContent>
          <ItemTitle>
            <span className="shrink-0">agent-ui</span>
            <span className="min-w-0 truncate font-normal text-muted-foreground">
              ~/code/agent-ui/packages/registry
            </span>
          </ItemTitle>
        </ItemContent>
        <ItemMeta>main</ItemMeta>
      </Item>
    </ItemGroup>
  ),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector("[data-slot=item-title]")!
    const content = canvasElement.querySelector("[data-slot=item-content]")!
    const meta = canvasElement.querySelector("[data-slot=item-meta]")!
    await expect(
      Math.round(title.getBoundingClientRect().right)
    ).toBeLessThanOrEqual(Math.round(content.getBoundingClientRect().right))
    await expect(
      Math.round(title.getBoundingClientRect().right)
    ).toBeLessThanOrEqual(Math.round(meta.getBoundingClientRect().left))
  },
}

/**
 * `size="compact"`, for a long list (devices, people, results): rows
 * 32px, 8px in, no outline, touching; each hovered where its link is,
 * its buttons above the link.
 */
export const Compact: Story = {
  args: { size: "compact", variant: "outline" },
  render: (args) => (
    <ItemGroup aria-label="Devices">
      {["Laptop", "linux-box", "Phone"].map((name) => (
        <Item key={name} {...args} role="listitem">
          <ItemContent>
            <ItemTitle>
              <ItemLink href={`#${name}`}>{name}</ItemLink>
            </ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button variant="ghost" size="icon-sm" aria-label={`Pin ${name}`}>
              <HugeiconsIcon icon={PinIcon} strokeWidth={2} />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    const rows = Array.from(
      canvasElement.querySelectorAll<HTMLElement>("[data-slot=item]")
    )
    await onRows("compact rows", rows, {
      title: (row) => row.querySelector("[data-slot=item-title]"),
      "end:action": (row) =>
        [...row.querySelectorAll("[data-slot=item-actions] button")].at(-1),
    })
    for (const row of rows)
      await expect(row.getBoundingClientRect().height).toBe(32)
    await expect(
      rows[1]!.getBoundingClientRect().top -
        rows[0]!.getBoundingClientRect().bottom
    ).toBe(0)
    // No outline, though its variant has one.
    await expect(getComputedStyle(rows[0]!).borderTopColor).toBe(
      "rgba(0, 0, 0, 0)"
    )
    const link = canvas.getByRole("link", { name: "linux-box" })
    await expect(
      Math.round(link.getBoundingClientRect().left) -
        Math.round(rows[1]!.getBoundingClientRect().left)
    ).toBe(9)
    // Hovered where its link is (synthetic events cannot hover: the
    // rule, then).
    const rules = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules)
      } catch {
        return []
      }
    })
    const all = (list: CSSRule[]): CSSRule[] =>
      list.flatMap((rule) => [
        rule,
        ...("cssRules" in rule
          ? all(Array.from((rule as CSSGroupingRule).cssRules))
          : []),
      ])
    await expect(
      all(rules).some(
        (rule) =>
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes("item-link") &&
          rule.selectorText.includes(":hover") &&
          rule.style.backgroundColor !== ""
      )
    ).toBe(true)
  },
}
