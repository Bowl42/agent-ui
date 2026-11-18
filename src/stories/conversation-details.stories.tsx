import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ComputerIcon,
  Folder01Icon,
  GitBranchIcon,
  FileEditIcon,
  Wrench01Icon,
  RoboticIcon,
  SourceCodeIcon,
  GitCommitIcon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import {
  ConversationDetails,
  ConversationDetailsTrigger,
  ConversationDetailsArea,
  ConversationDetailsSection,
  ConversationDetailsRow,
  ConversationDetailsAction,
} from "@/components/conversation-details"
import {
  AgentApp,
  AgentAppHeader,
  AgentAppColumn,
  AgentAppDock,
} from "@/components/agent-app/agent-app"
import { AgentAppSidebar } from "@/components/agent-app/agent-app-sidebar"
import { AgentTurn } from "@/components/agent-turn"
import {
  MessageScroller,
  MessageScrollerProvider,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
} from "@/components/ui/message-scroller"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { quiet } from "@/stories/wait"

const icon = (value: typeof ComputerIcon) => (
  <HugeiconsIcon icon={value} strokeWidth={2} />
)

function Demo({
  onChanges,
  onMode,
  count = 3,
}: {
  onMode: () => void
  onChanges: () => void
  count?: number
}) {
  return (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[
            { id: "docs", title: "Share link docs" },
            { id: "tests", title: "Review tests" },
          ]}
        />
      }
    >
      <ConversationDetails
        details={
          <>
            <ConversationDetailsSection title="Workspace" hideTitle>
              <ConversationDetailsRow
                icon={icon(ComputerIcon)}
                action={
                  <ConversationDetailsAction label="Open folder">
                    {icon(Folder01Icon)}
                  </ConversationDetailsAction>
                }
              >
                BeeBox
              </ConversationDetailsRow>
              <DropdownMenu>
                <ConversationDetailsRow
                  icon={icon(SourceCodeIcon)}
                  chevron
                  render={<DropdownMenuTrigger />}
                >
                  Open in editor
                </ConversationDetailsRow>
                <DropdownMenuContent>
                  <DropdownMenuItem>VS Code</DropdownMenuItem>
                  <DropdownMenuItem>Cursor</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ConversationDetailsRow icon={icon(Wrench01Icon)} chevron>
                Set up worktree
              </ConversationDetailsRow>
            </ConversationDetailsSection>
            <ConversationDetailsSection title="Version control" hideTitle>
              <ConversationDetailsRow
                icon={icon(GitBranchIcon)}
                label="Branch"
                chevron
              >
                main
              </ConversationDetailsRow>
              <ConversationDetailsRow
                icon={icon(GitCommitIcon)}
                disabled
                chevron
              >
                Commit
              </ConversationDetailsRow>
              <ConversationDetailsRow
                icon={icon(FileEditIcon)}
                meta="+38 −12"
                onClick={onChanges}
              >
                Changes
              </ConversationDetailsRow>
            </ConversationDetailsSection>
            <ConversationDetailsSection title="Session">
              <ConversationDetailsRow plain label="Effort">
                High
              </ConversationDetailsRow>
              <ConversationDetailsRow plain label="Started">
                10:42
              </ConversationDetailsRow>
              <ConversationDetailsRow label="Mode" chevron onClick={onMode}>
                Plan
              </ConversationDetailsRow>
            </ConversationDetailsSection>
            <ConversationDetailsSection
              title="Subagents"
              meta="3 running"
              actions={
                <DropdownMenu>
                  <ConversationDetailsAction
                    label="Subagent actions"
                    render={<DropdownMenuTrigger />}
                  >
                    {icon(MoreHorizontalIcon)}
                  </ConversationDetailsAction>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Stop all</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              {Array.from({ length: count }, (_, i) => (
                <ConversationDetailsRow
                  key={i}
                  icon={icon(RoboticIcon)}
                  status={
                    i === 0
                      ? { busy: true, label: "Running" }
                      : i === 1
                        ? { tone: "warning", label: "Needs you" }
                        : { tone: "neutral", label: "Done" }
                  }
                  meta={i === 0 ? "19s" : i === 1 ? "2m" : "4m"}
                >
                  {i === 0
                    ? "Share link docs"
                    : i === 1
                      ? "Review permissions"
                      : `Check references ${i + 1}`}
                </ConversationDetailsRow>
              ))}
            </ConversationDetailsSection>
          </>
        }
      >
        <AgentAppHeader
          title="Share link docs"
          actions={<ConversationDetailsTrigger />}
        />
        <ConversationDetailsArea>
          <MessageScrollerProvider>
            <MessageScroller className="flex-1">
              <MessageScrollerViewport aria-label="Conversation">
                <AgentAppColumn
                  render={<MessageScrollerContent />}
                  className="space-y-6 py-6"
                >
                  <MessageScrollerItem>
                    <p className="rounded-xl bg-muted p-3 text-sm">
                      Write a short guide to sharing a conversation.
                    </p>
                  </MessageScrollerItem>
                  <MessageScrollerItem>
                    <AgentTurn
                      id="guide"
                      status="done"
                      duration="4s"
                      parts={[
                        {
                          id: "answer",
                          type: "content",
                          content: (
                            <p>
                              I’ll document who can open a shared link and how
                              to revoke access.
                            </p>
                          ),
                        },
                      ]}
                    />
                  </MessageScrollerItem>
                </AgentAppColumn>
              </MessageScrollerViewport>
            </MessageScroller>
          </MessageScrollerProvider>
          <AgentAppDock>
            <div className="rounded-composer bg-muted p-4 text-sm text-muted-foreground">
              Continue the conversation
            </div>
          </AgentAppDock>
        </ConversationDetailsArea>
      </ConversationDetails>
    </AgentApp>
  )
}

const meta = {
  title: "Components/Conversation Details",
  component: Demo,
  parameters: { layout: "fullscreen" },
  args: { onChanges: fn(), onMode: fn() },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>
function viewport(name: string, width: number, height: number) {
  return {
    parameters: {
      viewport: {
        options: {
          [name]: {
            name,
            styles: { width: `${width}px`, height: `${height}px` },
            type: width < 600 ? "mobile" : "tablet",
          },
        },
      },
    },
    globals: { viewport: { value: name, isRotated: false } },
  } satisfies Partial<Story>
}

export const Pinned: Story = {
  ...viewport("pinned", 1440, 900),
  play: async ({ canvas, args, canvasElement }) => {
    const card = await canvas.findByRole("region", { name: "Details" })
    const area = canvasElement.querySelector(
      '[data-slot="conversation-details-area"]'
    )!
    const box = card.getBoundingClientRect(),
      bounds = area.getBoundingClientRect()
    await expect(box.right).toBeLessThanOrEqual(bounds.right)
    await expect(Math.abs(box.top - bounds.top - 12)).toBeLessThan(2)
    const trigger = canvas.getByRole("button", { name: "Details" })
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(trigger).not.toHaveAttribute("aria-haspopup")
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(canvas.queryByRole("region", { name: "Details" })).toBeNull()
    )
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await canvas.findByRole("region", { name: "Details" })
    await userEvent.click(canvas.getByRole("button", { name: /Changes/ }))
    await expect(args.onChanges).toHaveBeenCalledOnce()
    await expect(
      canvas.getByRole("button", {
        name: /Share link docs Running|Running Share link docs/,
      })
    ).toHaveAccessibleName(/Running/)
  },
}
export const Popover: Story = {
  ...viewport("popover", 900, 800),
  play: async ({ canvas }) => {
    const body = within(document.body)
    const trigger = canvas.getByRole("button", { name: "Details" })
    await expect(canvas.queryByRole("region", { name: "Details" })).toBeNull()
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    const dialog = await body.findByRole("dialog", { name: "Details" })
    await quiet(dialog)
    await expect(
      within(dialog).getByRole("button", { name: /Changes/ })
    ).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(body.queryByRole("dialog", { name: "Details" })).toBeNull()
      expect(trigger).toHaveFocus()
    })
    await userEvent.click(trigger)
    await quiet(await body.findByRole("dialog", { name: "Details" }))
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(body.queryByRole("dialog", { name: "Details" })).toBeNull()
    )
    await quiet(document.body)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  },
}
export const Tall: Story = {
  ...viewport("tall", 1440, 600),
  args: { count: 40 },
  play: async ({ canvas, canvasElement }) => {
    const card = await canvas.findByRole("region", { name: "Details" })
    const area = canvasElement.querySelector(
      '[data-slot="conversation-details-area"]'
    )!
    const viewport = card.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    )!
    await waitFor(() =>
      expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    )
    await expect(card.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      area.getBoundingClientRect().bottom
    )
    const last = within(card).getByRole("button", {
      name: /Check references 40/,
    })
    last.focus()
    last.scrollIntoView({ block: "nearest" })
    await waitFor(() => {
      const box = last.getBoundingClientRect(),
        bounds = viewport.getBoundingClientRect()
      expect(box.top).toBeGreaterThanOrEqual(bounds.top)
      expect(box.bottom).toBeLessThanOrEqual(bounds.bottom + 1)
    })
  },
}
export const Phone: Story = {
  ...viewport("phone", 390, 844),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("region", { name: "Details" })).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Details" }))
    const dialog = await within(document.body).findByRole("dialog", {
      name: "Details",
    })
    await quiet(dialog)
    const box = dialog.getBoundingClientRect()
    await expect(box.left).toBeGreaterThanOrEqual(0)
    await expect(box.right).toBeLessThanOrEqual(window.innerWidth)
  },
}

export const Facts: Story = {
  ...viewport("facts", 1440, 900),
  play: async ({ canvas, args }) => {
    const card = await canvas.findByRole("region", { name: "Details" })
    const row = within(card)
      .getByText("High")
      .closest<HTMLElement>('[data-slot="conversation-details-row"]')!
    await expect(row).toHaveAttribute("data-plain")
    await expect(row.tagName).toBe("DIV")
    await expect(row).not.toHaveAttribute("tabindex")
    await expect(row.className).not.toContain("hover:")
    await expect(row.className).not.toContain("focus-visible:")
    await expect(row).toHaveTextContent("Effort High")
    await expect(
      within(card).queryByRole("button", { name: /Effort/ })
    ).toBeNull()
    await expect(
      within(card).queryByRole("button", { name: /Started/ })
    ).toBeNull()
    const mode = within(card).getByRole("button", { name: "Mode Plan" })
    within(card).getByRole("button", { name: "Branch main" }).focus()
    for (let i = 0; i < 10 && document.activeElement !== mode; i++) {
      await userEvent.tab()
      await expect(document.activeElement?.closest("[data-plain]")).toBeNull()
    }
    await expect(mode).toHaveFocus()
    await expect(row.getBoundingClientRect().height).toBe(
      mode.getBoundingClientRect().height
    )
    await expect(row.getBoundingClientRect().left).toBe(
      mode.getBoundingClientRect().left
    )
    await userEvent.click(mode)
    await expect(args.onMode).toHaveBeenCalledOnce()
    await expect(within(row).getByText("Effort")).toHaveClass(
      "text-muted-foreground"
    )
    await expect(within(row).getByText("High")).not.toHaveClass(
      "text-muted-foreground"
    )
  },
}
