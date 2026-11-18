import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BubbleChatIcon,
  File01Icon,
  Folder01Icon,
  Image01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, within } from "storybook/test"

import { AgentApp, AgentAppHeader } from "@/components/agent-app/agent-app"
import {
  AgentAppRail,
  AgentAppRailItem,
} from "@/components/agent-app/agent-app-rail"
import {
  AgentAppAreaSidebar,
  AgentAppSidebar,
  type AppAreaSection,
} from "@/components/agent-app/agent-app-sidebar"

const icon = (svg: typeof Folder01Icon) => (
  <HugeiconsIcon icon={svg} strokeWidth={2} />
)

const kinds = [
  { id: "all", label: "All", icon: icon(Folder01Icon), count: 412 },
  { id: "images", label: "Images", icon: icon(Image01Icon), count: 128 },
  { id: "videos", label: "Videos", icon: icon(Video01Icon), count: 9 },
  { id: "documents", label: "Documents", icon: icon(File01Icon), count: 64 },
  { id: "other", label: "Other", icon: icon(File01Icon) },
]

const onNewConversation = fn()
const onSearch = fn()
const selected = fn()

function Files() {
  const [area, setArea] = React.useState<"files" | "chat">("files")
  const [kind, setKind] = React.useState("images")
  const sections: AppAreaSection[] = [
    {
      id: "kinds",
      label: "Files",
      items: kinds.map((item) => ({
        ...item,
        current: item.id === kind,
        href: `#/files/${item.id}`,
        onSelect: (event) => {
          event.preventDefault()
          selected(item.id)
          setKind(item.id)
        },
      })),
    },
  ]
  return (
    <AgentApp
      rail={
        <AgentAppRail label="Areas">
          <AgentAppRailItem
            id="chat"
            label="Chat"
            icon={icon(BubbleChatIcon)}
            current={area === "chat"}
            onClick={() => setArea("chat")}
          />
          <AgentAppRailItem
            id="files"
            label="Files"
            icon={icon(Folder01Icon)}
            current={area === "files"}
            onClick={() => setArea("files")}
          />
        </AgentAppRail>
      }
      sidebar={
        area === "files" ? (
          <AgentAppAreaSidebar
            header="Agent workspace"
            sections={sections}
            onNewConversation={onNewConversation}
            onSearch={onSearch}
            labels={{ navigation: "Files" }}
          />
        ) : (
          <AgentAppSidebar
            header="Agent workspace"
            projects={[{ id: "ui", path: "~/code/agent-ui" }]}
            conversations={[{ id: "plan", title: "Plan the release" }]}
            href={() => "#/c"}
            onNewConversation={onNewConversation}
            onSearch={onSearch}
          />
        )
      }
    >
      <AgentAppHeader title="Images" />
    </AgentApp>
  )
}

const meta = {
  title: "Blocks/Agent App/Area Sidebar",
  component: Files,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Files>

export default meta
type Story = StoryObj<typeof meta>

const navigation = (name: string) =>
  within(document.body).getByRole("navigation", { name })

/**
 * An area's sidebar, e.g. its files: the conversations' sidebar's top
 * bar and search row, the app's sections of places in its rows' look,
 * the current one lit, counts at their end.
 */
export const Default: Story = {
  play: async () => {
    onNewConversation.mockClear()
    onSearch.mockClear()
    selected.mockClear()
    const files = within(navigation("Files"))
    // Its top bar and search, as the conversations' sidebar has them.
    await userEvent.click(
      files.getByRole("button", { name: "New conversation" })
    )
    await expect(onNewConversation).toHaveBeenCalled()
    await userEvent.click(files.getByRole("button", { name: /^Search/ }))
    await expect(onSearch).toHaveBeenCalled()
    await userEvent.keyboard("{Meta>}k{/Meta}")
    await expect(onSearch).toHaveBeenCalledTimes(2)
    // Its rows: links, the current one said, counts at their end.
    const images = files.getByRole("link", { name: /^Images/ })
    await expect(images).toHaveAttribute("aria-current", "page")
    await expect(images).toHaveAttribute("href", "#/files/images")
    await expect(images).toHaveTextContent("128")
    await userEvent.click(files.getByRole("link", { name: /^Videos/ }))
    await expect(selected).toHaveBeenCalledWith("videos")
    await expect(files.getByRole("link", { name: /^Videos/ })).toHaveAttribute(
      "aria-current",
      "page"
    )
    await expect(images).not.toHaveAttribute("aria-current")
  },
}

/** A sidebar's rows, group label and search, measured. */
function measure(name: string, row: RegExp, label: string) {
  const sidebar = within(navigation(name))
  const textLeft = (element: Element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    return range.getBoundingClientRect().left
  }
  const link = sidebar.getByRole("link", { name: row })
  const search = sidebar.getByRole("button", { name: /^Search/ })
  const heading = sidebar.getByText(label, {
    selector: "[data-sidebar=group-label]",
  })
  return {
    height: link.getBoundingClientRect().height,
    size: getComputedStyle(link).fontSize,
    weight: getComputedStyle(link).fontWeight,
    label: getComputedStyle(heading).fontSize,
    labelHeight: heading.getBoundingClientRect().height,
    // Edges from the search row's: the rows' text, the label's.
    rowText:
      textLeft(link.querySelector("span")!) -
      textLeft(search.querySelector("span")!),
    labelText: textLeft(heading) - search.getBoundingClientRect().left,
  }
}

/**
 * Its rows, group label and search are the conversations' sidebar's, to
 * the pixel: as tall, the same text, the current one no bolder, their
 * edges in line.
 */
export const SameAsConversations: Story = {
  play: async () => {
    const files = measure("Files", /^Images/, "Files")
    await userEvent.click(
      within(navigation("Areas")).getByRole("button", { name: "Chat" })
    )
    const conversations = measure(
      "Projects and conversations",
      /^agent-ui/,
      "Projects"
    )
    await expect(files).toEqual(conversations)
  },
}
