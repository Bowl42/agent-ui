import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  HourglassIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { AgentApp, AgentAppHeader } from "@/components/agent-app/agent-app"
import {
  AgentAppSidebar,
  type AppSidebarProject,
} from "@/components/agent-app/agent-app-sidebar"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { asCoarse } from "@/stories/touch"
import { FoldProvider } from "@/hooks/use-fold"

const claude = <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />
const gpt = <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />

const projects: AppSidebarProject[] = [
  {
    id: "app",
    path: "~/code/app",
    conversations: [
      {
        id: "refactor",
        title: "Refactor the parser",
        icon: claude,
        status: "running",
        time: "now",
        children: [
          {
            id: "second",
            title: "Second opinion on the parser",
            icon: claude,
            status: "running",
            time: "now",
            children: [
              {
                id: "spec",
                title: "Read the parser spec",
                icon: gpt,
                status: "waiting",
                time: "3m",
              },
            ],
          },
          {
            id: "check",
            title: "Check the config version",
            icon: gpt,
            detail: "laptop",
            time: "14m",
          },
        ],
      },
      {
        id: "flaky",
        title: "Fix flaky retry test",
        icon: claude,
        status: "unread",
        time: "2m",
      },
      {
        id: "cache",
        title: "Review cache sync",
        icon: gpt,
        detail: "desktop",
        time: "40m",
        mark: (
          <HugeiconsIcon
            icon={HourglassIcon}
            strokeWidth={2}
            aria-label="Waiting on a reply"
          />
        ),
        children: [
          {
            id: "sync",
            title: "Run the sync tests",
            icon: gpt,
            detail: "linux-box",
            status: "running",
            time: "now",
          },
        ],
      },
    ],
  },
]

function Example() {
  const [current, setCurrent] = React.useState("check")
  return (
    <FoldProvider>
      <AgentApp
        sidebar={
          <AgentAppSidebar
            header="Agent workspace"
            projects={projects}
            layout="tree"
            current={{ conversation: current }}
            href={(target) =>
              "conversation" in target
                ? `#/c/${target.conversation}`
                : undefined
            }
            onSelect={(target, event) => {
              event.preventDefault()
              if ("conversation" in target) setCurrent(target.conversation)
            }}
            onSearch={fn()}
            onNewConversation={fn()}
          />
        }
      >
        <AgentAppHeader title="Check the config version" />
      </AgentApp>
    </FoldProvider>
  )
}

const meta = {
  title: "Blocks/Agent App/Sidebar Tree",
  component: Example,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

const sidebar = () =>
  within(document.querySelector<HTMLElement>("[data-slot=sidebar]")!)

/**
 * Conversations started from another, under it, a level in along a line
 * from its icon: each child's icon under its parent's title, the other
 * rows where they were. The parent folds them, "+3" after its title, its
 * mark the most pressing of its own and theirs, and is still a link of its
 * own. A mark of the app's stands before a
 * row's time.
 */
export const Default: Story = {
  play: async () => {
    const list = sidebar()
    const parent = await list.findByRole("link", {
      name: /^Refactor the parser/,
    })
    const child = list.getByRole("link", { name: /^Check the config version/ })
    const plain = list.getByRole("link", { name: /^Fix flaky retry test/ })
    const iconOf = (link: HTMLElement) =>
      link
        .querySelector("[data-slot=conversation-icon]")!
        .getBoundingClientRect()
    const titleOf = (link: HTMLElement) =>
      link
        .querySelector("[data-slot=conversation-icon]")!
        .nextElementSibling!.getBoundingClientRect()
    // A child's icon under its parent's title; a plain row unmoved.
    await expect(
      Math.abs(iconOf(child).left - titleOf(parent).left)
    ).toBeLessThanOrEqual(1)
    await expect(iconOf(plain).left).toBe(iconOf(parent).left)
    // Elbows from under the parent's icon: ├, then └ at the last, its
    // stub ending at the child row's edge, where its highlight begins, 8px
    // before its icon; the line never in a row.
    const first = list
      .getByRole("link", { name: /^Second opinion/ })
      .closest("li")!
    const last = child.closest("li")!
    await expect(first).toHaveAttribute("data-branch", "middle")
    await expect(last).toHaveAttribute("data-branch", "last")
    const stub = getComputedStyle(last, "::before")
    // 1.5px (`--sidebar-tree-width`), as a screen of 1x draws it, 1px.
    await expect(
      getComputedStyle(last).getPropertyValue("--sidebar-tree-width").trim()
    ).toBe("1.5px")
    await expect(
      parseFloat(stub.borderInlineStartWidth)
    ).toBeGreaterThanOrEqual(1)
    await expect(stub.borderEndStartRadius).not.toBe("0px")
    const row = child.getBoundingClientRect()
    const line = row.left - parseFloat(stub.width)
    const icon = iconOf(parent)
    await expect(
      Math.abs(line - (icon.left + icon.width / 2))
    ).toBeLessThanOrEqual(1)
    await expect(iconOf(child).left - row.left).toBe(8)
    // Under the parent's row, not in it.
    await expect(last.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      Math.floor(parent.getBoundingClientRect().bottom)
    )
    // The current one is a child's.
    await expect(child).toHaveAttribute("aria-current", "page")
    // The app's mark before the time.
    await expect(list.getByLabelText("Waiting on a reply")).toBeVisible()

    // Folded: its own hidden, how many said under it.
    const fold = list.getByRole("button", {
      name: "Hide 3 conversations under Refactor the parser",
    })
    await expect(fold).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(fold)
    await waitFor(() =>
      expect(list.queryByRole("link", { name: /^Second opinion/ })).toBeNull()
    )
    // "+3" after its title, said in full; its icon still its own.
    const count = parent.querySelector("[data-slot=conversation-count]")!
    await expect(count).toHaveTextContent("+3")
    await expect(count).toHaveAttribute("aria-hidden", "true")
    await expect(parent).toHaveAccessibleName(
      /^Refactor the parser ?, 3 conversations/
    )
    // Its fold not focused, nor the row hovered: its icon, not the
    // chevron.
    await userEvent.unhover(parent)
    ;(document.activeElement as HTMLElement | null)?.blur()
    await expect(
      getComputedStyle(parent.querySelector("[data-slot=conversation-icon]")!)
        .opacity
    ).toBe("1")
    // Its mark the most pressing of those it hides: one needs the reader.
    await expect(parent).toHaveAccessibleName(/Needs you$/)
    await expect(
      list.getByRole("button", {
        name: "Show 3 conversations under Refactor the parser",
      })
    ).toHaveAttribute("aria-expanded", "false")
    // Still a link of its own.
    await expect(parent).toHaveAttribute("href", "#/c/refactor")
    await userEvent.click(
      list.getByRole("button", {
        name: "Show 3 conversations under Refactor the parser",
      })
    )
    await waitFor(async () =>
      expect(
        await list.findByRole("link", { name: /^Second opinion/ })
      ).toBeVisible()
    )
  },
}

function Arriving() {
  const [current, setCurrent] = React.useState<
    React.ComponentProps<typeof AgentAppSidebar>["current"]
  >({ conversation: "flaky" })
  return (
    <FoldProvider>
      <AgentApp
        sidebar={
          <AgentAppSidebar
            header="Agent workspace"
            projects={[
              ...projects,
              {
                id: "docs",
                path: "~/code/docs",
                conversations: [
                  {
                    id: "guide",
                    title: "Write the guide",
                    icon: gpt,
                    children: [
                      {
                        id: "proof",
                        title: "Proofread the guide",
                        icon: claude,
                        status: "waiting",
                      },
                    ],
                  },
                ],
              },
            ]}
            layout="tree"
            current={current}
            onSelect={(target, event) => {
              event.preventDefault()
              setCurrent(target)
            }}
          />
        }
      >
        <AgentAppHeader title="Arriving" />
        <button type="button" onClick={() => setCurrent({ project: "docs" })}>
          To docs
        </button>
        <button
          type="button"
          onClick={() => setCurrent({ conversation: "cache" })}
        >
          To cache
        </button>
        <button
          type="button"
          onClick={() => setCurrent({ conversation: "spec" })}
        >
          To spec
        </button>
      </AgentApp>
    </FoldProvider>
  )
}

/**
 * A project opens where the reader arrives, at its page or one of its
 * conversations; folded by them while there, it stays folded, and it is
 * left open when they go.
 */
export const OpensWhereTheReaderArrives: Story = {
  render: () => <Arriving />,
  play: async ({ canvas }) => {
    const list = sidebar()
    const app = (await list.findAllByRole("button", { name: /^app\b/ })).find(
      (button) => button.hasAttribute("aria-expanded")
    )!
    await expect(app).toHaveAttribute("aria-expanded", "true")
    // Folded where the reader is: it stays folded.
    await userEvent.click(app)
    await expect(app).toHaveAttribute("aria-expanded", "false")
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    await expect(app).toHaveAttribute("aria-expanded", "false")
    await expect(
      list.queryByRole("link", { name: /^Fix flaky retry test/ })
    ).toBeNull()
    // Gone elsewhere: it stays as it was.
    await userEvent.click(canvas.getByRole("button", { name: "To docs" }))
    await expect(app).toHaveAttribute("aria-expanded", "false")
    // Arrived at another of its conversations: open again.
    await userEvent.click(canvas.getByRole("button", { name: "To cache" }))
    await waitFor(() => expect(app).toHaveAttribute("aria-expanded", "true"))
    // Folded again there, and left open as the reader goes.
    await userEvent.click(app)
    await expect(app).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(app)
    await userEvent.click(canvas.getByRole("button", { name: "To docs" }))
    await expect(app).toHaveAttribute("aria-expanded", "true")
  },
}

/**
 * A conversation's children count for its project: one of them waiting
 * marks the folded project; arriving at one opens the project and the
 * conversations it is under.
 */
export const ChildrenCountForTheirProject: Story = {
  render: () => <Arriving />,
  play: async ({ canvas }) => {
    const list = sidebar()
    const project = async (name: string) =>
      (
        await list.findAllByRole("button", { name: new RegExp(`^${name}\\b`) })
      ).find((button) => button.hasAttribute("aria-expanded"))!
    // docs's only waiting conversation is a child's.
    const docs = await project("docs")
    await userEvent.click(docs)
    await expect(docs).toHaveAttribute("aria-expanded", "false")
    await userEvent.unhover(docs)
    docs.blur()
    await expect(docs).toHaveAccessibleName("docs Needs you")
    // The reader's conversation a grandchild in a folded project, under
    // a folded parent: both open.
    const app = await project("app")
    await userEvent.click(
      list.getByRole("button", {
        name: "Hide 3 conversations under Refactor the parser",
      })
    )
    await userEvent.click(app)
    await expect(app).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(canvas.getByRole("button", { name: "To spec" }))
    await waitFor(() => expect(app).toHaveAttribute("aria-expanded", "true"))
    await waitFor(() =>
      expect(list.getByText("Read the parser spec")).toBeVisible()
    )
  },
}

/**
 * Under a finger, from 640px: a row of two lines (its `detail` under its
 * title) as tall as they need, not the one-line row's 40px.
 */
export const TwoLinesUnderAFinger: Story = {
  render: () => <Example />,
  play: async () => {
    const list = sidebar()
    const row = await list.findByRole("link", {
      name: /^Check the config version/,
    })
    const one = list.getByRole("link", { name: /^Fix flaky retry test/ })
    const root = document.querySelector<HTMLElement>("[data-slot=sidebar]")!
    const coarse = asCoarse(root, () => ({
      two: row.getBoundingClientRect().height,
      needs: row.scrollHeight,
      one: one.getBoundingClientRect().height,
    }))
    await expect(coarse.one).toBe(40)
    await expect(coarse.two).toBeGreaterThan(40)
    await expect(coarse.two).toBeGreaterThanOrEqual(coarse.needs)
  },
}

/**
 * A row with a menu and no time: its status mark at its end, where other
 * rows' marks are, not a button's width in from it; while the pointer or
 * focus is on the row, its button shows and the mark moves beside it.
 */
export const MarkAtTheEnd: Story = {
  render: () => (
    <FoldProvider>
      <AgentApp
        sidebar={
          <AgentAppSidebar
            header="Agent workspace"
            layout="tree"
            projects={[
              {
                id: "web",
                path: "~/code/web",
                conversations: [
                  {
                    id: "running",
                    title: "Ship the web app",
                    icon: claude,
                    status: "running",
                  },
                ],
              },
            ]}
            current={{ conversation: "running" }}
            onSelect={fn()}
            projectMenu={() => <DropdownMenuItem>Rename</DropdownMenuItem>}
            conversationMenu={() => <DropdownMenuItem>Rename</DropdownMenuItem>}
          />
        }
      >
        <AgentAppHeader title="Ship the web app" />
      </AgentApp>
    </FoldProvider>
  ),
  play: async () => {
    const list = sidebar()
    const link = await list.findByRole("button", {
      name: /^Ship the web app/,
    })
    const mark = link.querySelector<HTMLElement>("[data-slot=status-mark]")!
    await userEvent.unhover(link)
    await waitFor(() =>
      expect(
        link.getBoundingClientRect().right - mark.getBoundingClientRect().right
      ).toBeLessThanOrEqual(12)
    )
    // Focus on the row, as the pointer on it: its button shows, the mark
    // beside it, not under it.
    link.focus()
    const more = list.getByRole("button", {
      name: "More for Ship the web app",
    })
    await waitFor(() => expect(more).toBeVisible())
    await waitFor(() =>
      expect(mark.getBoundingClientRect().right).toBeLessThanOrEqual(
        more.getBoundingClientRect().left + 0.5
      )
    )
    await expect(mark).toBeVisible()
  },
}
