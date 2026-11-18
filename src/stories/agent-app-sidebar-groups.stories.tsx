import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { ComputerIcon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { AgentApp, AgentAppHeader } from "@/components/agent-app/agent-app"
import {
  AgentAppSidebar,
  type AppSidebarGroup,
} from "@/components/agent-app/agent-app-sidebar"
import { FoldProvider } from "@/hooks/use-fold"

const groups: AppSidebarGroup[] = [
  {
    id: "linux-box",
    label: "linux-box",
    icon: <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />,
    projects: [
      {
        id: "ui",
        path: "~/code/agent-ui",
        conversations: [
          { id: "styles", title: "Review styles", status: "waiting" },
        ],
      },
      {
        id: "api",
        path: "~/code/api",
        conversations: [{ id: "routes", title: "Review routes" }],
      },
    ],
    conversations: [{ id: "loose", title: "Plan the next release" }],
    conversationCount: 8,
  },
  {
    id: "desktop",
    label: "desktop",
    icon: <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />,
    unavailable: "Offline",
    projects: [{ id: "docs", path: "~/code/docs" }],
  },
  { id: "ci-runner", label: "ci-runner", projects: [] },
]

type Props = React.ComponentProps<typeof AgentAppSidebar>

/** The sidebar in an app; `groupBy` its own unless the story fixes it. */
function Example(props: Props) {
  return (
    <FoldProvider>
      <AgentApp
        sidebar={
          <AgentAppSidebar
            header="Agent workspace"
            groups={groups}
            labels={{ groupByGroup: "Machines" }}
            onSearch={fn()}
            onNewConversation={fn()}
            {...props}
          />
        }
      >
        <AgentAppHeader title="Conversations" />
        <p className="p-4 text-sm text-muted-foreground">
          Choose a conversation.
        </p>
      </AgentApp>
    </FoldProvider>
  )
}

const meta = {
  title: "Blocks/Agent App/Sidebar Groups",
  component: Example,
  parameters: { layout: "fullscreen" },
  args: { onGroupByChange: fn(), onAddProject: fn(), layout: "tree" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

function section(heading: HTMLElement) {
  const group = heading.closest('[data-slot="agent-app-group"]')
  if (!(group instanceof HTMLElement)) throw new Error("Missing group section")
  return within(group)
}

async function headings(scope: ReturnType<typeof within>) {
  await scope.findByRole("heading", { name: "ci-runner", level: 2 })
  // The groups' headings: a sheet has its own, its title.
  await expect(
    scope
      .getAllByRole("heading", { level: 2 })
      .filter((heading: HTMLElement) =>
        heading.closest("[data-slot=agent-app-group]")
      )
      .map((heading: HTMLElement) => heading.textContent)
  ).toEqual(["linux-box", "desktop · Offline", "ci-runner"])
}

export const ProjectMode: Story = {
  play: async ({ canvas, args }) => {
    const tabs = within(canvas.getByRole("tablist", { name: "Group by" }))
    await expect(tabs.getByRole("tab", { name: "Projects" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    const flat = canvas
      .getByText("Projects", { selector: '[data-sidebar="group-label"]' })
      .closest('[data-slot="agent-app-projects"]')
    if (!(flat instanceof HTMLElement))
      throw new Error("Missing projects section")
    for (const name of ["agent-ui", "api", "docs"]) {
      await waitFor(() =>
        expect(within(flat).getByRole("button", { name })).toBeVisible()
      )
    }
    await userEvent.click(tabs.getByRole("tab", { name: "Machines" }))
    await expect(args.onGroupByChange).toHaveBeenCalledWith("group")
    await headings(canvas)
    // By the keyboard, as tabs: an arrow to the other, Enter to choose it.
    await userEvent.keyboard("{ArrowLeft}")
    await expect(tabs.getByRole("tab", { name: "Projects" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(tabs.getByRole("tab", { name: "Projects" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    await waitFor(() =>
      expect(canvas.queryByRole("heading", { name: "ci-runner" })).toBeNull()
    )
  },
}

export const GroupMode: Story = {
  args: { defaultGroupBy: "group" },
  play: async ({ canvas, args }) => {
    await headings(canvas)
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /desktop.*Offline/ })
      ).toBeVisible()
    )
    await expect(
      canvas.queryByRole("button", { name: "New conversation in docs" })
    ).toBeNull()
    for (const name of ["agent-ui", "api"]) {
      await expect(
        // Shown on hover or focus, as other rows' buttons.
        canvas.getByRole("button", { name: `New conversation in ${name}` })
      ).toBeInTheDocument()
    }
    await waitFor(() =>
      expect(canvas.getByText("Nothing here yet")).toBeVisible()
    )
    const linux = section(canvas.getByRole("heading", { name: "linux-box" }))
    const loose = linux.getByRole("button", { name: "Plan the next release" })
    const project = linux.getByRole("button", { name: "api" })
    await expect(
      project.compareDocumentPosition(loose) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    const fold = linux.getByRole("button", { name: "linux-box" })
    await userEvent.click(fold)
    await expect(fold).toHaveAttribute("aria-expanded", "false")
    await waitFor(() =>
      expect(
        linux.queryByRole("button", { name: "Plan the next release" })
      ).toBeNull()
    )
    await userEvent.click(fold)
    await waitFor(async () =>
      expect(
        await linux.findByRole("button", { name: "Plan the next release" })
      ).toBeVisible()
    )
    // The add button on its label's middle.
    const add = canvas.getByRole("button", {
      name: "Add project in linux-box",
    })
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect()
      return box.top + box.height / 2
    }
    await expect(
      Math.abs(
        middle(add) -
          middle(
            add.parentElement!.querySelector("[data-sidebar=group-label]")!
          )
      )
    ).toBeLessThanOrEqual(0.5)
    await userEvent.click(add)
    await expect(args.onAddProject).toHaveBeenCalledWith("linux-box")
    await expect(
      canvas.queryByRole("button", { name: "Add project in desktop" })
    ).toBeNull()
  },
}

export const GroupModeList: Story = {
  args: {
    defaultGroupBy: "group",
    layout: "list",
    href: (target) => ("project" in target ? `#${target.project}` : undefined),
  },
  play: async ({ canvas }) => {
    await headings(canvas)
    const linux = section(canvas.getByRole("heading", { name: "linux-box" }))
    const project = linux.getByRole("link", { name: "api" })
    await expect(project).toHaveAttribute("href", "#api")
    const loose = linux.getByRole("button", { name: "Plan the next release" })
    await expect(
      project.compareDocumentPosition(loose) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  },
}

export const OneGroup: Story = {
  args: { groups: groups.slice(0, 1), defaultGroupBy: "group" },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("tablist", { name: "Group by" })).toBeNull()
    await waitFor(() =>
      expect(
        canvas.getByText("Projects", {
          selector: '[data-sidebar="group-label"]',
        })
      ).toBeVisible()
    )
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "agent-ui" })).toBeVisible()
    )
    await expect(canvas.queryByRole("heading", { level: 2 })).toBeNull()
  },
}

export const Controlled: Story = {
  args: { groupBy: "group" },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("tab", { name: "Projects" }))
    await expect(args.onGroupByChange).toHaveBeenCalledWith("project")
    await headings(canvas)
    await expect(canvas.getByRole("tab", { name: "Machines" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  },
}

export const PhoneGroups: Story = {
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
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    const body = within(canvasElement.ownerDocument.body)
    const sheet = within(await body.findByRole("dialog"))
    const tabs = within(sheet.getByRole("tablist", { name: "Group by" }))
    await userEvent.click(tabs.getByRole("tab", { name: "Machines" }))
    await headings(sheet)
    await userEvent.click(
      sheet.getByRole("button", { name: "Plan the next release" })
    )
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}
