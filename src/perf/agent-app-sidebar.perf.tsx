import { useLayoutEffect, useState } from "react"
import { test } from "vitest"

import {
  AgentAppSidebar,
  type AppSidebarProject,
  type ConversationStatus,
} from "@/components/agent-app/agent-app-sidebar"
import { FoldProvider } from "@/hooks/use-fold"
import { SidebarProvider } from "@/components/ui/sidebar"

import { frame, render, report, sync, time } from "./harness"

const statuses: ConversationStatus[] = ["waiting", "error", "running", "unread"]

/** Projects with conversations of every status: the current one open. */
const projects: AppSidebarProject[] = Array.from({ length: 20 }, (_, p) => ({
  id: `project-${p}`,
  path: `~/code/project-${p}`,
  conversations: Array.from({ length: 5 }, (_, c) => ({
    id: `conversation-${p}-${c}`,
    title: `Conversation ${c} of project ${p}`,
    status: statuses[(p + c) % statuses.length]!,
  })),
}))
const loose = Array.from({ length: 5 }, (_, c) => ({
  id: `loose-${c}`,
  title: `Conversation ${c} in no project`,
  status: statuses[c % statuses.length]!,
}))

const control: { go?: (conversation: string) => void } = {}

function Sidebar() {
  const [current, setCurrent] = useState("conversation-0-0")
  useLayoutEffect(() => {
    control.go = setCurrent
  }, [])
  return (
    <FoldProvider>
      <SidebarProvider>
        <AgentAppSidebar
          projects={projects}
          conversations={loose}
          current={{ conversation: current }}
          href={(target) =>
            "conversation" in target ? `#/c/${target.conversation}` : "#/p"
          }
          onSearch={() => {}}
          onNewConversation={() => {}}
          projectMenu={() => "Open"}
          conversationMenu={() => "Delete"}
        />
      </SidebarProvider>
    </FoldProvider>
  )
}

test("agent-app sidebar: mount and go", async () => {
  const mounts: number[] = []
  for (let i = 0; i < 20; i++) {
    mounts.push(time(() => render(<Sidebar />)))
    await frame()
  }
  report("sidebar mount, 20 projects, one open, 30 status marks", mounts)

  render(<Sidebar />)
  await frame()
  const goes: number[] = []
  for (let i = 0; i < 50; i++) {
    const conversation = `conversation-${i % 20}-${i % 5}`
    goes.push(time(() => sync(() => control.go!(conversation))))
    await frame()
  }
  report("sidebar go to a conversation", goes)
})
