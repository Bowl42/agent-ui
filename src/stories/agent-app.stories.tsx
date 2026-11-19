import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  BubbleChatIcon,
  File01Icon,
  Folder01Icon,
  Layers01Icon,
  PencilEdit02Icon,
  PinIcon,
  Settings02Icon,
  FolderRemoveIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { windowOf } from "@/stories/phone"
import { onOneLine } from "@/stories/grid-lines"
import { coarseHitSize } from "@/stories/touch"
import { quiet } from "@/stories/wait"
import { folderTree, loadFolder, updateFolder } from "@/stories/folder-tree"
import { FolderPicker } from "@/components/folder-picker"

import {
  AgentApp,
  agentAppTitlebarControls,
  AgentAppHeader,
  AgentAppPanelClose,
  AgentAppPanelExpand,
  AgentAppPanelTrigger,
  AgentAppPanels,
  AgentAppDock,
  AgentAppStart,
  useAgentAppPanelBar,
} from "@/components/agent-app/agent-app"
import {
  AgentAppConversations,
  AgentAppPage,
  AgentAppProject,
  AgentAppProjectSection,
} from "@/components/agent-app/agent-app-project"
import {
  AgentAppRail,
  AgentAppRailFooter,
  AgentAppRailItem,
} from "@/components/agent-app/agent-app-rail"
import {
  AgentAppSidebar,
  AgentAppSidebarTitle,
  type AppConversation,
  type AppSidebarProject,
  type AppTarget,
  type ConversationStatus,
} from "@/components/agent-app/agent-app-sidebar"
import {
  ComposerContext,
  ProjectPicker,
  type AppProject,
} from "@/components/agent-app/project-picker"
import { AgentTurn, type AgentTurnPart } from "@/components/agent-turn"
import {
  Browser,
  useBrowser,
  type BrowserFile,
  type BrowserPage,
  browserFileFrom,
  browserFileType,
} from "@/components/browser"
import {
  Composer,
  ComposerEditor,
  composerText,
  type ComposerActions,
  type ComposerValue,
} from "@/components/composer"
import { FoldProvider } from "@/hooks/use-fold"
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { VirtualList } from "@/components/virtual-list"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { FullToolbar } from "@/stories/composer-tools"
import { Message, MessageContent } from "@/components/ui/message"
import { UserMessage, UserMessageText } from "@/components/user-message"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

const meta = {
  title: "Blocks/Agent App",
  component: AgentApp,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AgentApp>

export default meta
type Story = StoryObj<typeof meta>

type Exchange = {
  id: string
  question: string
  status: "running" | "done" | "error"
  parts: AgentTurnPart[]
}

type Conversation = {
  id: string
  title: string
  project: string | null
  /** When it was last active, for the order of the lists. */
  updated: number
  status?: ConversationStatus
  exchanges: Exchange[]
}

const answered = (id: string, question: string, answer: string): Exchange => ({
  id,
  question,
  status: "done",
  parts: [
    {
      type: "tool",
      id: `${id}:read`,
      kind: "read",
      path: "vite.config.ts",
      status: "done",
    },
    {
      type: "tool",
      id: `${id}:run`,
      kind: "command",
      command: "pnpm build",
      status: "done",
    },
    {
      type: "content",
      id: `${id}:answer`,
      content: <p className="leading-relaxed">{answer}</p>,
    },
  ],
})

const projectList: AppProject[] = [
  { id: "agent-ui", path: "~/code/agent-ui" },
  { id: "vesper", path: "~/code/vesper" },
  { id: "web-api", path: "~/web/api" },
  { id: "cli-api", path: "~/cli/api" },
  {
    id: "legacy",
    path: "~/old/legacy",
    unavailable: "The directory is gone",
  },
]

function initialConversations(): Conversation[] {
  const list: Conversation[] = [
    {
      id: "deploy",
      title: "Fix the slow deploy",
      project: "agent-ui",
      updated: 100,
      exchanges: [
        answered(
          "deploy:1",
          "The deploy got slow this week. Why?",
          "The image cache was keyed on the deploy id, so every deploy optimized all the images again. It is keyed on their content now."
        ),
      ],
    },
    {
      id: "clamp",
      title: "Clamp styles",
      project: "agent-ui",
      updated: 90,
      exchanges: [
        answered(
          "clamp:1",
          "Make the clamp button a pill.",
          "It is a pill in a tint of the text's color now."
        ),
      ],
    },
    {
      id: "login",
      title: "Login redirect loop",
      project: "vesper",
      updated: 95,
      status: "waiting",
      exchanges: [
        {
          id: "login:1",
          question: "Sign-in loops back to itself.",
          status: "running",
          parts: [
            {
              type: "tool",
              id: "login:1:edit",
              status: "waiting",
              title: "Edit src/auth/callback.ts? Waiting for you",
              details: <p>Allow the edit to go on.</p>,
            },
          ],
        },
      ],
    },
    {
      id: "api-limits",
      title: "Rate limits",
      project: "web-api",
      updated: 50,
      exchanges: [answered("api-limits:1", "Add rate limits.", "Done.")],
    },
    {
      id: "translate",
      title: "Translate a document",
      project: null,
      updated: 80,
      exchanges: [
        answered("translate:1", "Translate this.", "Here it is in English."),
      ],
    },
    {
      id: "question",
      title: "A quick question",
      project: null,
      updated: 70,
      status: "unread",
      exchanges: [answered("question:1", "What is OKLCH?", "A color space.")],
    },
  ]
  // Enough in no project that their page lists more than the sidebar.
  for (let index = 0; index < 5; index++)
    list.push({
      id: `loose:${index}`,
      title: `Loose question ${index + 1}`,
      project: null,
      updated: 5 - index,
      exchanges: [answered(`loose:${index}:1`, "Something.", "Done.")],
    })
  // Enough in agent-ui that its page lists more than the sidebar.
  for (let index = 0; index < 10; index++)
    list.push({
      id: `older:${index}`,
      title: `Older conversation ${index + 1}`,
      project: "agent-ui",
      updated: 10 - index,
      exchanges: [answered(`older:${index}:1`, "Something.", "Done.")],
    })
  return list
}

type Place =
  | { conversation: string }
  | { project: string }
  | { noProject: true }
  | { draft: true }

/** The app's search, e.g. a command palette. */
const search = fn()
const resized = fn()
const sidebarResized = fn()

const newest = (a: { updated: number }, b: { updated: number }) =>
  b.updated - a.updated

/** A browser in the panel: its bar in the titlebar's row, under one. */
function PanelBrowser(props: React.ComponentProps<typeof Browser>) {
  return <Browser barContainer={useAgentAppPanelBar()} {...props} />
}

/** The conversation's files, in the browser. */
const filesPage: BrowserPage = {
  id: "files",
  title: "Files",
  location: "~/agent-ui",
  content: {
    type: "files",
    files: [
      {
        name: "src",
        path: "src",
        children: [{ name: "images.ts", path: "src/images.ts" }],
      },
      { name: "vite.config.ts", path: "vite.config.ts" },
    ],
  },
}

/** The app's dev server, in the browser. */
const webPage: BrowserPage = {
  id: "web",
  title: "Browser",
  location: "http://localhost:5173/",
  content: {
    type: "web",
    url: `data:text/html,${encodeURIComponent(
      "<!doctype html><title>Browser</title><body style='font-family:sans-serif'><h1>Hello from the dev server</h1></body>"
    )}`,
    running: true,
  },
}

/** The app's areas: its rail, at the foot of the sheet on a phone. */
const areas = [
  {
    id: "chat",
    label: "Chat",
    icon: <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />,
    href: "#/c",
  },
  {
    id: "projects",
    label: "Projects",
    icon: <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
    href: "#/p",
  },
  {
    id: "models",
    label: "Models",
    icon: <HugeiconsIcon icon={Layers01Icon} strokeWidth={2} />,
    href: "#/m",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />,
    href: "#/s",
  },
]

const changesPage: BrowserPage = {
  id: "changes",
  title: "Changes",
  count: 1,
  content: {
    type: "diff",
    diff: [
      "--- a/src/images.ts",
      "+++ b/src/images.ts",
      "@@ -2 +2 @@",
      "-  return image.path + Date.now()",
      "+  return hash(image.content)",
    ].join("\n"),
  },
}

/** What the app loads for a file. */
const filePage = (file: BrowserFile): BrowserPage => ({
  id: `file:${file.path}`,
  title: file.name,
  location: file.path,
  content: { type: "code", language: "ts", code: `// ${file.path}\n` },
})

/**
 * A whole agent app on made-up data, as an app would wire the block. Its
 * panel is a browser, or, without, a list in the panel's own bar.
 */
function App({
  browser: withBrowser = true,
  panel = false,
  railPlacement = "column",
  sidebarWidth = 240,
  titlebar = false,
  minMainWidth,
}: {
  /** The main area's narrowest, as the app gives it. */
  minMainWidth?: number
  /** A desktop window's bar across the top, back and forward in it. */
  titlebar?: boolean
  browser?: boolean
  /** Its panel open at first. */
  panel?: boolean
  railPlacement?: "column" | "sidebar"
  sidebarWidth?: number
}) {
  const browser = useBrowser({
    defaultValue: {
      tabs: [
        { id: "files", pages: [filesPage], index: 0 },
        { id: "changes", pages: [changesPage], index: 0 },
        { id: "web", pages: [webPage], index: 0 },
      ],
      active: "files",
    },
  })
  const [size, setSize] = React.useState<number | string>("40")
  const [conversations, setConversations] = React.useState(initialConversations)
  const [projects, setProjects] = React.useState(projectList)
  const [folderMachine, setFolderMachine] = React.useState<string | null>(null)
  const [folderRoot, setFolderRoot] = React.useState(folderTree)
  const [pickedFolder, setPickedFolder] = React.useState<string | null>(null)
  const [place, setPlace] = React.useState<Place>({ conversation: "deploy" })
  // Where the reader has been, for back and forward.
  const [history, setHistory] = React.useState({ stack: [place], at: 0 })
  const going = React.useRef(false)
  React.useEffect(() => {
    if (going.current) {
      going.current = false
      return
    }
    setHistory((h) =>
      h.stack[h.at] === place
        ? h
        : { stack: [...h.stack.slice(0, h.at + 1), place], at: h.at + 1 }
    )
  }, [place])
  const step = (by: number) => {
    const at = history.at + by
    const to = history.stack[at]
    if (!to) return
    going.current = true
    setHistory({ ...history, at })
    setPlace(to)
  }
  const [draftProject, setDraftProject] = React.useState<string | null>(null)
  const [value, setValue] = React.useState<ComposerValue>([])
  const [files, setFiles] = React.useState(panel)
  // A project's page loads its conversations five at a time.
  const [loaded, setLoaded] = React.useState(5)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const clock = React.useRef(1000)
  const composer = React.useRef<ComposerActions>(null)

  const conversation =
    "conversation" in place
      ? conversations.find((item) => item.id === place.conversation)
      : undefined
  const projectId =
    "project" in place
      ? place.project
      : "draft" in place
        ? draftProject
        : conversation?.project
  const project = projects.find((item) => item.id === projectId)

  const activity = (id: string) =>
    Math.max(
      0,
      ...conversations
        .filter((item) => item.project === id)
        .map((item) => item.updated)
    )
  const sidebarProjects: AppSidebarProject[] = [...projects]
    .sort((a, b) => activity(b.id) - activity(a.id))
    .map((item) => ({
      ...item,
      // As an app that lists a few of a project's conversations says
      // what the rest need.
      ...(item.id === "web-api" ? { status: "error" as const } : {}),
      conversations: conversations
        .filter((entry) => entry.project === item.id)
        .sort(newest)
        .map(toRow),
    }))

  const go = (target: AppTarget) => {
    setPlace(target)
    if (!("conversation" in target)) setLoaded(5)
    if ("conversation" in target)
      setConversations((list) =>
        list.map((item) =>
          item.id === target.conversation && item.status === "unread"
            ? { ...item, status: undefined }
            : item
        )
      )
  }

  const update = (id: string, change: (item: Conversation) => Conversation) =>
    setConversations((list) =>
      list.map((item) => (item.id === id ? change(item) : item))
    )

  const send = (text: string) => {
    const at = ++clock.current
    const exchange: Exchange = {
      id: `exchange:${at}`,
      question: text,
      status: "running",
      parts: [
        {
          type: "reasoning",
          id: `exchange:${at}:thinking`,
          text: "Reading the question.",
          status: "running",
        },
      ],
    }
    let id: string
    if ("draft" in place) {
      id = `conversation:${at}`
      setConversations((list) => [
        ...list,
        {
          id,
          title: text.length > 40 ? `${text.slice(0, 40)}…` : text,
          project: draftProject,
          updated: at,
          status: "running",
          exchanges: [exchange],
        },
      ])
      setPlace({ conversation: id })
    } else if (conversation) {
      id = conversation.id
      update(id, (item) => ({
        ...item,
        updated: at,
        status: "running",
        exchanges: [...item.exchanges, exchange],
      }))
    } else return
    setTimeout(
      () =>
        update(id, (item) => ({
          ...item,
          status: undefined,
          exchanges: item.exchanges.map((entry) =>
            entry.id === exchange.id
              ? answered(entry.id, entry.question, "Here is what I found.")
              : entry
          ),
        })),
      600
    )
  }

  const looseConversations = conversations
    .filter((item) => item.project === null)
    .sort(newest)
  const projectConversations = project
    ? conversations.filter((item) => item.project === project.id).sort(newest)
    : []

  const running = conversation?.exchanges.some(
    (exchange) => exchange.status === "running"
  )

  return (
    <FoldProvider>
      <FolderPicker
        open={folderMachine !== null}
        onOpenChange={(open) => {
          if (!open) setFolderMachine(null)
        }}
        description={`On ${folderMachine ?? "This computer"}`}
        folder={folderRoot}
        selected={pickedFolder}
        onSelect={(folder) => setPickedFolder(folder.id)}
        onLoad={(folder) => {
          void loadFolder(folder).then((children) =>
            setFolderRoot((root) =>
              updateFolder(root, folder.id, (entry) => ({ ...entry, children }))
            )
          )
        }}
        onChoose={(folder) => {
          setProjects((list) =>
            list.some((entry) => entry.path === folder.id)
              ? list
              : [...list, { id: folder.id, path: folder.id }]
          )
          setFolderMachine(null)
        }}
      />
      <AgentApp
        onSidebarWidthChange={sidebarResized}
        // The sidebar stays beside the panel: these stories try their
        // widths together (the screens' stories fold it).
        foldForPanel={false}
        railPlacement={railPlacement}
        defaultSidebarWidth={sidebarWidth}
        {...(minMainWidth !== undefined ? { minMainWidth } : {})}
        {...(titlebar
          ? {
              titlebar: {
                back: { onClick: () => step(-1), disabled: history.at === 0 },
                forward: {
                  onClick: () => step(1),
                  disabled: history.at === history.stack.length - 1,
                },
              },
            }
          : {})}
        rail={
          <AgentAppRail label="Areas">
            {areas.slice(0, -1).map((area) => (
              <AgentAppRailItem
                key={area.id}
                {...area}
                current={area.id === "chat"}
                onClick={(event) => event.preventDefault()}
              />
            ))}
            <AgentAppRailFooter>
              {areas.slice(-1).map((area) => (
                <AgentAppRailItem
                  key={area.id}
                  {...area}
                  onClick={(event) => event.preventDefault()}
                />
              ))}
            </AgentAppRailFooter>
          </AgentAppRail>
        }
        sidebar={
          <AgentAppSidebar
            layout="tree"
            projects={sidebarProjects}
            conversations={conversations
              .filter((item) => item.project === null)
              .sort(newest)
              .map(toRow)}
            current={
              "conversation" in place
                ? { conversation: place.conversation }
                : "project" in place
                  ? { project: place.project }
                  : "noProject" in place
                    ? { noProject: true }
                    : {}
            }
            href={(target) =>
              "conversation" in target
                ? `#/c/${target.conversation}`
                : "project" in target
                  ? `#/p/${target.project}`
                  : "#/c"
            }
            // An app with a router routes here instead.
            onSelect={(target, event) => {
              event.preventDefault()
              go(target)
            }}
            onNewConversation={(id) => {
              setDraftProject(id ?? null)
              setPlace({ draft: true })
              composer.current?.focus()
            }}
            onSearch={search}
            onAddProject={(group) => setFolderMachine(group ?? "This computer")}
            projectMenu={(item) => (
              <DropdownMenuItem onClick={() => go({ project: item.id })}>
                Open project
              </DropdownMenuItem>
            )}
            conversationMenu={(item) => (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setConversations((list) =>
                    list.filter((entry) => entry.id !== item.id)
                  )
                  if ("conversation" in place && place.conversation === item.id)
                    setPlace({ draft: true })
                }}
              >
                Delete
              </DropdownMenuItem>
            )}
            header={<span className="text-sm font-semibold">Agent</span>}
            footer={
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-muted-foreground">
                    sam@example.com
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            }
          />
        }
      >
        <AgentAppPanels
          title={withBrowser ? "Browser" : "Files"}
          // A conversation's: none on a project's page.
          open={files && conversation !== undefined}
          onOpenChange={setFiles}
          // As an app keeps it, and gives it back.
          defaultSize={size}
          onSizeChange={(pixels) => {
            resized(pixels)
            setSize(pixels)
          }}
          // The browser's tabs are its bar.
          bar={!withBrowser}
          panel={
            withBrowser ? (
              <PanelBrowser
                browser={browser}
                actions={
                  <>
                    <AgentAppPanelExpand />
                    <AgentAppPanelClose />
                  </>
                }
                onOpenFile={(file, { newTab }) =>
                  newTab
                    ? browser.open(filePage(file))
                    : browser.navigate(filePage(file))
                }
              />
            ) : (
              <ul className="flex flex-col p-2 text-sm">
                {["vite.config.ts", "src/images.ts", "package.json"].map(
                  (file) => (
                    <li
                      key={file}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    >
                      <HugeiconsIcon
                        icon={File01Icon}
                        strokeWidth={2}
                        className="size-4 text-muted-foreground"
                      />
                      {file}
                    </li>
                  )
                )}
              </ul>
            )
          }
        >
          <AgentAppHeader
            {...(project ? { project } : {})}
            // A page with its own heading has no title here.
            {...("project" in place || "noProject" in place
              ? {}
              : {
                  title:
                    conversation?.title ??
                    ("draft" in place ? "New conversation" : ""),
                })}
            onProjectSelect={() => project && go({ project: project.id })}
            actions={conversation && <AgentAppPanelTrigger />}
          />
          {"project" in place && project ? (
            <AgentAppProject
              project={project}
              conversations={projectConversations
                .slice(0, loaded)
                .map((item) => ({
                  ...toRow(item),
                  description: `${item.exchanges.length} ${
                    item.exchanges.length === 1 ? "message" : "messages"
                  }`,
                }))}
              href={(target) =>
                "conversation" in target
                  ? `#/c/${target.conversation}`
                  : undefined
              }
              onSelect={(target, event) => {
                event.preventDefault()
                go(target)
              }}
              onNewConversation={(id) => {
                setDraftProject(id)
                setPlace({ draft: true })
              }}
              {...(loaded < projectConversations.length
                ? {
                    onLoadMore: () => {
                      setLoadingMore(true)
                      setTimeout(() => {
                        setLoaded((count) => count + 5)
                        setLoadingMore(false)
                      }, 300)
                    },
                  }
                : {})}
              loadingMore={loadingMore}
              conversationMenu={(item) => (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setConversations((list) =>
                      list.filter((entry) => entry.id !== item.id)
                    )
                  }
                >
                  Delete
                </DropdownMenuItem>
              )}
            >
              {/* The app's own. */}
              <AgentAppProjectSection
                title="Instructions"
                description="What the agent reads first in this project."
                action={
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                }
              >
                <p className="text-sm text-muted-foreground">
                  AGENTS.md: run pnpm check before every commit.
                </p>
              </AgentAppProjectSection>
            </AgentAppProject>
          ) : "noProject" in place ? (
            <AgentAppConversations
              conversations={looseConversations.slice(0, loaded).map(toRow)}
              href={(target) =>
                "conversation" in target
                  ? `#/c/${target.conversation}`
                  : undefined
              }
              onSelect={(target, event) => {
                event.preventDefault()
                go(target)
              }}
              onNewConversation={() => {
                setDraftProject(null)
                setPlace({ draft: true })
              }}
              {...(loaded < looseConversations.length
                ? { onLoadMore: () => setLoaded((count) => count + 5) }
                : {})}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {conversation ? (
                <Thread conversation={conversation} />
              ) : (
                <Empty className="flex-1">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>What should we work on?</EmptyTitle>
                    <EmptyDescription>
                      Pick a project for it to work in, or none.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <div className="mx-auto w-full max-w-column shrink-0 px-4 pb-4">
                <Composer
                  actionsRef={composer}
                  value={value}
                  onValueChange={setValue}
                  status={running ? "running" : "ready"}
                  submitDisabled={!composerText(value).trim()}
                  // A file dragged from the browser, as a mention.
                  dropTypes={[browserFileType]}
                  onDropData={(data) => {
                    const file = browserFileFrom(data)
                    if (!file) return
                    return [
                      {
                        type: "mention",
                        trigger: "@",
                        id: file.path,
                        label: file.name,
                      },
                      " ",
                    ]
                  }}
                  onSubmit={(message) => {
                    send(composerText(message))
                    setValue([])
                  }}
                >
                  <ComposerContext
                    started={!("draft" in place)}
                    projects={[...projects].sort(
                      (a, b) => activity(b.id) - activity(a.id)
                    )}
                    value={draftProject}
                    onValueChange={setDraftProject}
                    onAddProject={() => {
                      const id = `new:${projects.length}`
                      setProjects((list) => [
                        ...list,
                        { id, path: `~/code/new-${list.length}` },
                      ])
                      setDraftProject(id)
                    }}
                  />
                  <ComposerEditor
                    aria-label="Message"
                    placeholder="Ask anything"
                  />
                  <FullToolbar />
                </Composer>
              </div>
            </div>
          )}
        </AgentAppPanels>
      </AgentApp>
    </FoldProvider>
  )
}

const toRow = (item: Conversation): AppConversation => ({
  id: item.id,
  title: item.title,
  ...(item.status ? { status: item.status } : {}),
})

function Thread({ conversation }: { conversation: Conversation }) {
  return (
    <MessageScrollerProvider>
      <MessageScroller className="flex-1">
        <MessageScrollerViewport aria-label="Conversation">
          <MessageScrollerContent className="mx-auto w-full max-w-column p-4">
            {conversation.exchanges.map((exchange) => (
              <React.Fragment key={exchange.id}>
                <MessageScrollerItem messageId={exchange.id} scrollAnchor>
                  {/* Under the page's h1. */}
                  <UserMessage headingLevel={2}>
                    <UserMessageText>{exchange.question}</UserMessageText>
                  </UserMessage>
                </MessageScrollerItem>
                <MessageScrollerItem>
                  <Message>
                    <MessageContent>
                      <AgentTurn
                        id={exchange.id}
                        status={exchange.status}
                        duration="4s"
                        parts={exchange.parts}
                      />
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              </React.Fragment>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

const body = within(document.body)
/** The sidebar, as a sheet on a phone too. */
const sidebar = () =>
  within(document.querySelector<HTMLElement>("[data-sidebar=sidebar]")!)

/** A whole app on made-up data, to try. */
export const Default: Story = {
  args: { sidebar: null },
  render: () => <App />,
}

/**
 * A desktop window with a Window Controls Overlay but no titlebar of the
 * app's (a narrow window): the app marks the root
 * (`<html data-window-controls-overlay>`, or a PWA's display-mode), and
 * the window's own buttons keep their place: the rail and the sidebar
 * start under them (`env(titlebar-area-height)`, here its 32px
 * fallback), the sidebar's bar past them, its edge's rail under them.
 * With the app's titlebar, none of it: the bar has them.
 */
export const WindowControlsOverlay: Story = {
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvasElement }) => {
    const root = document.documentElement
    const style = (slot: string) =>
      getComputedStyle(canvasElement.querySelector(`[data-slot=${slot}]`)!)
    const before = style("agent-app-rail").paddingTop
    root.dataset.windowControlsOverlay = ""
    try {
      await expect(style("agent-app-rail").paddingTop).toBe("40px")
      // Its top eases there (transition-all).
      await waitFor(() => expect(style("sidebar-rail").top).toBe("32px"))
      // The window's own buttons are at its start (x 0 here): the bar's
      // own 16px.
      await expect(style("agent-app-sidebar-bar").paddingInlineStart).toBe(
        "16px"
      )
    } finally {
      delete root.dataset.windowControlsOverlay
    }
    await expect(style("agent-app-rail").paddingTop).toBe(before)
  },
}

/**
 * A desktop window's titlebar across the top: back, forward and the
 * sidebar's button past the window's own buttons, staying put as the
 * sidebar closes; the header in it from the sidebar's edge. Under it the
 * rail on the window's colour, and a card of the sidebar and the main
 * area, its corner rounded, a rule between them; closed, the main area
 * alone in it. The window is dragged by the bar, not its buttons.
 */
export const Titlebar: Story = {
  args: { sidebar: null },
  render: () => <App titlebar browser={false} />,
  play: async ({ canvas, canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar]"
    )!
    const box = bar.getBoundingClientRect()
    await expect(box.top).toBe(0)
    await expect(box.height).toBe(40)
    const tools = within(bar)
    const back = tools.getByRole("button", { name: "Back" })
    const forward = tools.getByRole("button", { name: "Forward" })
    const toggle = tools.getByRole("button", { name: "Toggle Sidebar" })
    await expect(back).toBeDisabled()
    await expect(forward).toBeDisabled()
    // At rest, no fill: only under the pointer.
    await expect(getComputedStyle(toggle).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)"
    )
    const order = [back, forward, toggle].map(
      (button) => button.getBoundingClientRect().left
    )
    await expect([...order].sort((a, b) => a - b)).toEqual(order)
    // The header in the bar, none in the main area.
    await expect(
      tools.getByRole("heading", { level: 1, name: "Fix the slow deploy" })
    ).toBeVisible()
    await expect(
      canvasElement.querySelectorAll("main [data-slot=agent-app-header]")
    ).toHaveLength(0)
    await expect(
      canvasElement.querySelectorAll("[data-slot=sidebar-trigger]")
    ).toHaveLength(0)
    // Under the bar: the sidebar and the main area, one card, the
    // header from the sidebar's edge.
    const container = canvasElement.querySelector<HTMLElement>(
      "[data-slot=sidebar-container]"
    )!
    const main = canvasElement.querySelector<HTMLElement>(
      "[data-slot=sidebar-inset]"
    )!
    const edge = container.getBoundingClientRect().right
    await expect(container.getBoundingClientRect().top).toBe(box.bottom)
    await expect(main.getBoundingClientRect().top).toBe(box.bottom)
    await expect(
      parseFloat(getComputedStyle(container).borderStartStartRadius)
    ).toBeGreaterThan(0)
    await expect(getComputedStyle(container).borderInlineEndWidth).toBe("1px")
    // Its rule on up through the bar: the bar's start ends on the same
    // line, the same colour, so the two are one.
    const barStart = bar.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar-start]"
    )!
    await expect(getComputedStyle(barStart).borderInlineEndWidth).toBe("1px")
    await expect(getComputedStyle(barStart).borderInlineEndColor).toBe(
      getComputedStyle(container).borderInlineEndColor
    )
    await expect(
      Math.abs(barStart.getBoundingClientRect().right - edge)
    ).toBeLessThan(0.5)
    const place = tools.getByRole("navigation", { name: "Breadcrumb" })
    const start = place.getBoundingClientRect().left - edge
    await expect(start).toBeGreaterThanOrEqual(0)
    await expect(start).toBeLessThanOrEqual(24)
    // Closed: the buttons where they were, the title after them, the
    // main area's corner the card's.
    const at = toggle.getBoundingClientRect().left
    await userEvent.click(toggle)
    await waitFor(() =>
      expect(
        parseFloat(getComputedStyle(main).borderStartStartRadius)
      ).toBeGreaterThan(0)
    )
    await expect(toggle.getBoundingClientRect().left).toBe(at)
    await waitFor(() =>
      expect(place.getBoundingClientRect().left).toBeLessThan(edge)
    )
    await expect(place.getBoundingClientRect().left).toBeGreaterThan(
      toggle.getBoundingClientRect().right
    )
    // No sidebar beside: no rule in the bar.
    await expect(getComputedStyle(barStart).borderInlineEndWidth).toBe("0px")
    await userEvent.click(toggle)
    // Back and forward, the app's.
    await userEvent.click(
      await canvas.findByRole("link", { name: /^Clamp styles/ })
    )
    await expect(
      await tools.findByRole("heading", { level: 1, name: "Clamp styles" })
    ).toBeVisible()
    await waitFor(() => expect(back).toBeEnabled())
    await userEvent.click(back)
    await expect(
      await tools.findByRole("heading", { name: "Fix the slow deploy" })
    ).toBeVisible()
    await expect(forward).toBeEnabled()
    // Dragged by the bar, not by its buttons, where the browser can.
    if (CSS.supports("app-region", "drag")) {
      await expect(getComputedStyle(bar).getPropertyValue("app-region")).toBe(
        "drag"
      )
      await expect(getComputedStyle(back).getPropertyValue("app-region")).toBe(
        "no-drag"
      )
    }
  },
}

const followModels = fn((event: React.MouseEvent) => event.preventDefault())

/**
 * The header's title is any node: e.g. a settings page's path, its
 * middle step a link back.
 */
export const HeaderTitleNode: Story = {
  args: { sidebar: null },
  beforeEach: () => {
    followModels.mockClear()
  },
  render: () => (
    <AgentApp
      titlebar
      sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}
    >
      <AgentAppHeader
        title={
          <>
            Settings /{" "}
            <a href="#models" onClick={followModels}>
              Models
            </a>{" "}
            / Opus
          </>
        }
      />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    const heading = await canvas.findByRole("heading", { level: 1 })
    await expect(heading).toHaveTextContent("Settings / Models / Opus")
    const link = within(heading).getByRole("link", { name: "Models" })
    await expect(link).toHaveAttribute("href", "#models")
    // Not in a disabled link: reached and followed as any link.
    await expect(link.parentElement!.closest("[role=link]")).toBeNull()
    await expect(link.closest("[aria-disabled=true]")).toBeNull()
    await userEvent.click(link)
    await expect(followModels).toHaveBeenCalledTimes(1)
  },
}

/**
 * The sidebar's title as a button (renaming the workspace): its words
 * where a title's are and as heavy, its hover's grey 8px out, not cut.
 */
export const HeaderTitleButton: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[]}
          header={
            <AgentAppSidebarTitle aria-label="Rename Agent workspace">
              Agent workspace
            </AgentAppSidebarTitle>
          }
          onSearch={() => {}}
        />
      }
    >
      <AgentAppConversations conversations={[]} />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByRole("button", {
      name: "Rename Agent workspace",
    })
    const words = title.querySelector("span")!.getBoundingClientRect()
    const search = canvas
      .getByRole("button", { name: /Search/ })
      .querySelector("svg")!
      .getBoundingClientRect()
    await expect(Math.round(words.left)).toBe(Math.round(search.left))
    await expect(getComputedStyle(title).fontWeight).toBe("600")
    const box = title.getBoundingClientRect()
    await expect(box.height).toBe(32)
    // Its start, 8px out, is not cut off: the pointer reaches it there.
    await expect(
      document.elementFromPoint(box.left + 2, box.top + box.height / 2)
    ).toBe(title)
  },
}

/** A window's own buttons' inset and its bar's height, set on the root. */
function WindowInset({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    const root = document.documentElement.style
    root.setProperty("--agent-app-titlebar-inset", "72px")
    root.setProperty("--agent-app-titlebar-height", "52px")
    return () => {
      root.removeProperty("--agent-app-titlebar-inset")
      root.removeProperty("--agent-app-titlebar-height")
    }
  }, [])
  return children
}

/**
 * A window with no Window Controls Overlay (a WKWebView's): the app's
 * inset for its own buttons and its bar's height, from the root. Its
 * controls are what `agentAppTitlebarControls` finds; the rest drags.
 */
export const TitlebarInset: Story = {
  args: { sidebar: null },
  render: () => (
    <WindowInset>
      <App titlebar browser={false} />
    </WindowInset>
  ),
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar]"
    )!
    await waitFor(() => expect(bar.getBoundingClientRect().height).toBe(52))
    const back = within(bar).getByRole("button", { name: "Back" })
    await expect(
      Math.abs(back.getBoundingClientRect().left - (72 + 8))
    ).toBeLessThanOrEqual(0.5)
    // The card under it, the bar's height down.
    await expect(
      canvasElement
        .querySelector("[data-slot=sidebar-inset]")!
        .getBoundingClientRect().top
    ).toBe(52)
    // Its buttons and links are controls; its empty space is not.
    for (const control of bar.querySelectorAll("button, a"))
      await expect(control.closest(agentAppTitlebarControls)).not.toBeNull()
    await expect(bar.closest(agentAppTitlebarControls)).toBeNull()
  },
}

/** Without a titlebar, the app's as before: the header in the main area. */
export const NoTitlebar: Story = {
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector("[data-slot=agent-app-titlebar]")
    ).toBeNull()
    await expect(
      canvasElement.querySelectorAll("main [data-slot=agent-app-header]")
    ).toHaveLength(1)
  },
}

/**
 * The sidebar: projects, named apart, opening where the reader is and
 * showing their conversations' most pressing status while closed.
 */
export const Sidebar: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas, canvasElement }) => {
    // Its rows are in a landmark, the app's navigation.
    await expect(
      within(
        canvas.getByRole("navigation", { name: "Projects and conversations" })
      ).getByText("Projects")
    ).toBeVisible()
    // A conversation's title is its page's heading.
    await expect(
      within(canvas.getByRole("main")).getByRole("heading", { level: 1 })
    ).toHaveTextContent("Fix the slow deploy")
    const projects = within(
      canvasElement.querySelector<HTMLElement>(
        "[data-slot=agent-app-projects]"
      )!
    )
    // Two projects named "api" say where each is.
    await expect(projects.getByText("web")).toBeVisible()
    await expect(projects.getByText("cli")).toBeVisible()
    // So do their buttons.
    await expect(
      projects.getByRole("button", { name: "New conversation in api cli" })
    ).toBeInTheDocument()
    // A project that cannot be used says why.
    await expect(
      projects.getByText("Unavailable: The directory is gone")
    ).toBeInTheDocument()
    // Projects are open; vesper, folded, shows that a conversation in it
    // needs the reader.
    const vesper = projects.getByRole("button", { name: /^vesper/ })
    await expect(vesper).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(vesper)
    await expect(vesper).toHaveAttribute("aria-expanded", "false")
    // Its buttons gone again, as the pointer and the focus leave it.
    await userEvent.unhover(vesper)
    vesper.blur()
    await expect(vesper).toHaveAccessibleName("vesper Needs you")
    // On screen too, not by its colour alone: its shape, and its label
    // as the pointer rests on it.
    const needsYou = vesper.querySelector("[data-slot=status-mark]")!
    await userEvent.hover(needsYou)
    await waitFor(() =>
      expect(
        document.querySelector("[data-slot=tooltip-content]")
      ).toHaveTextContent("Needs you")
    )
    await userEvent.unhover(needsYou)
    await waitFor(() =>
      expect(document.querySelector("[data-slot=tooltip-content]")).toBeNull()
    )
    // Its mark ends where its conversations' marks do.
    await onOneLine(
      "status marks",
      {
        project: vesper
          .querySelector("[data-slot=status-mark]")!
          .getBoundingClientRect().right,
        conversation: sidebar()
          .getByRole("link", { name: "A quick question Unread" })
          .querySelector("[data-slot=status-mark]")!
          .getBoundingClientRect().right,
      },
      { edge: "end" }
    )
    // legacy's warning is beside its name, not at the row's end.
    const legacy = projects.getByRole("button", { name: /^legacy/ })
    const legacyName = document.createRange()
    legacyName.selectNodeContents(legacy.querySelector("span")!)
    await expect(
      legacy.querySelector("svg.text-muted-foreground")!.getBoundingClientRect()
        .left - legacyName.getBoundingClientRect().right
    ).toBeLessThan(10)

    // The current conversation's project is open, and it is the page.
    const deploy = sidebar().getByRole("link", { name: "Fix the slow deploy" })
    await expect(deploy).toHaveAttribute("aria-current", "page")
    const header = within(canvas.getByRole("banner"))
    await expect(header.getByText("agent-ui")).toBeVisible()
    await expect(header.getByText("Fix the slow deploy")).toBeVisible()

    // Five of agent-ui's twelve, and a way to its page.
    await expect(
      projects.getByRole("link", { name: "Show all (12)" })
    ).toBeVisible()

    // A project's conversations are under its name, the conversations
    // in no project under the section's label.
    // Where an element's text starts, past its padding.
    const left = (element: Element) => {
      const text = document.createRange()
      text.selectNodeContents(element)
      return Math.round(text.getBoundingClientRect().left)
    }
    const deployTitle = sidebar()
      .getByRole("link", { name: "Fix the slow deploy" })
      .querySelector("span")!
    await expect(left(deployTitle)).toBe(
      left(projects.getByText("agent-ui", { selector: "span" }))
    )
    await expect(
      left(sidebar().getByText("Translate a document", { selector: "span" }))
    ).toBe(left(sidebar().getByText("Conversations")))
    // Rows are 32px of 14px text, an empty project's line too, not
    // taller nor larger; the footer's row starts where they do.
    const deployRow = sidebar().getByRole("link", {
      name: "Fix the slow deploy",
    })
    await expect(deployRow.getBoundingClientRect().height).toBe(32)
    await expect(getComputedStyle(deployRow).fontSize).toBe("14px")
    const none = projects.getAllByText("No conversations yet")[0]!
    await expect(none.getBoundingClientRect().height).toBe(32)
    await expect(getComputedStyle(none).fontSize).toBe("14px")
    await expect(left(sidebar().getByText("sam@example.com"))).toBe(
      left(sidebar().getByText("Conversations"))
    )

    // Focus on a project shows its buttons, not its conversations' (as
    // hovering does: synthetic events cannot hover).
    projects.getByRole("button", { name: /^agent-ui/ }).focus()
    // Its name keeps clear of both, 24px each.
    await waitFor(() =>
      expect(
        getComputedStyle(projects.getByRole("button", { name: /^agent-ui/ }))
          .paddingRight
      ).toBe("60px")
    )
    await expect(
      getComputedStyle(
        projects.getByRole("button", { name: "More for agent-ui" })
      ).opacity
    ).toBe("1")
    await expect(
      getComputedStyle(
        projects.getByRole("button", { name: "More for Fix the slow deploy" })
      ).opacity
    ).toBe("0")

    // Search is a button in the bar above, and ⌘K or Ctrl+K.
    search.mockClear()
    await userEvent.click(sidebar().getByRole("button", { name: "Search" }))
    await userEvent.keyboard("{Control>}k{/Control}")
    await expect(search).toHaveBeenCalledTimes(2)
    // Not while an input method composes.
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        isComposing: true,
        cancelable: true,
      })
    )
    await expect(search).toHaveBeenCalledTimes(2)
    // A project's status the app gives, its conversations not listed,
    // folded.
    const work = projects.getByRole("button", { name: /^api web/ })
    await userEvent.click(work)
    await expect(work).toHaveAccessibleName("api web Failed")
    await userEvent.unhover(work)
    work.blur()
    // The bar is level with the main area's header, beside its card.
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect()
      return Math.round(box.top + box.height / 2)
    }
    await expect(
      middle(document.querySelector("[data-slot=agent-app-sidebar-bar]")!)
    ).toBe(middle(canvas.getByRole("banner")))
    await expect(
      getComputedStyle(canvas.getByRole("main")).borderTopLeftRadius
    ).not.toBe("0px")

    // The header's divider is in the middle of it.
    const bar = canvas.getByRole("banner").getBoundingClientRect()
    const divider = canvas
      .getByRole("banner")
      .querySelector("[data-slot=separator]")!
      .getBoundingClientRect()
    await expect(
      Math.abs(divider.top + divider.height / 2 - (bar.top + bar.height / 2))
    ).toBeLessThan(1)

    // Going to another conversation.
    await userEvent.click(
      sidebar().getByRole("link", { name: "A quick question Unread" })
    )
    await expect(
      sidebar().getByRole("link", { name: "A quick question" })
    ).toHaveAttribute("aria-current", "page")
    await expect(header.queryByText("agent-ui")).toBeNull()
  },
}

const selected = fn()
const projectSelected = fn()

/**
 * Rows with addresses are links: a click with ⌘, Ctrl, Shift or Alt, or
 * by the middle button, is the browser's (a new tab), not the app's to
 * route; a plain one is.
 */
export const NewTab: Story = {
  args: { sidebar: null },
  render: () => (
    <FoldProvider>
      <AgentApp
        sidebar={
          <AgentAppSidebar
            layout="tree"
            projects={[
              {
                ...projectList[0]!,
                conversations: [{ id: "deploy", title: "Fix the slow deploy" }],
              },
            ]}
            conversations={[]}
            current={{ conversation: "deploy" }}
            href={(target) =>
              "conversation" in target ? `#/c/${target.conversation}` : "#/p"
            }
            onSelect={(target, event) => {
              event.preventDefault()
              selected(target)
            }}
          />
        }
      >
        <AgentAppHeader
          project={projectList[0]!}
          title="Fix the slow deploy"
          projectHref="#/p/agent-ui"
          onProjectSelect={(event) => {
            event.preventDefault()
            projectSelected()
          }}
        />
        <AgentAppProject
          project={projectList[0]!}
          conversations={[{ id: "deploy", title: "Fix the slow deploy" }]}
          href={(target) =>
            "conversation" in target ? `#/c/${target.conversation}` : undefined
          }
          onSelect={(target, event) => {
            event.preventDefault()
            selected(target)
          }}
        />
      </AgentApp>
    </FoldProvider>
  ),
  play: async ({ canvas }) => {
    // Clicks as the browser would take them, its default kept from the
    // story's frame (a new tab) once the page has had them.
    const click = async (element: Element, init: MouseEventInit) => {
      let prevented: boolean | undefined
      const keep = (event: Event) => {
        prevented = event.defaultPrevented
        event.preventDefault()
      }
      window.addEventListener("click", keep, { once: true })
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, ...init })
      )
      window.removeEventListener("click", keep)
      return prevented
    }
    const rows = [
      sidebar().getByRole("link", { name: "Fix the slow deploy" }),
      canvas
        .getByRole("main")
        .querySelector<HTMLElement>("[data-slot=item] a[href]")!,
    ]
    const project = within(canvas.getByRole("banner")).getByRole("link", {
      name: /^agent-ui/,
    })
    for (const init of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      selected.mockClear()
      projectSelected.mockClear()
      for (const row of rows) await expect(await click(row, init)).toBe(false)
      await expect(await click(project, init)).toBe(false)
      await expect(selected).not.toHaveBeenCalled()
      await expect(projectSelected).not.toHaveBeenCalled()
    }
    // A plain click is the app's.
    for (const row of rows) await expect(await click(row, {})).toBe(true)
    await expect(selected).toHaveBeenCalledTimes(2)
    await expect(selected).toHaveBeenCalledWith({ conversation: "deploy" })
    await expect(await click(project, {})).toBe(true)
    await expect(projectSelected).toHaveBeenCalledTimes(1)
  },
}

/**
 * A new conversation from the top is in the current conversation's
 * project, picked again above the composer: a project that cannot be
 * used cannot be picked. Once sent, its project is fixed: it is in the
 * header, and the picker is gone.
 */
export const NewConversation: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(
      sidebar().getByRole("button", { name: "New conversation" })
    )
    const picker = canvas.getByRole("combobox", { name: "Project: agent-ui" })
    await expect(
      within(canvas.getByRole("banner")).getByText("New conversation")
    ).toBeVisible()

    await userEvent.click(picker)
    const search = await body.findByRole("combobox", {
      name: "Search projects",
    })
    await waitFor(() => expect(search).toHaveFocus())
    await expect(body.getByRole("option", { name: /^legacy/ })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    await userEvent.keyboard("cli")
    await expect(body.queryByRole("option", { name: /^vesper/ })).toBeNull()
    await userEvent.click(await body.findByRole("option", { name: /^api cli/ }))
    await waitFor(() => expect(picker).toHaveAccessibleName("Project: api"))

    await waitFor(() => expect(body.queryByRole("listbox")).toBeNull())
    const message = canvas.getByRole("textbox", { name: "Message" })
    await userEvent.click(message)
    await waitFor(() => expect(message).toHaveFocus())
    await userEvent.keyboard("Add a health check")
    await waitFor(() => expect(message).toHaveTextContent("Add a health check"))
    await userEvent.keyboard("{Enter}")

    const header = within(canvas.getByRole("banner"))
    await expect(await header.findByText("Add a health check")).toBeVisible()
    await expect(header.getByText("api")).toBeVisible()
    await expect(
      canvasElement.querySelector("[data-slot=composer-context]")
    ).toBeNull()
    // In its project, open, as where the reader is.
    const row = sidebar().getByRole("link", { name: /^Add a health check/ })
    await expect(row).toHaveAttribute("aria-current", "page")
    await expect(row.closest("[data-slot=project]")).toHaveTextContent("cli")
    await waitFor(() => expect(row).toHaveAccessibleName("Add a health check"))
    // agent-ui, where the reader was, is still open.
    await expect(
      sidebar().getByRole("link", { name: "Fix the slow deploy" })
    ).toBeVisible()
  },
}

/**
 * "Show all" goes to the project's page: its conversations, as many as
 * the app loads, a new one in it, and the app's own sections.
 */
export const ShowAll: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    // Where the conversation's column starts.
    const column = document
      .querySelector("[data-slot=agent-turn]")!
      .getBoundingClientRect().left
    await userEvent.click(
      sidebar().getByRole("link", { name: "Show all (12)" })
    )
    const title = canvas.getByRole("heading", { level: 1, name: "agent-ui" })
    await expect(title).toBeVisible()
    // The page's column is the conversation's: it starts there too.
    await expect(
      Math.abs(title.getBoundingClientRect().left - column)
    ).toBeLessThan(1)
    await expect(canvas.getByText("~/code/agent-ui")).toBeVisible()
    await expect(
      sidebar().getByRole("link", { name: "Show all (12)" })
    ).toHaveAttribute("aria-current", "page")

    const section = within(
      canvas.getByRole("region", { name: "Conversations" })
    )
    await expect(section.getAllByRole("listitem")).toHaveLength(5)
    await expect(
      section.getByRole("link", { name: /^Fix the slow deploy/ })
    ).toHaveAttribute("href", "#/c/deploy")
    // More, while they load, then none left to load.
    const more = section.getByRole("button", { name: "Load more" })
    await userEvent.click(more)
    // Busy, and unavailable, but where the focus was.
    await expect(more).toHaveAttribute("aria-busy", "true")
    await expect(more).toHaveAttribute("aria-disabled", "true")
    await expect(more).toHaveFocus()
    await waitFor(() =>
      expect(section.getAllByRole("listitem")).toHaveLength(10)
    )
    await waitFor(() => expect(more).not.toHaveAttribute("aria-busy"))
    await expect(more).toHaveFocus()
    await userEvent.click(section.getByRole("button", { name: "Load more" }))
    await waitFor(() =>
      expect(section.getAllByRole("listitem")).toHaveLength(12)
    )
    await expect(
      section.queryByRole("button", { name: "Load more" })
    ).toBeNull()

    // The app's own section, under its heading.
    await expect(
      canvas.getByRole("region", { name: "Instructions" })
    ).toBeVisible()

    // Going to one of them.
    await userEvent.click(
      section.getByRole("link", { name: /^Fix the slow deploy/ })
    )
    await expect(
      within(canvas.getByRole("banner")).getByText("Fix the slow deploy")
    ).toBeVisible()

    // A new conversation in this project, from its page.
    await userEvent.click(
      sidebar().getByRole("link", { name: "Show all (12)" })
    )
    await userEvent.click(
      within(canvas.getByRole("main")).getByRole("button", {
        name: "New conversation",
      })
    )
    await expect(
      canvas.getByRole("combobox", { name: "Project: agent-ui" })
    ).toBeVisible()
  },
}

/**
 * The conversations in no project: the sidebar lists the latest, "Show
 * all" goes to their page, where one starts in no project.
 */
export const NoProject: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    const loose = within(
      document.querySelector<HTMLElement>(
        "[data-slot=agent-app-conversations]"
      )!
    )
    await expect(loose.getAllByRole("listitem")).toHaveLength(6)
    await userEvent.click(loose.getByRole("link", { name: "Show all (7)" }))
    await expect(
      loose.getByRole("link", { name: "Show all (7)" })
    ).toHaveAttribute("aria-current", "page")

    const main = within(canvas.getByRole("main"))
    await expect(
      main.getByRole("heading", { level: 1, name: "Conversations" })
    ).toBeVisible()
    const section = within(main.getByRole("region", { name: "Conversations" }))
    await expect(section.getAllByRole("listitem")).toHaveLength(5)
    await userEvent.click(section.getByRole("button", { name: "Load more" }))
    await expect(section.getAllByRole("listitem")).toHaveLength(7)

    await userEvent.click(
      main.getByRole("button", { name: "New conversation" })
    )
    const picker = canvas.getByRole("combobox", { name: "Project: No project" })
    await expect(picker).toBeVisible()
    // Its folder crossed out, as in its list.
    await expect(picker.querySelector("svg path")?.getAttribute("d")).toBe(
      FolderRemoveIcon[0]?.[1].d
    )
  },
}

/**
 * None in no project given, but their page has some (the app's own, as
 * an agent's earlier work): the group is "Show all" alone, to that page.
 */
export const NoProjectOnlyOnItsPage: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[]}
          conversationCount={3}
          href={() => "#"}
        />
      }
    >
      <AgentAppHeader />
    </AgentApp>
  ),
  play: async () => {
    const loose = within(
      document.querySelector<HTMLElement>(
        "[data-slot=agent-app-conversations]"
      )!
    )
    await expect(loose.getByText("Conversations")).toBeVisible()
    await expect(loose.getAllByRole("listitem")).toHaveLength(1)
    await expect(
      loose.getByRole("link", { name: "Show all (3)" })
    ).toBeVisible()
  },
}

/** None in no project, none on their page: no group. */
export const NoProjectNone: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppHeader />
    </AgentApp>
  ),
  play: async () => {
    await expect(
      document.querySelector("[data-slot=agent-app-conversations]")
    ).toBeNull()
  },
}

/** A project that cannot be used says why on its page, and starts nothing. */
export const UnavailableProject: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    await userEvent.click(
      sidebar().getByRole("button", { name: "More for legacy" })
    )
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Open project" })
    )
    const main = within(canvas.getByRole("main"))
    await expect(
      await main.findByRole("heading", { level: 1, name: "legacy" })
    ).toBeVisible()
    await expect(main.getByRole("alert")).toHaveTextContent(
      "This project cannot be usedThe directory is gone"
    )
    await expect(main.getByText("No conversations yet")).toBeVisible()
    await expect(
      main.queryByRole("button", { name: "New conversation" })
    ).toBeNull()
  },
}

/**
 * A project with none of its conversations but the app's own sections
 * under them (an agent's earlier work): a line says there are none,
 * leaving the page to the sections; the header starts one.
 */
export const EmptyProject: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppProject
        project={{ id: "fresh", path: "~/code/fresh" }}
        conversations={[]}
        onNewConversation={() => {}}
      >
        <AgentAppProjectSection title="Earlier work">
          <p className="text-sm">Fix the release script</p>
        </AgentAppProjectSection>
      </AgentAppProject>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No conversations yet")).toHaveAttribute(
      "data-slot",
      "agent-app-conversation-list-empty"
    )
    await expect(
      canvas.queryByText("Conversations started in this project show here.")
    ).toBeNull()
    await expect(
      canvas.getAllByRole("button", { name: "New conversation" })
    ).toHaveLength(1)
    await expect(
      canvas.getByRole("heading", { name: "Earlier work" })
    ).toBeVisible()
  },
}

const goBack = fn((event: React.MouseEvent) => event.preventDefault())

/** A page's views as line tabs on a rule, above its title, 16px over it. */
export const PageTabs: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-svh flex-col">
      <Tabs defaultValue="keys">
        <AgentAppPage
          tabs={
            <TabsList variant="line" rule>
              <TabsTrigger value="keys">Keys</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>
          }
          title="Settings"
        >
          <TabsContent value="keys">
            <p className="text-sm">Two keys</p>
          </TabsContent>
        </AgentAppPage>
      </Tabs>
    </div>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole("tablist")
    const title = canvas.getByRole("heading", { level: 1, name: "Settings" })
    await expect(
      title.getBoundingClientRect().top - list.getBoundingClientRect().bottom
    ).toBe(16)
    // Across the page's column.
    await expect(list.getBoundingClientRect().width).toBe(
      list
        .closest("[data-slot=agent-app-page-tabs]")!
        .parentElement!.getBoundingClientRect().width
    )
    // The first tab's word on the page's start line, the title's and the
    // content's.
    await onOneLine("page start", {
      tab: canvas.getByRole("tab", { name: "Keys" }),
      title,
      content: canvas.getByText("Two keys"),
    })
  },
}

/** On a phone, the same start line. */
export const PageTabsPhone: Story = {
  ...PageTabs,
  globals: { viewport: { value: "mobile1", isRotated: false } },
}

/**
 * A page under another (Settings → Security): the way back above its title,
 * in the same column, a muted link named by the parent page; reached by
 * the keyboard first.
 */
export const SubPage: Story = {
  args: { sidebar: null },
  beforeEach: () => {
    goBack.mockClear()
  },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppPage
        back={{ label: "Settings", href: "#settings", onClick: goBack }}
        title="HTTPS"
        description="Certificates for this device's address"
      >
        <AgentAppProjectSection title="Certificate">
          <p className="text-sm">Issued by Let's Encrypt</p>
        </AgentAppProjectSection>
      </AgentAppPage>
    </div>
  ),
  play: async ({ canvas }) => {
    const back = canvas.getByRole("link", { name: "Settings" })
    await expect(back).toHaveAttribute("href", "#settings")
    const title = canvas.getByRole("heading", { level: 1, name: "HTTPS" })
    const link = back.getBoundingClientRect()
    const heading = title.getBoundingClientRect()
    await expect(link.bottom).toBeLessThanOrEqual(heading.top)
    // In the title's column: the arrow where the title starts.
    await expect(
      Math.abs(
        back.querySelector("svg")!.getBoundingClientRect().left - heading.left
      )
    ).toBeLessThanOrEqual(4)
    await expect(getComputedStyle(back).color).toBe(
      getComputedStyle(
        canvas.getByText("Certificates for this device's address")
      ).color
    )
    await userEvent.tab()
    await expect(back).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(goBack).toHaveBeenCalledTimes(1)
  },
}

/**
 * A page whose content names itself (a form with its own heading): no
 * title, the way back and the column kept.
 */
export const SubPageUntitled: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppPage back={{ label: "Sharing", href: "#sharing" }}>
        <form aria-labelledby="person" className="flex flex-col gap-4">
          <h1 id="person" className="text-lg font-medium">
            Ada Lovelace
          </h1>
          <Field>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <Input id="role" defaultValue="Viewer" />
          </Field>
        </form>
      </AgentAppPage>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Ada Lovelace" })
    ).toBeVisible()
    const back = canvas.getByRole("link", { name: "Sharing" })
    await expect(back).toBeVisible()
    const column = canvasElement.querySelector(
      "[data-slot=agent-app-page] > div"
    )!
    await expect(column.getBoundingClientRect().width).toBeLessThanOrEqual(784)
    // The page's own heading under it as a title would be.
    const gap =
      canvas
        .getByRole("heading", { name: "Ada Lovelace" })
        .getBoundingClientRect().top - back.getBoundingClientRect().bottom
    await expect(gap).toBeGreaterThanOrEqual(0)
    await expect(gap).toBeLessThanOrEqual(8)
  },
}

/**
 * A settings page: its column a conversation's (784px, 16px in), its
 * fields on its 12 columns of 48px, a label 4 and its control 8.
 */
export const SettingsPage: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppPage title="Settings" description="This device">
        <FieldGroup>
          <Field orientation="responsive">
            <FieldLabel htmlFor="settings-name">Device name</FieldLabel>
            <Input id="settings-name" defaultValue="devbox" />
          </Field>
          <Field orientation="responsive">
            <FieldLabel htmlFor="settings-port">Port</FieldLabel>
            <Input id="settings-port" defaultValue="8080" />
          </Field>
        </FieldGroup>
      </AgentAppPage>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const column = canvasElement
      .querySelector("[data-slot=agent-app-page] > div")!
      .getBoundingClientRect()
    await expect(column.width).toBe(784)
    const title = canvas
      .getByRole("heading", { level: 1, name: "Settings" })
      .getBoundingClientRect()
    await expect(title.left - column.left).toBe(16)
    // 752px: 12 columns of 48, 16 apart; a control from the fifth.
    const name = canvas.getByLabelText("Device name").getBoundingClientRect()
    await expect(name.left - title.left).toBe(4 * (48 + 16))
    await expect(name.width).toBe(8 * 48 + 7 * 16)
  },
}

/**
 * A new conversation's page with a line under its heading: centred,
 * muted, 8px under it, the two centred over the composer, which is at
 * the foot where the conversation's will be.
 */
export const StartDescription: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppStart
        title="What should we work on?"
        description="Ask a question, or drop files to start from."
      >
        <textarea aria-label="Message" className="h-24 rounded-lg border" />
      </AgentAppStart>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const heading = canvas.getByRole("heading", {
      name: "What should we work on?",
    })
    const description = canvas.getByText(
      "Ask a question, or drop files to start from."
    )
    await expect(getComputedStyle(description).textAlign).toBe("center")
    await expect(getComputedStyle(description).color).not.toBe(
      getComputedStyle(heading).color
    )
    await expect(
      description.getBoundingClientRect().top -
        heading.getBoundingClientRect().bottom
    ).toBe(8)
    // The two centred in the room over the composer.
    const room = canvasElement
      .querySelector("[data-slot=agent-app-start-room]")!
      .getBoundingClientRect()
    const block = canvasElement
      .querySelector("[data-slot=agent-app-start-heading]")!
      .getBoundingClientRect()
    await expect(
      Math.abs((block.top + block.bottom) / 2 - (room.top + room.bottom) / 2)
    ).toBeLessThanOrEqual(1)
    // The composer at the foot, 24px up, as in a conversation's dock.
    const message = canvas
      .getByRole("textbox", { name: "Message" })
      .getBoundingClientRect()
    await expect(innerHeight - message.bottom).toBe(24)
  },
}

/**
 * Sending the first message moves nothing: the start page's composer,
 * and the notice over it, are where the conversation's dock puts them.
 */
export const StartWhereTheDockIs: Story = {
  args: { sidebar: null },
  render: function Render() {
    const [sent, setSent] = React.useState(false)
    const composer = (
      <>
        <p className="text-sm text-muted-foreground">
          Full access is on for this conversation
        </p>
        <textarea aria-label="Message" className="h-24 rounded-lg border" />
        <button type="button" onClick={() => setSent(true)}>
          Send
        </button>
      </>
    )
    return (
      <div className="flex h-svh flex-col">
        {sent ? (
          <>
            <div className="min-h-0 flex-1" />
            <AgentAppDock>
              <div className="flex flex-col gap-6">{composer}</div>
            </AgentAppDock>
          </>
        ) : (
          <AgentAppStart title="What should we work on?">
            {composer}
          </AgentAppStart>
        )}
      </div>
    )
  },
  play: async ({ canvas }) => {
    const rects = () =>
      ["Message", "Full access is on for this conversation"].map((name) => {
        const element =
          name === "Message"
            ? canvas.getByRole("textbox", { name })
            : canvas.getByText(name)
        const { top, left, width } = element.getBoundingClientRect()
        return { top, left, width }
      })
    const before = rects()
    await userEvent.click(canvas.getByRole("button", { name: "Send" }))
    await waitFor(() =>
      expect(canvas.queryByRole("heading", { level: 2 })).toBeNull()
    )
    await expect(rects()).toEqual(before)
  },
}

/**
 * In a short window the heading's room shrinks and scrolls; the
 * composer stays in sight at the foot.
 */
export const StartShortWindow: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-60 flex-col">
      <AgentAppStart
        title="What should we work on?"
        description="Ask a question, or drop files to start from."
      >
        <textarea aria-label="Message" className="h-32 rounded-lg border" />
      </AgentAppStart>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const box = canvasElement
      .querySelector("[data-slot=agent-app-start]")!
      .getBoundingClientRect()
    const message = canvas
      .getByRole("textbox", { name: "Message" })
      .getBoundingClientRect()
    await expect(message.bottom).toBeLessThanOrEqual(box.bottom - 24 + 0.5)
    await expect(message.top).toBeGreaterThanOrEqual(box.top)
    const room = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-start-room]"
    )!
    await expect(room.scrollHeight).toBeGreaterThan(room.clientHeight)
  },
}

/**
 * A page's description wraps, read whole on a phone: what the page is
 * for, or a long path, broken where it must be.
 */
export const PageDescriptionWraps: Story = {
  args: { sidebar: null },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppPage
        title="Snippets"
        description="Snippets saved from a conversation, to paste into another one, kept with the project in ~/code/app/.snippets/saved"
      >
        <p className="text-sm">No snippets yet</p>
      </AgentAppPage>
    </div>
  ),
  play: async ({ canvas }) => {
    const description = canvas.getByText(/^Snippets saved/)
    await expect(description.scrollWidth).toBeLessThanOrEqual(
      description.clientWidth
    )
    await expect(description.getBoundingClientRect().height).toBeGreaterThan(
      parseFloat(getComputedStyle(description).lineHeight) * 2
    )
  },
}

const snippets = Array.from({ length: 2000 }, (_, index) => ({
  id: `s${index + 1}`,
  title: `Snippet ${index + 1}`,
}))

/**
 * A page of thousands (`fill`): it does not scroll; its list takes the
 * rest of its height, under its head, and scrolls itself, its footer
 * kept under it.
 */
export const PageFill: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppPage
        fill
        title="Snippets"
        description="2,000 snippets"
        footer={<p className="text-sm">Export all</p>}
      >
        <VirtualList
          role="list"
          aria-label="Snippets"
          tabIndex={0}
          className="min-h-0 flex-1"
          items={snippets}
          getKey={(item) => item.id}
          estimateSize={36}
          renderItem={(item) => (
            <div role="listitem" className="flex h-9 items-center text-sm">
              {item.title}
            </div>
          )}
        />
      </AgentAppPage>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const page = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-page]"
    )!
    const list = canvas.getByRole("list", { name: "Snippets" })
    // The list scrolls, not the page.
    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight * 10)
    await expect(page.scrollHeight).toBe(page.clientHeight)
    // Under the head, to the footer, within the page.
    const title = canvas.getByRole("heading", { level: 1, name: "Snippets" })
    const footer = canvas.getByText("Export all")
    await expect(list.getBoundingClientRect().top).toBeGreaterThan(
      title.getBoundingClientRect().bottom
    )
    await expect(list.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      footer.getBoundingClientRect().top
    )
    await expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      page.getBoundingClientRect().bottom
    )
    list.scrollTop = list.scrollHeight
    await waitFor(() => expect(canvas.getByText("Snippet 2000")).toBeVisible())
  },
}

/** With nothing under the list, its empty state; the header starts one. */
export const EmptyProjectAlone: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-svh flex-col">
      <AgentAppProject
        project={{ id: "fresh", path: "~/code/fresh" }}
        conversations={[]}
        onNewConversation={() => {}}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Conversations started in this project show here.")
    ).toBeVisible()
    // One way to start one: the header's, not another in the list.
    await expect(
      canvas.getAllByRole("button", { name: "New conversation" })
    ).toHaveLength(1)
  },
}

/**
 * A panel of the app's beside the conversation, its files: opened from
 * the header, as wide as the reader drags it, level with the header.
 */
/** Once the panels stand: a panel opened or closed by a button moves. */
const panelsStill = () =>
  waitFor(() =>
    expect(document.querySelector("[data-panel-motion]")).toBeNull()
  )

export const Panel: Story = {
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvas }) => {
    const header = within(canvas.getByRole("banner"))
    const trigger = header.getByRole("button", { name: "Files" })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    resized.mockClear()
    await userEvent.click(trigger)
    const panel = canvas.getByRole("complementary", { name: "Files" })
    // Not as it first takes its place.
    await expect(resized).not.toHaveBeenCalled()
    await expect(panel).toBeVisible()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(trigger).toHaveAttribute("aria-controls", panel.id)
    await expect(within(panel).getByText("vite.config.ts")).toBeVisible()

    // Its bar is level with the header.
    const bar = panel.firstElementChild!.getBoundingClientRect()
    const head = canvas.getByRole("banner").getBoundingClientRect()
    await expect(bar.top).toBe(head.top)
    await expect(bar.height).toBe(head.height)

    // Wider by the keyboard on its handle, once it has opened.
    await panelsStill()
    const width = panel.getBoundingClientRect().width
    document.querySelector<HTMLElement>("[data-slot=resizable-handle]")!.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() =>
      expect(panel.getBoundingClientRect().width).toBeGreaterThan(width)
    )
    // The app is told its width, to keep.
    await waitFor(() =>
      expect(
        Math.abs(
          resized.mock.lastCall![0] -
            panel.parentElement!.getBoundingClientRect().width
        )
      ).toBeLessThanOrEqual(1)
    )
    // The width the app gives back waits for the next time: the reader's
    // stays, and widens on.
    const wider = panel.getBoundingClientRect().width
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() =>
      expect(panel.getBoundingClientRect().width).toBeGreaterThan(wider)
    )
    // And by dragging its handle, past each width the app keeps.
    const handle = document.querySelector<HTMLElement>(
      "[data-slot=resizable-handle]"
    )!
    // No pointer of the browser's moves it to be captured.
    handle.setPointerCapture = () => {}
    const before = panel.getBoundingClientRect().width
    const { x, y, width: thick } = handle.getBoundingClientRect()
    const at = (type: string, clientX: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX,
        clientY: y + 10,
      })
    // Pressed where a pointer would be: on what is under the 1px line,
    // which the panels take as the handle by its reach.
    const under = document.elementFromPoint(x + thick / 2, y + 10)!
    under.dispatchEvent(at("pointerdown", x + thick / 2))
    for (const step of [10, 20, 30, 40, 50, 60]) {
      under.dispatchEvent(at("pointermove", x + thick / 2 - step))
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    under.dispatchEvent(at("pointerup", x + thick / 2 - 60))
    await waitFor(() =>
      expect(
        Math.abs(panel.getBoundingClientRect().width - (before + 60))
      ).toBeLessThanOrEqual(1)
    )
    const kept = panel.getBoundingClientRect().width

    await userEvent.click(within(panel).getByRole("button", { name: "Close" }))
    await waitFor(() =>
      expect(canvas.queryByRole("complementary", { name: "Files" })).toBeNull()
    )
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    // Focus goes back to what opened it, not to the page.
    await expect(trigger).toHaveFocus()

    // Open again, as wide as it was left as far as the main area keeps
    // its narrowest, 600px (here, dragged past it, it does not): the
    // reader may drag it wider again.
    await userEvent.click(trigger)
    const again = canvas.getByRole("complementary", { name: "Files" })
    await panelsStill()
    const main = document.querySelector("#agent-app-main-panel")!
    await waitFor(() =>
      expect(again.getBoundingClientRect().width).toBeLessThan(kept)
    )
    await expect(
      Math.round(main.getBoundingClientRect().width)
    ).toBeGreaterThanOrEqual(599)
    await userEvent.click(within(again).getByRole("button", { name: "Close" }))
  },
}

/**
 * Opened again after the window widened, the panel is as wide as the
 * reader left it, not the share of the window it was.
 */
export const PanelReopensAtItsWidth: Story = {
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvas, canvasElement }) => {
    const trigger = within(canvas.getByRole("banner")).getByRole("button", {
      name: "Files",
    })
    resized.mockClear()
    await userEvent.click(trigger)
    const panel = canvas.getByRole("complementary", { name: "Files" })
    await panelsStill()
    const width = panel.getBoundingClientRect().width
    document.querySelector<HTMLElement>("[data-slot=resizable-handle]")!.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() =>
      expect(panel.getBoundingClientRect().width).toBeGreaterThan(width)
    )
    const kept = panel.getBoundingClientRect().width
    // Kept by the app.
    await waitFor(() =>
      expect(Math.abs(resized.mock.lastCall![0] - kept)).toBeLessThanOrEqual(1)
    )
    await userEvent.click(within(panel).getByRole("button", { name: "Close" }))

    // Wider by 200px.
    const root = canvasElement
    const was = root.getBoundingClientRect().width
    root.style.width = `${was + 200}px`
    try {
      await waitFor(() =>
        expect(
          document
            .querySelector("#agent-app-main-panel")!
            .getBoundingClientRect().right
        ).toBeGreaterThan(was)
      )
      await userEvent.click(trigger)
      const again = canvas.getByRole("complementary", { name: "Files" })
      await waitFor(() =>
        expect(
          Math.abs(again.getBoundingClientRect().width - kept)
        ).toBeLessThanOrEqual(1)
      )
      await userEvent.click(
        within(again).getByRole("button", { name: "Close" })
      )
    } finally {
      root.style.width = ""
    }
  },
}

function OpenedByTheApp({ trigger }: { trigger: boolean }) {
  const [open, setOpen] = React.useState(false)
  return (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppPanels
        title="Files"
        panel={<p className="p-4 text-sm">vite.config.ts</p>}
        open={open}
        onOpenChange={setOpen}
      >
        <AgentAppHeader
          title="Fix the slow deploy"
          actions={trigger && <AgentAppPanelTrigger />}
        />
        <div className="p-4">
          {/* As a file the agent wrote opens it. */}
          <Button variant="outline" onClick={() => setOpen(true)}>
            Show the file
          </Button>
        </div>
      </AgentAppPanels>
    </AgentApp>
  )
}

/** Opens the panel as the app does, closes it by its button. */
/**
 * A browser's tabs, its page's toolbar and the bar's last button on one
 * pair of lines: the first tab and the first tool, 12px in; the bar's
 * last button and the toolbar's, 12px from the end.
 */
async function onPanelLines(panel: HTMLElement, bar: HTMLElement) {
  bar.querySelector("[role=tablist]")!.scrollLeft = 0
  const toolbar = panel.querySelector<HTMLElement>(
    "[data-slot=browser-toolbar]"
  )!
  const shown = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLElement>("button")).filter(
      (button) => button.offsetParent !== null && !button.closest("[role=tab]")
    )
  // A tool in an island by the island's edge.
  const edge = (button: HTMLElement) =>
    (
      button.closest("[data-slot=viewer-tool-group]") ?? button
    ).getBoundingClientRect()
  // Once the toolbar has measured what fits, as a slow machine may not yet.
  await waitFor(() => {
    const tools = shown(toolbar)
    const buttons = shown(bar)
    const box = panel.getBoundingClientRect()
    expect(bar.querySelector("[role=tab]")!.getBoundingClientRect().left).toBe(
      edge(tools[0]!).left
    )
    expect(edge(tools[0]!).left).toBe(box.left + 12)
    expect(edge(buttons.at(-1)!).right).toBe(edge(tools.at(-1)!).right)
    expect(edge(tools.at(-1)!).right).toBe(box.right - 12)
  })
}

async function openAndClose(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole("button", { name: "Show the file" }))
  const panel = await canvas.findByRole("complementary", { name: "Files" })
  await userEvent.click(within(panel).getByRole("button", { name: "Close" }))
  await waitFor(() =>
    expect(canvas.queryByRole("complementary", { name: "Files" })).toBeNull()
  )
}

/**
 * Opened by the app, not its trigger, the panel gives focus back to the
 * trigger as it closes.
 */
export const PanelOpenedByTheApp: Story = {
  args: { sidebar: null },
  render: () => <OpenedByTheApp trigger />,
  play: async ({ canvas }) => {
    await openAndClose(canvas)
    await expect(canvas.getByRole("button", { name: "Files" })).toHaveFocus()
  },
}

/** With no trigger, the panel gives focus to the main area as it closes. */
export const PanelWithoutTrigger: Story = {
  args: { sidebar: null },
  render: () => <OpenedByTheApp trigger={false} />,
  play: async ({ canvas }) => {
    await openAndClose(canvas)
    await expect(canvas.getByRole("main")).toHaveFocus()
  },
}

/**
 * The sidebar's edge: dragged, it makes the sidebar wider or narrower, and
 * the app is told the width to keep; clicked, it closes and opens it. By
 * the keyboard a splitter: arrows, Home and End, Enter.
 */
export const SidebarWidth: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    const edge = canvas.getByRole("separator", { name: "Sidebar width" })
    const sidebar = () =>
      document
        .querySelector("[data-slot=sidebar-container]")!
        .getBoundingClientRect().width
    await expect(edge).toHaveAttribute("aria-valuenow", "240")
    await expect(sidebar()).toBe(240)
    sidebarResized.mockClear()

    // Dragged 64 pixels out.
    const { x, y } = edge.getBoundingClientRect()
    const at = (type: string, clientX: number) =>
      new PointerEvent(type, { bubbles: true, button: 0, clientX, clientY: y })
    edge.dispatchEvent(at("pointerdown", x))
    window.dispatchEvent(at("pointermove", x + 32))
    // No transitions while it is dragged: the sidebar follows at once.
    await waitFor(() =>
      expect(document.querySelector("[data-slot=agent-app]")).toHaveAttribute(
        "data-resizing"
      )
    )
    await waitFor(() => expect(sidebar()).toBe(272))
    window.dispatchEvent(at("pointerup", x + 64))
    // The click that ends a drag, at once, does not close it.
    edge.click()
    await waitFor(() => expect(sidebar()).toBe(304))
    await expect(sidebarResized).toHaveBeenLastCalledWith(304)
    await expect(
      document.querySelector("[data-slot=agent-app]")
    ).not.toHaveAttribute("data-resizing")
    await expect(edge).toHaveAttribute("aria-valuenow", "304")
    // A drag far out stops at its widest.
    edge.dispatchEvent(at("pointerdown", x))
    window.dispatchEvent(at("pointermove", x + 900))
    window.dispatchEvent(at("pointerup", x + 900))
    await waitFor(() => expect(sidebarResized).toHaveBeenLastCalledWith(480))

    // By the keyboard.
    edge.focus()
    await userEvent.keyboard("{Home}")
    await expect(sidebarResized).toHaveBeenLastCalledWith(208)
    await userEvent.keyboard("{ArrowRight}")
    await expect(sidebarResized).toHaveBeenLastCalledWith(224)
    await waitFor(() => expect(sidebar()).toBe(224))
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(document.querySelector("[data-slot=sidebar]")).toHaveAttribute(
        "data-state",
        "collapsed"
      )
    )
    await expect(edge).toHaveAttribute("aria-valuenow", "0")
    // Closed, a click opens it, as wide as it was.
    await userEvent.click(edge)
    await waitFor(() =>
      expect(document.querySelector("[data-slot=sidebar]")).toHaveAttribute(
        "data-state",
        "expanded"
      )
    )
    await expect(edge).toHaveAttribute("aria-valuenow", "224")
  },
}

// A phone's width, switched while the page is open.
const phone = {
  matches: false,
  listeners: new Set<() => void>(),
  set(matches: boolean) {
    phone.matches = matches
    for (const listener of phone.listeners) listener()
  },
}

let mounts = 0
let panelMounts = 0
function Counted() {
  React.useEffect(() => {
    mounts++
  }, [])
  return <input aria-label="Draft" className="m-4 border" />
}

/** The panel's content: a field, a frame, and how often it mounted. */
function PanelContent() {
  React.useEffect(() => {
    panelMounts++
  }, [])
  return (
    <div className="flex flex-col gap-2 p-4">
      <input aria-label="Path" className="border" />
      <iframe
        title="Browser"
        srcDoc="<p>Hello</p>"
        className="h-24 w-full border"
      />
    </div>
  )
}

function Resizing() {
  const [open, setOpen] = React.useState(false)
  return (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppPanels
        title="Files"
        open={open}
        onOpenChange={setOpen}
        panel={<PanelContent />}
      >
        <AgentAppHeader
          title="A conversation"
          actions={<AgentAppPanelTrigger />}
        />
        <Counted />
      </AgentAppPanels>
    </AgentApp>
  )
}

/**
 * Crossing a phone's width, the main area stays as it is, its panel open
 * or not: what the reader typed in it, the app's state, is kept.
 */
export const CrossesPhoneWidth: Story = {
  args: { sidebar: null },
  beforeEach: () => {
    const matchMedia = window.matchMedia
    window.matchMedia = (query) =>
      /max-width: 639px/.test(query)
        ? ({
            get matches() {
              return phone.matches
            },
            media: query,
            onchange: null,
            addEventListener: (_: string, listener: () => void) =>
              phone.listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) =>
              phone.listeners.delete(listener),
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList)
        : matchMedia.call(window, query)
    phone.matches = false
    mounts = 0
    panelMounts = 0
    return () => {
      window.matchMedia = matchMedia
    }
  },
  render: () => <Resizing />,
  play: async ({ canvas }) => {
    const draft = canvas.getByRole("textbox", { name: "Draft" })
    await userEvent.type(draft, "half a thought")
    await expect(mounts).toBe(1)

    // Closed panel: to a phone and back.
    phone.set(true)
    await waitFor(() =>
      expect(document.querySelector("[data-sidebar=sidebar]")).toBeNull()
    )
    phone.set(false)
    await waitFor(() =>
      expect(document.querySelector("[data-sidebar=sidebar]")).not.toBeNull()
    )
    await expect(canvas.getByRole("textbox", { name: "Draft" })).toBe(draft)
    await expect(draft).toHaveValue("half a thought")

    // Open panel: beside it, then a sheet, then beside it again; its
    // content as it was, its field's text, its frame's page.
    await userEvent.click(canvas.getByRole("button", { name: "Files" }))
    await expect(
      canvas.getByRole("complementary", { name: "Files" })
    ).toBeVisible()
    const path = canvas.getByRole("textbox", { name: "Path" })
    await userEvent.type(path, "src/deploy.ts")
    const frame = canvas.getByTitle("Browser") as HTMLIFrameElement
    await waitFor(() =>
      expect(frame.contentDocument?.body.textContent).toBe("Hello")
    )
    frame.contentDocument!.body.dataset.kept = "yes"
    path.focus()
    phone.set(true)
    const sheet = await body.findByRole("dialog", { name: "Files" })
    // Once it has slid in.
    await waitFor(() => expect(sheet).toBeVisible())
    // Where the browser moves elements keeping their focus, it is still
    // where the reader was, not on the sheet's first.
    if ("moveBefore" in Element.prototype) await expect(path).toHaveFocus()
    // Under the sheet, hidden from screen readers, the same.
    await expect(
      canvas.getByRole("textbox", { name: "Draft", hidden: true })
    ).toBe(draft)
    phone.set(false)
    await waitFor(() =>
      expect(canvas.getByRole("complementary", { name: "Files" })).toBeVisible()
    )
    await expect(canvas.getByRole("textbox", { name: "Draft" })).toBe(draft)
    await expect(draft).toHaveValue("half a thought")
    await expect(mounts).toBe(1)
    await expect(canvas.getByRole("textbox", { name: "Path" })).toBe(path)
    await expect(path).toHaveValue("src/deploy.ts")
    await expect(canvas.getByTitle("Browser")).toBe(frame)
    await expect(panelMounts).toBe(1)
    // Where the browser moves elements keeping their state, the frame's
    // page is the same; elsewhere it loads again.
    if ("moveBefore" in Element.prototype)
      await expect(frame.contentDocument?.body.dataset.kept).toBe("yes")

    // There and back fast: a sheet, beside it, a sheet again before the
    // sheet has slid out; its content in the sheet, as it was.
    phone.set(true)
    await waitFor(async () =>
      expect(await body.findByRole("dialog", { name: "Files" })).toBeVisible()
    )
    phone.set(false)
    await waitFor(() =>
      expect(
        canvas.getByRole("complementary", { name: "Files", hidden: true })
      ).toBeInTheDocument()
    )
    phone.set(true)
    const again = await body.findByRole("dialog", { name: "Files" })
    await waitFor(() =>
      expect(within(again).getByRole("textbox", { name: "Path" })).toBe(path)
    )
    await waitFor(() => expect(path).toBeVisible())
    await expect(path).toHaveValue("src/deploy.ts")
    await expect(within(again).getByTitle("Browser")).toBe(frame)
    await expect(panelMounts).toBe(1)
  },
}

function DialogInPanel() {
  const [open, setOpen] = React.useState(false)
  return (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppPanels
        title="Files"
        open={open}
        onOpenChange={setOpen}
        panel={
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>
              Rename
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename the file</DialogTitle>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button />}>Done</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <AgentAppHeader
          title="A conversation"
          actions={<AgentAppPanelTrigger />}
        />
      </AgentAppPanels>
    </AgentApp>
  )
}

/**
 * A dialog opened from the panel, open as the window narrows to a
 * phone's: it stays on top and in reach; the panel's drawer waits for it
 * to close, then opens.
 */
export const DialogFromThePanelCrossesPhoneWidth: Story = {
  args: { sidebar: null },
  beforeEach: CrossesPhoneWidth.beforeEach,
  render: () => <DialogInPanel />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Files" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Rename" }))
    const dialog = await body.findByRole("dialog", {
      name: "Rename the file",
    })
    phone.set(true)
    await waitFor(() =>
      expect(document.querySelector("[data-sidebar=sidebar]")).toBeNull()
    )
    // Not under a drawer: in reach, read out, on top.
    await expect(dialog.closest("[aria-hidden=true], [inert]")).toBeNull()
    await expect(dialog.closest("[data-base-ui-inert]")).toBeNull()
    await expect(body.queryByRole("dialog", { name: "Files" })).toBeNull()
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }))
    // Closed, the panel's drawer opens.
    await waitFor(async () =>
      expect(await body.findByRole("dialog", { name: "Files" })).toBeVisible()
    )
  },
}

function PanesInPanel() {
  const [open, setOpen] = React.useState(true)
  const browser = useBrowser({
    defaultValue: {
      tabs: [
        { id: "files", pages: [filesPage], index: 0, pane: "left" },
        { id: "changes", pages: [changesPage], index: 0, pane: "right" },
      ],
      active: "files",
      panes: [
        { id: "left", active: "files" },
        { id: "right", active: "changes" },
      ],
    },
  })
  return (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppPanels
        title="Browser"
        open={open}
        onOpenChange={setOpen}
        bar={false}
        defaultSize="60"
        panel={
          <Browser
            browser={browser}
            actions={<AgentAppPanelClose />}
            // As narrow as a phone's sheet, at the test's width.
            className="max-w-sm"
          />
        }
      >
        <AgentAppHeader
          title="A conversation"
          actions={<AgentAppPanelTrigger />}
        />
      </AgentAppPanels>
    </AgentApp>
  )
}

/**
 * A browser's panes in the panel, one at a time in a phone's sheet:
 * wider and back fast, the pane the reader went to is still the one shown.
 */
export const PanesCrossPhoneWidth: Story = {
  args: { sidebar: null },
  beforeEach: CrossesPhoneWidth.beforeEach,
  render: () => <PanesInPanel />,
  play: async () => {
    phone.set(true)
    const sheet = await body.findByRole("dialog", { name: "Browser" })
    await waitFor(() => expect(sheet).toBeVisible())
    const inSheet = within(sheet)
    // Clicked where they are: by default a click is at 0,0, which Base
    // UI's menu takes for one outside it, its trigger at the page's top.
    const clickOn = async (element: HTMLElement) => {
      const at = element.getBoundingClientRect()
      await userEvent.pointer({
        keys: "[MouseLeft]",
        target: element,
        coords: {
          clientX: at.x + at.width / 2,
          clientY: at.y + at.height / 2,
        },
      })
    }
    await clickOn(await inSheet.findByRole("button", { name: "Pane 1/2" }))
    await clickOn(await body.findByRole("menuitemradio", { name: "2 Changes" }))
    await waitFor(() =>
      expect(inSheet.getByRole("button", { name: "Pane 2/2" })).toBeVisible()
    )
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())

    phone.set(false)
    await waitFor(() =>
      expect(
        body.getByRole("complementary", { name: "Browser", hidden: true })
      ).toBeInTheDocument()
    )
    phone.set(true)
    const sheetAgain = await body.findByRole("dialog", { name: "Browser" })
    const again = within(sheetAgain)
    await waitFor(() =>
      expect(again.getByRole("button", { name: /^Pane \d\/2$/ })).toBeVisible()
    )
    // Once it has settled.
    await quiet(sheetAgain)
    await expect(
      again.getByRole("button", { name: /^Pane \d\/2$/ })
    ).toHaveAccessibleName("Pane 2/2")
    // The focus in the sheet, not on a pane that is hidden.
    const sheetNow = body.getByRole("dialog", { name: "Browser" })
    await expect(sheetNow.contains(document.activeElement)).toBe(true)
    await expect(
      document.activeElement?.closest("[data-stacked=hidden]") ?? null
    ).toBeNull()
  },
}

/** Its words are the app's, in the reader's language. */
export const Labels: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[]}
          labels={{ resize: "Largeur de la barre" }}
        />
      }
    >
      <AgentAppPanels
        title="Fichiers"
        open
        onOpenChange={() => {}}
        panel={null}
        labels={{ close: "Fermer", resize: "Largeur des fichiers" }}
      >
        <AgentAppHeader
          title="Une conversation"
          labels={{
            toggleSidebar: "Afficher la barre",
            breadcrumb: "Fil d’Ariane",
          }}
        />
      </AgentAppPanels>
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Afficher la barre" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("separator", { name: "Largeur de la barre" })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("separator", { name: "Largeur des fichiers" })
    ).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Fermer" })).toBeVisible()
    // Its path's landmark named in the app's words; no English left in
    // the sidebar's button.
    await expect(
      canvas.getByRole("navigation", { name: "Fil d’Ariane" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Afficher la barre" })
    ).not.toHaveTextContent("Toggle Sidebar")
  },
}

/** A header with nothing to say where it is: no empty landmark. */
export const NoPath: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp sidebar={null}>
      <AgentAppHeader />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    await expect(
      within(canvas.getByRole("banner")).queryByRole("navigation")
    ).toBeNull()
  },
}

/** A project's and a conversation's menus are the app's. */
export const Menus: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    // None in a project that cannot be used.
    await expect(
      sidebar().queryByRole("button", { name: "New conversation in legacy" })
    ).toBeNull()
    const more = sidebar().getByRole("button", {
      name: "More for Clamp styles",
    })
    await userEvent.click(more)
    const menu = await body.findByRole("menu")
    // Its button stays, as shadcn's do while their menu is open; the menu
    // opens beside the sidebar.
    await expect(more).toHaveAttribute("aria-expanded", "true")
    await waitFor(() => expect(getComputedStyle(more).opacity).toBe("1"))
    // Once it has grown in.
    await waitFor(() =>
      expect(menu.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        more.getBoundingClientRect().right
      )
    )
    await userEvent.click(await body.findByRole("menuitem", { name: "Delete" }))
    await waitFor(() =>
      expect(sidebar().queryByRole("link", { name: "Clamp styles" })).toBeNull()
    )
    await userEvent.click(
      sidebar().getByRole("button", { name: "More for vesper" })
    )
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Open project" })
    )
    await expect(
      await canvas.findByRole("heading", { name: "vesper" })
    ).toBeVisible()
  },
}

/**
 * A right click's event, as the browser fires it. Not user-event's right
 * button: in Vitest's WebKit it closes the page.
 */
const rightClick = (target: Element) =>
  target.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: target.getBoundingClientRect().left + 8,
      clientY: target.getBoundingClientRect().top + 8,
    })
  )

/**
 * A row's context menu (a right click; Shift+F10 or the menu key, which
 * fire the same event) opens its menu, where its button opens it.
 */
export const MenusOnRightClick: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async () => {
    const row = sidebar().getByRole("link", { name: "Clamp styles" })
    const more = sidebar().getByRole("button", {
      name: "More for Clamp styles",
    })
    rightClick(row)
    const menu = await body.findByRole("menu")
    await expect(more).toHaveAttribute("aria-expanded", "true")
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Delete" })
      ).toBeVisible()
    )
    // Where its button opens it: beside the sidebar.
    await waitFor(() =>
      expect(menu.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        more.getBoundingClientRect().right
      )
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())

    // A project's too.
    const project = sidebar().getByRole("button", { name: /^vesper/ })
    rightClick(project)
    const open = await body.findByRole("menuitem", { name: "Open project" })
    await waitFor(() => expect(open).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
  },
}

/**
 * The panel as a browser: its tabs are its bar, level with the header,
 * with the panel's close button at its end; a file opened from its files
 * goes in their tab.
 */
export const BrowserPanel: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    const header = within(canvas.getByRole("banner"))
    await userEvent.click(header.getByRole("button", { name: "Browser" }))
    const panel = canvas.getByRole("complementary", { name: "Browser" })
    // No bar of the panel's own: the browser's is.
    await expect(within(panel).queryByRole("heading")).toBeNull()
    const bar = panel
      .querySelector("[data-slot=browser-bar]")!
      .getBoundingClientRect()
    const head = canvas.getByRole("banner").getBoundingClientRect()
    await expect(bar.top).toBe(head.top)
    await expect(bar.height).toBe(head.height)

    const tabs = within(within(panel).getByRole("tablist"))
    await expect(tabs.getAllByRole("tab")).toHaveLength(3)
    await userEvent.dblClick(
      await within(panel).findByRole("treeitem", { name: /^vite\.config\.ts/ })
    )
    await expect(
      tabs.getByRole("tab", { selected: true })
    ).toHaveAccessibleName("vite.config.ts")
    // A file's page: named by its tab, not again by its viewer.
    await expect(
      await within(panel).findByRole("button", { name: "Back" })
    ).toBeInTheDocument()
    await expect(
      within(panel).queryByRole("navigation", { name: /^Path/ })
    ).toBeNull()

    // A file dragged from its list into the composer is mentioned there.
    await userEvent.click(within(panel).getByRole("button", { name: "Back" }))
    const data = new DataTransfer()
    const file = await within(panel).findByRole("treeitem", {
      name: /^vite\.config\.ts/,
    })
    await expect(file).toHaveAttribute("draggable", "true")
    file.dispatchEvent(
      new DragEvent("dragstart", { bubbles: true, dataTransfer: data })
    )
    await expect(data.getData("text/plain")).toBe("vite.config.ts")
    const message = canvas.getByRole("textbox", { name: "Message" })
    message.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      })
    )
    await waitFor(() => expect(message).toHaveTextContent("@vite.config.ts"))

    // A web page's toolbar on the tabs' lines.
    await userEvent.click(tabs.getByRole("tab", { name: /Browser/ }))
    await waitFor(() =>
      expect(panel.querySelector("[data-slot=browser-address]")).not.toBeNull()
    )
    await onPanelLines(panel, panel.querySelector("[data-slot=browser-bar]")!)

    // Expanded over the main area, which stays as it was, and back.
    const width = panel.getBoundingClientRect().width
    await userEvent.click(within(panel).getByRole("button", { name: "Expand" }))
    await expect(message).not.toBeVisible()
    await waitFor(() =>
      expect(panel.getBoundingClientRect().width).toBeGreaterThan(width)
    )
    await userEvent.click(
      within(panel).getByRole("button", { name: "Collapse" })
    )
    await expect(message).toBeVisible()
    await expect(message).toHaveTextContent("@vite.config.ts")
    await waitFor(() =>
      expect(
        Math.abs(panel.getBoundingClientRect().width - width)
      ).toBeLessThanOrEqual(1)
    )
    // No line under the header, nor the panel's tabs: one card, split.
    await expect(
      getComputedStyle(canvas.getByRole("banner")).borderBottomWidth
    ).toBe("0px")
    await expect(
      getComputedStyle(panel.querySelector("[data-slot=browser-bar]")!)
        .borderBottomWidth
    ).toBe("0px")

    await userEvent.click(within(panel).getByRole("button", { name: "Close" }))
    await waitFor(() =>
      expect(
        canvas.queryByRole("complementary", { name: "Browser" })
      ).toBeNull()
    )
    await expect(
      header.getByRole("button", { name: "Browser" })
    ).toHaveAttribute("aria-expanded", "false")
  },
}

/**
 * On a phone the sidebar is a sheet, opened from the header and closed
 * once a conversation is picked.
 */
export const Phone: Story = {
  args: { sidebar: null },
  beforeEach: () => {
    const matchMedia = window.matchMedia
    // As at a phone's width: the sidebar's own breakpoint matches.
    window.matchMedia = (query) => {
      const list = matchMedia.call(window, query)
      return /max-width: 639px/.test(query)
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
          } satisfies MediaQueryList)
        : list
    }
    return () => {
      window.matchMedia = matchMedia
    }
  },
  render: () => <App />,
  play: async ({ canvas }) => {
    await expect(document.querySelector("[data-sidebar=sidebar]")).toBeNull()
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    const sheet = within(await body.findByRole("dialog"))
    // A row's menu opens below it, in the sheet's width.
    const more = sheet.getByRole("button", {
      name: "More for A quick question",
    })
    await userEvent.click(more)
    const menu = await body.findByRole("menu")
    // Once it has grown in.
    await waitFor(() =>
      expect(menu.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        more.getBoundingClientRect().bottom
      )
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await userEvent.click(
      sheet.getByRole("link", { name: "A quick question Unread" })
    )
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await expect(
      within(canvas.getByRole("banner")).getByText("A quick question")
    ).toBeVisible()

    // The panel is a sheet: the browser in it, closed by one button, at
    // the end of its tabs.
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Browser",
      })
    )
    const browser = within(await body.findByRole("dialog", { name: "Browser" }))
    await waitFor(() =>
      expect(
        browser.getByRole("treeitem", { name: /^vite\.config\.ts/ })
      ).toBeVisible()
    )
    await expect(
      browser.getAllByRole("button", { name: "Close" })
    ).toHaveLength(1)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/** A phone's width, in the story tests too (Storybook sets it in Vitest). */
const phoneWidth = {
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
} satisfies Partial<Story>

/**
 * At a phone's width a row's buttons always show: its name and status
 * mark keep clear of both, and each takes a finger's touch.
 */
export const PhoneSidebar: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    const dialog = await body.findByRole("dialog")
    // Named as its navigation, with no description and no close button
    // of shadcn's words.
    await expect(dialog).toHaveAccessibleName("Projects and conversations")
    await expect(dialog).not.toHaveAttribute("aria-describedby")
    await expect(
      within(dialog).queryByRole("button", { name: "Close" })
    ).toBeNull()
    const sheet = within(dialog)
    for (const name of ["vesper", "api web"]) {
      const row = sheet.getByRole("button", { name: new RegExp(`^${name}`) })
      // Folded, its status mark shows.
      await userEvent.click(row)
      await expect(row).toHaveAttribute("aria-expanded", "false")
      const pencil = sheet.getByRole("button", {
        name: `New conversation in ${name}`,
      })
      // Once the sheet has slid in.
      await waitFor(() =>
        expect(
          row.querySelector("[data-slot=status-mark]")!.getBoundingClientRect()
            .right
        ).toBeLessThanOrEqual(pencil.getBoundingClientRect().left)
      )
    }
    // A finger's size on a touch screen; with a mouse, at a phone's width
    // too, its 20px box.
    const pencil = sheet.getByRole("button", {
      name: "New conversation in vesper",
    })
    await expect(coarseHitSize(pencil).height).toBeGreaterThanOrEqual(44)
    const box = pencil.getBoundingClientRect()
    await expect(
      document.elementFromPoint(box.left + box.width / 2, box.top - 6)
    ).not.toBe(pencil)
  },
}

/**
 * Opened from the keyboard, the sheet takes focus itself, not its first
 * button, whose tooltip would show unasked and take the first Escape:
 * one Escape closes it, each time it opens.
 */
export const PhoneSidebarEscape: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    const toggle = within(canvas.getByRole("banner")).getByRole("button", {
      name: "Toggle Sidebar",
    })
    for (let time = 0; time < 2; time++) {
      toggle.focus()
      await userEvent.keyboard("{Enter}")
      const dialog = await body.findByRole("dialog")
      await waitFor(() => expect(dialog).toHaveFocus())
      await expect(
        document.querySelector("[data-slot=tooltip-content]")
      ).toBeNull()
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    }
  },
}

/**
 * On a phone the panel is a sheet with the bar it has beside: as tall as
 * the header, its title as small, a rule under it, its close button.
 */
export const PhonePanel: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvas }) => {
    const header = canvas.getByRole("banner")
    await userEvent.click(within(header).getByRole("button", { name: "Files" }))
    const sheet = await body.findByRole("dialog", { name: "Files" })
    // Once it has slid in.
    await waitFor(() => expect(sheet).toBeVisible())
    const title = within(sheet).getByRole("heading", { name: "Files" })
    const bar = title.parentElement!
    // From the bottom, nearly the screen's height, its handle at its top
    // and its bar right under it, as tall as beside, unlined.
    await expect(
      Math.round(sheet.getBoundingClientRect().bottom)
    ).toBeGreaterThanOrEqual(window.innerHeight - 1)
    // Once it has slid up.
    await waitFor(() =>
      expect(sheet.getBoundingClientRect().top).toBeLessThan(
        window.innerHeight / 4
      )
    )
    await quiet(sheet)
    await expect(Math.round(bar.getBoundingClientRect().height)).toBe(48)
    // Under its handle.
    await expect(
      bar.getBoundingClientRect().top - sheet.getBoundingClientRect().top
    ).toBeLessThanOrEqual(24)
    await expect(getComputedStyle(title).fontSize).toBe("14px")
    await expect(getComputedStyle(bar).borderBottomWidth).toBe("0px")
    // Its close button a finger's size.
    await expect(
      within(bar).getByRole("button", { name: "Close" }).getBoundingClientRect()
        .height
    ).toBe(40)
    // Its content right under it.
    await expect(
      within(sheet).getByText("vite.config.ts").getBoundingClientRect().top -
        bar.getBoundingClientRect().bottom
    ).toBeLessThan(16)
    const close = within(sheet).getAllByRole("button", { name: "Close" })
    await expect(close).toHaveLength(1)
    await expect(bar).toContainElement(close[0]!)
    await userEvent.click(close[0]!)
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/**
 * On a phone the header is the sidebar's button, the conversation's
 * title in the middle with its project under it, and the app's actions,
 * each a finger's size; the sidebar's sheet ends with the app's areas.
 */
export const PhoneHeaderAndAreas: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    const header = canvas.getByRole("banner")
    const heading = within(header).getByRole("heading", { level: 1 })
    await expect(heading).toHaveTextContent("Fix the slow deploy")
    await expect(getComputedStyle(heading).fontSize).toBe("15px")
    await expect(within(header).getByText("agent-ui")).toBeVisible()
    // Under a finger.
    for (const button of within(header).getAllByRole("button")) {
      const { width, height } = coarseHitSize(button)
      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(40)
    }

    await userEvent.click(
      within(header).getByRole("button", { name: "Toggle Sidebar" })
    )
    const sheet = within(await body.findByRole("dialog"))
    const areas = sheet.getByRole("navigation", { name: "Areas" })
    const chat = within(areas).getByRole("link", { name: "Chat" })
    await expect(chat).toHaveAttribute("aria-current", "page")
    for (const link of within(areas).getAllByRole("link"))
      await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        44
      )
    // At the bottom of the sheet.
    const sheetBox = body.getByRole("dialog").getBoundingClientRect()
    await expect(
      sheetBox.bottom - areas.getBoundingClientRect().bottom
    ).toBeLessThan(16)
    // Going to one closes the sheet.
    await userEvent.click(within(areas).getByRole("link", { name: "Projects" }))
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/**
 * On a phone, the browser's tabs are the sheet's bar, as they are the
 * panel's beside, with its close button at their end.
 */
export const PhoneBrowserPanel: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Browser",
      })
    )
    const sheet = await body.findByRole("dialog", { name: "Browser" })
    await waitFor(() => expect(sheet).toBeVisible())
    const bar = sheet.querySelector("[data-slot=browser-bar]")!
    // Under its handle.
    await expect(
      bar.getBoundingClientRect().top - sheet.getBoundingClientRect().top
    ).toBeLessThanOrEqual(24)
    // Nearly the screen's height; expanded, all of it, and back.
    await waitFor(() =>
      expect(Math.round(sheet.getBoundingClientRect().height)).toBe(
        window.innerHeight - 48
      )
    )
    await userEvent.click(within(sheet).getByRole("button", { name: "Expand" }))
    await expect(sheet).toHaveAttribute("data-expanded")
    await waitFor(() => {
      const box = sheet.getBoundingClientRect()
      expect([box.top, box.height].map(Math.round)).toEqual([
        0,
        window.innerHeight,
      ])
    })
    await expect(getComputedStyle(sheet).borderTopLeftRadius).toBe("0px")
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Collapse" })
    )
    await expect(sheet).not.toHaveAttribute("data-expanded")
    await waitFor(() =>
      expect(Math.round(sheet.getBoundingClientRect().height)).toBe(
        window.innerHeight - 48
      )
    )
    const close = within(sheet).getAllByRole("button", { name: "Close" })
    await expect(close).toHaveLength(1)
    await expect(bar).toContainElement(close[0]!)
    await userEvent.click(close[0]!)
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/** A viewport the story's tests run at too (Storybook sets it in Vitest). */
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

const middle = (element: Element) => {
  const box = element.getBoundingClientRect()
  return box.top + box.height / 2
}

/**
 * The header's sidebar button, the rail's first item and the sidebar's
 * top bar, where they show, share one centre line.
 */
async function expectLevel() {
  const line = middle(document.querySelector("[data-slot=agent-app-header]")!)
  const items = document.querySelectorAll<HTMLElement>(
    "[data-slot=agent-app-rail] :is([data-slot=agent-app-rail-button], [data-slot=agent-app-rail-item])"
  )
  const first = items[0]
  if (first?.checkVisibility())
    await expect(Math.abs(middle(first) - line)).toBeLessThanOrEqual(0.5)
  const bar = document.querySelector(
    "[data-slot=sidebar-container] [data-slot=agent-app-sidebar-bar]"
  )
  if (bar) await expect(Math.abs(middle(bar) - line)).toBeLessThanOrEqual(0.5)
  // The rail's last item level with the sidebar's footer's row.
  const last = items[items.length - 1]
  const foot = document.querySelector(
    "[data-slot=sidebar-container] [data-slot=sidebar-footer] [data-slot=sidebar-menu-button]"
  )
  if (last && foot)
    await expect(Math.abs(middle(last) - middle(foot))).toBeLessThanOrEqual(0.5)
  return line
}

/** Where the main area has no room beside it, the panel's sheet. */
async function expectPanelSheet(name: string) {
  const sheet = await body.findByRole("dialog", { name })
  await waitFor(() => expect(sheet).toBeVisible())
  // From the end: a card 448px wide, 8px in from the window's edges, on
  // a flat scrim.
  await expect(sheet).toHaveAttribute("data-side", "right")
  await waitFor(() =>
    expect(
      Math.abs(sheet.getBoundingClientRect().right - (window.innerWidth - 8))
    ).toBeLessThanOrEqual(1)
  )
  await expect(Math.round(sheet.getBoundingClientRect().width)).toBe(448)
  await expect(Math.round(sheet.getBoundingClientRect().top)).toBe(8)
  await expect(Math.round(sheet.getBoundingClientRect().height)).toBe(
    window.innerHeight - 16
  )
  await expect(getComputedStyle(sheet).borderTopLeftRadius).toBe("14px")
  const scrim = document.querySelector("[data-slot=sheet-overlay]")!
  await expect(getComputedStyle(scrim).backdropFilter).toBe("none")
  // Its focus in it, as a dialog's.
  await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true))
  return sheet
}

/**
 * The sidebar collapsed by its button, the rail beside it: its rows are
 * not focused or read, nor seen, though the sidebar's box, wider than it
 * slides, keeps a part in the window under the rail; its edge still
 * opens it again.
 */
export const SidebarCollapsedAway: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    const navigation = canvas.getByRole("navigation", {
      name: "Projects and conversations",
    })
    const newConversation = within(navigation).getByRole("button", {
      name: "New conversation",
    })
    await expect(navigation).not.toHaveAttribute("inert")
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    await waitFor(() =>
      expect(document.querySelector("[data-slot=sidebar]")).toHaveAttribute(
        "data-state",
        "collapsed"
      )
    )
    await expect(navigation).toHaveAttribute("inert")
    await waitFor(() =>
      expect(getComputedStyle(navigation).visibility).toBe("hidden")
    )
    newConversation.focus()
    await expect(newConversation).not.toHaveFocus()
    // Its edge, at the window's, opens it again.
    await userEvent.click(
      canvas.getByRole("separator", { name: "Sidebar width" })
    )
    await waitFor(() =>
      expect(document.querySelector("[data-slot=sidebar]")).toHaveAttribute(
        "data-state",
        "expanded"
      )
    )
    await expect(navigation).not.toHaveAttribute("inert")
    await waitFor(() =>
      expect(getComputedStyle(navigation).visibility).toBe("visible")
    )
  },
}

/** The sidebar folded to the rail; opened, a sheet over the page. */
async function expectFolded(canvas: ReturnType<typeof within>) {
  await expect(
    document.querySelector("[data-slot=sidebar-container]")
  ).toBeNull()
  const rail = document.querySelector<HTMLElement>(
    "[data-slot=agent-app-rail]"
  )!
  await expect(canvas.getByRole("navigation", { name: "Areas" })).toBeVisible()
  // Its button is the rail's, first; none in the header.
  await expect(
    within(canvas.getByRole("banner")).queryByRole("button", {
      name: "Toggle Sidebar",
    })
  ).toBeNull()
  await userEvent.click(
    within(rail).getByRole("button", { name: "Toggle Sidebar" })
  )
  const sheet = await body.findByRole("dialog")
  await waitFor(() => expect(sheet).toBeVisible())
  await expect(sheet).toHaveAttribute("data-side", "left")
  // Past the rail, in sight beside it.
  await waitFor(() =>
    expect(sheet.getBoundingClientRect().left).toBe(
      rail.getBoundingClientRect().right
    )
  )
  await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true))
  // Escape closes the tooltip of the button the focus is on first, if it
  // shows one, then the sheet.
  await waitFor(async () => {
    await userEvent.keyboard("{Escape}")
    await expect(body.queryByRole("dialog")).toBeNull()
  })
}

/**
 * A foldable phone folded, about 344×882: a phone's layout, the panel a
 * sheet from the bottom.
 */
export const Folded: Story = {
  ...viewport("folded", 344, 882),
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("banner")).toHaveAttribute("data-mobile")
    await expect(canvas.queryByRole("navigation", { name: "Areas" })).toBeNull()
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", { name: "Files" })
    )
    const sheet = await body.findByRole("dialog", { name: "Files" })
    await waitFor(() => expect(sheet).toBeVisible())
    await expect(sheet).toHaveAttribute("data-slot", "agent-app-panel-drawer")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/**
 * Unfolded, about 690×880: not a phone's layout but a tablet's. The
 * sidebar is folded to the rail, the conversation the rest of the
 * width, its column centred; the panel a sheet from the end, as the
 * conversation would have no room beside it.
 */
export const Unfolded: Story = {
  ...viewport("unfolded", 690, 880),
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvas }) => {
    const header = canvas.getByRole("banner")
    await expect(header).not.toHaveAttribute("data-mobile")
    await expectLevel()
    await expectFolded(canvas)
    const main = canvas.getByRole("main")
    await expect(main.getBoundingClientRect().width).toBe(690 - 48 - 8)

    await userEvent.click(within(header).getByRole("button", { name: "Files" }))
    await expectPanelSheet("Files")
    // The conversation as it was, under it.
    await expect(main.getBoundingClientRect().width).toBe(690 - 48 - 8)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/**
 * The areas in the sidebar (`railPlacement="sidebar"`): no column at the
 * window's edge; the areas a bar at the sidebar's foot, as on a phone;
 * the sidebar's button the header's.
 */
export const RailInSidebar: Story = {
  args: { sidebar: null },
  render: () => <App browser={false} railPlacement="sidebar" />,
  play: async ({ canvas }) => {
    await expect(
      document.querySelector("[data-slot=agent-app-rail]")
    ).toBeNull()
    const areas = canvas.getByRole("navigation", { name: "Areas" })
    await expect(areas).toHaveAttribute("data-slot", "agent-app-rail-menu")
    await expect(areas).toBeVisible()
    // Room for each name.
    await expect(areas).not.toHaveAttribute("data-compact")
    await expect(within(areas).getByText("Settings")).toBeVisible()
    await expect(
      within(areas).getByText("Chat").closest("[data-slot=agent-app-rail-item]")
    ).toHaveAttribute("aria-current", "page")
    await expect(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    ).toBeVisible()
  },
}

/**
 * The areas in a sidebar at its narrowest (208px): with no room for a
 * name, all are icons only, named for screen readers.
 */
export const RailInSidebarNarrow: Story = {
  tags: ["!autodocs"],
  args: { sidebar: null },
  render: () => (
    <App browser={false} railPlacement="sidebar" sidebarWidth={208} />
  ),
  play: async ({ canvas }) => {
    const areas = canvas.getByRole("navigation", { name: "Areas" })
    await waitFor(() => expect(areas).toHaveAttribute("data-compact"))
    // And stays so: measured icons only, it does not go back.
    let changes = 0
    const watch = new MutationObserver(() => changes++)
    watch.observe(areas, { attributeFilter: ["data-compact"] })
    await quiet(areas)
    watch.disconnect()
    await expect(changes).toBe(0)
    const name = within(areas).getByText("Settings")
    await expect(name.getBoundingClientRect().width).toBeLessThanOrEqual(1)
    await expect(
      name.closest("[data-slot=agent-app-rail-item]")
    ).toHaveAccessibleName("Settings")
  },
}

/**
 * Unfolded, 690px, the areas in the sidebar: no column; the conversation
 * a card the window's width, less 8px each side; the header's button
 * opens the sidebar as a sheet from the edge, its areas at its foot.
 */
export const UnfoldedRailInSidebar: Story = {
  ...viewport("unfolded", 690, 880),
  args: { sidebar: null },
  render: () => <App browser={false} railPlacement="sidebar" />,
  play: async ({ canvas }) => {
    await expect(
      document.querySelector("[data-slot=agent-app-rail]")
    ).toBeNull()
    const main = canvas.getByRole("main")
    await waitFor(() => expect(main.getBoundingClientRect().left).toBe(8))
    await expect(main.getBoundingClientRect().width).toBe(690 - 16)
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    const sheet = await within(document.body).findByRole("dialog")
    await waitFor(() => expect(sheet.getBoundingClientRect().left).toBe(0))
    await expect(
      within(sheet).getByRole("navigation", { name: "Areas" })
    ).toBeVisible()
    await userEvent.keyboard("{Escape}")
  },
}

/**
 * Unfolded and turned, about 880×690, the panel open: a sheet over the
 * conversation, which keeps its width; the sidebar beside it, drawn at
 * its narrowest (208px) to leave the conversation its 600.
 */
export const UnfoldedLandscape: Story = {
  ...viewport("unfolded-landscape", 880, 690),
  args: { sidebar: null },
  render: () => <App browser={false} panel />,
  play: async ({ canvas }) => {
    const sheet = await expectPanelSheet("Files")
    await expect(
      within(sheet).getByRole("heading", { name: "Files" })
    ).toBeVisible()
    // The rail at the start edge, as always from 640px.
    await expect(
      document.querySelector("[data-slot=agent-app-rail]")
    ).toBeVisible()
    await expect(
      canvas.getByRole("main", { hidden: true }).getBoundingClientRect().width
    ).toBe(880 - 48 - 16 - 208)
    await waitFor(() =>
      expect(document.querySelector("[data-slot=agent-app-panel]")).toBeNull()
    )
  },
}

/**
 * A tablet upright, 768×1024, touched: as unfolded; the rail's items
 * and the header's buttons take a finger.
 */
export const Tablet: Story = {
  ...viewport("tablet", 768, 1024),
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvas }) => {
    await expectLevel()
    await expectFolded(canvas)
    const areas = canvas.getByRole("navigation", { name: "Areas" })
    const targets = [
      ...within(areas).getAllByRole("link"),
      ...within(canvas.getByRole("banner")).getAllByRole("button"),
    ]
    for (const target of targets) {
      const { width, height } = coarseHitSize(target)
      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
    }
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", { name: "Files" })
    )
    await expectPanelSheet("Files")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/**
 * A tablet upright: the panel a sheet, expanded over the whole window
 * and back to its card; the conversation under it stays as it was.
 */
export const TabletPanelExpand: Story = {
  ...viewport("tablet", 768, 1024),
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Browser",
      })
    )
    const sheet = await expectPanelSheet("Browser")
    await userEvent.click(within(sheet).getByRole("button", { name: "Expand" }))
    await expect(sheet).toHaveAttribute("data-expanded")
    await waitFor(() => {
      const box = sheet.getBoundingClientRect()
      expect(
        [box.left, box.top, box.width, box.height].map(Math.round)
      ).toEqual([0, 0, window.innerWidth, window.innerHeight])
    })
    await expect(getComputedStyle(sheet).borderTopLeftRadius).toBe("0px")
    // The main area is still there, under it, not hidden.
    await expect(
      document.querySelector("#agent-app-main-panel")
    ).not.toHaveClass("hidden")
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Collapse" })
    )
    await expect(sheet).not.toHaveAttribute("data-expanded")
    await waitFor(() =>
      expect(Math.round(sheet.getBoundingClientRect().width)).toBe(448)
    )
    // Closed and opened again: as it was, not expanded.
    await userEvent.click(within(sheet).getByRole("button", { name: "Expand" }))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Browser",
      })
    )
    const again = await expectPanelSheet("Browser")
    await expect(again).not.toHaveAttribute("data-expanded")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}

/**
 * A landscape touch screen, 1024×640, wide enough for the desktop's
 * layout: the panel beside the conversation, the sidebar folded to the
 * rail to leave the conversation its 600px. Sizes for a finger follow the
 * pointer, not the width.
 */
export const TouchLandscape: Story = {
  ...viewport("touch-landscape", 1024, 640),
  args: { sidebar: null },
  render: () => <App browser={false} panel />,
  play: async ({ canvas }) => {
    const panel = await canvas.findByRole("complementary", { name: "Files" })
    await expect(panel).toBeVisible()
    await expect(
      document.querySelector("[data-slot=sidebar-container]")
    ).toBeNull()
    const conversation = document.querySelector("#agent-app-main-panel")!
    await expect(
      conversation.getBoundingClientRect().width
    ).toBeGreaterThanOrEqual(600)
    const line = await expectLevel()
    // The panel's bar level with the header.
    await expect(
      Math.abs(middle(panel.firstElementChild!) - line)
    ).toBeLessThanOrEqual(0.5)

    // Closed, the sidebar has room again, where the reader left it.
    await userEvent.click(within(panel).getByRole("button", { name: "Close" }))
    await waitFor(() =>
      expect(
        document.querySelector("[data-slot=sidebar-container]")
      ).not.toBeNull()
    )
    await expectLevel()
    await panelsStill()
  },
}

/**
 * A tablet on its side, 1024×768: the sidebar beside the conversation
 * until a panel opens, then folded for it.
 */
export const TabletLandscape: Story = {
  ...viewport("tablet-landscape", 1024, 768),
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async ({ canvas }) => {
    await expect(
      document.querySelector("[data-slot=sidebar-container]")
    ).not.toBeNull()
    // Its rows level with the header, as on a desktop.
    await expect(await expectLevel()).toBe(32)
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", { name: "Files" })
    )
    await expect(
      await canvas.findByRole("complementary", { name: "Files" })
    ).toBeVisible()
    await waitFor(() =>
      expect(document.querySelector("[data-slot=sidebar-container]")).toBeNull()
    )
    // Folded, the rail and the header level again, the main area a card past the rail.
    await expect(await expectLevel()).toBe(32)
  },
}

/**
 * On a desktop the rail's first item, the sidebar's top bar and the
 * header share one centre line, 32px down (34px on a touch screen).
 */
export const Level: Story = {
  args: { sidebar: null },
  render: () => <App browser={false} />,
  play: async () => {
    await expect(
      document.querySelector("[data-slot=sidebar-container]")
    ).not.toBeNull()
    await expect(await expectLevel()).toBe(32)
  },
}

/**
 * A foldable open as a book (two screens side by side): the
 * conversation on the first, the panel on the second, around the
 * hinge. Where the browser does not say where its screens are, at the
 * middle.
 */
export const Book: Story = {
  ...viewport("book", 880, 690),
  args: { sidebar: null },
  beforeEach: () => {
    const matchMedia = window.matchMedia
    window.matchMedia = (query) =>
      query.includes("horizontal-viewport-segments: 2")
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
          } satisfies MediaQueryList)
        : matchMedia.call(window, query)
    return () => {
      window.matchMedia = matchMedia
    }
  },
  render: () => <App browser={false} panel />,
  play: async ({ canvas }) => {
    const panel = await canvas.findByRole("complementary", { name: "Files" })
    // A card on the second screen, from the middle, 8px in from its edges.
    await waitFor(() =>
      expect(Math.round(panel.getBoundingClientRect().left)).toBe(440 + 8)
    )
    await expect(Math.round(panel.getBoundingClientRect().right)).toBe(880 - 8)
    // Not to be dragged off its screen, nor expanded over the other.
    await expect(
      document.querySelector("[data-slot=resizable-handle]")
    ).toHaveAttribute("aria-disabled", "true")
  },
}

/**
 * A project's page: each conversation a row, its title a link over the
 * whole row, its status, the app's buttons and its menu at its end.
 */
const factRows: AppConversation[] = [
  {
    id: "deploy",
    title: "Fix the slow deploy",
    status: "running",
    meta: ["linux-box", "main", "$0.12", "2h"],
  },
  {
    id: "clamp",
    title: "Clamp styles",
    meta: ["desktop", "fix/clamp-styles", "$12.40", "1d"],
  },
  { id: "rate", title: "Rate limits", meta: ["linux-box", null, "$0.03"] },
]

function FactsPage({
  density,
  rows = factRows,
}: {
  density?: "default" | "compact"
  rows?: AppConversation[]
}) {
  return (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppProject
        project={projectList[0]!}
        conversations={rows}
        density={density}
        metaAlign={["start", "start", "end", "end"]}
        href={(target) =>
          "conversation" in target ? `#/c/${target.conversation}` : undefined
        }
        conversationMenu={() => <DropdownMenuItem>Rename</DropdownMenuItem>}
      />
    </AgentApp>
  )
}

/** Where each fact of a row starts, by column. */
const factColumns = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll("[data-slot=item]")).map((row) =>
    Array.from(row.querySelectorAll("[data-slot=item-meta]")).map((meta) => {
      const box = meta.getBoundingClientRect()
      return `${Math.round(box.left)}-${Math.round(box.right)}`
    })
  )

/**
 * A project's page whose rows have facts (`meta`: where, its branch, its
 * cost, when): each in a column, lined up across the rows, a row with
 * fewer leaving its column empty; its status and menu after them.
 */
export const ProjectPageFacts: Story = {
  args: { sidebar: null },
  render: () => <FactsPage />,
  play: async ({ canvas, canvasElement }) => {
    const columns = factColumns(canvasElement)
    await expect(columns[0]).toHaveLength(4)
    for (const row of columns) await expect(row).toEqual(columns[0])
    // The menus in a column of their own, after the facts.
    const menus = canvas
      .getAllByRole("button", { name: /^More for/ })
      .map((menu) => Math.round(menu.getBoundingClientRect().right))
    await expect(new Set(menus).size).toBe(1)
    await expect(menus[0]!).toBeGreaterThan(
      Number(columns[0]![3]!.split("-")[1])
    )
    // Words at their column's start, numbers at its end.
    await expect(getComputedStyle(canvas.getByText("main")).textAlign).toBe(
      "start"
    )
    await expect(getComputedStyle(canvas.getByText("$0.12")).textAlign).toBe(
      "end"
    )
    // Outlined rows by default.
    await expect(
      getComputedStyle(canvasElement.querySelector("[data-slot=item]")!)
        .borderTopColor
    ).not.toBe("rgba(0, 0, 0, 0)")
  },
}

/** `density="compact"`, for a long list: 32px rows, no outline. */
export const ProjectPageCompact: Story = {
  args: { sidebar: null },
  render: () => <FactsPage density="compact" />,
  play: async ({ canvasElement }) => {
    const rows = Array.from(canvasElement.querySelectorAll("[data-slot=item]"))
    for (const row of rows)
      await expect(row.getBoundingClientRect().height).toBe(32)
    await expect(
      Math.round(
        rows[1]!.getBoundingClientRect().top -
          rows[0]!.getBoundingClientRect().bottom
      )
    ).toBe(0)
    await expect(getComputedStyle(rows[0]!).borderTopColor).toBe(
      "rgba(0, 0, 0, 0)"
    )
    const columns = factColumns(canvasElement)
    for (const row of columns) await expect(row).toEqual(columns[0])
  },
}

/**
 * Compact with icons: the facts' line under the title is a phone's, so on
 * a desktop the icon is centred on the one-line title, not lifted to the
 * top as beside two lines, and the row is 32px.
 */
export const ProjectPageCompactIcons: Story = {
  args: { sidebar: null },
  render: () => (
    <FactsPage
      density="compact"
      rows={factRows.map((row) => ({
        ...row,
        icon: <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />,
      }))}
    />
  ),
  play: async ({ canvas }) => {
    const row = await iconBesideTitle(canvas)
    await expect(row.getBoundingClientRect().height).toBe(32)
  },
}

/** On a phone, with the facts' line: the icon beside the title, still. */
export const ProjectPageCompactIconsPhone: Story = {
  ...ProjectPageCompactIcons,
  ...windowOf("phone", 390, 844),
  play: async ({ canvas }) => {
    await canvas.findByText("linux-box · main · $0.12 · 2h")
    await iconBesideTitle(canvas)
  },
}

/** The first row's icon centred on its title's line; the row. */
async function iconBesideTitle(canvas: ReturnType<typeof within>) {
  const title: HTMLElement = canvas.getByRole("link", {
    name: "Fix the slow deploy",
  })
  const row = title.closest("[data-slot=item]") as HTMLElement
  const icon = row.querySelector("[data-slot=item-media]") as HTMLElement
  const middle = (box: DOMRect) => box.top + box.height / 2
  await expect(
    Math.abs(
      middle(icon.getBoundingClientRect()) -
        middle(title.getBoundingClientRect())
    )
  ).toBeLessThan(1)
  return row
}

/**
 * Compact on a phone: a row whose facts are a line under its title has
 * the sidebar's two-line rows' room, 8px over and under, not touching
 * the next.
 */
export const ProjectPageCompactPhone: Story = {
  ...windowOf("phone", 390, 844),
  args: { sidebar: null },
  render: () => <FactsPage density="compact" />,
  play: async ({ canvas }) => {
    const line = await canvas.findByText("linux-box · main · $0.12 · 2h")
    const row = line.closest<HTMLElement>("[data-slot=item]")!
    const content = line.closest<HTMLElement>("[data-slot=item-content]")!
    await expect(getComputedStyle(content).paddingTop).toBe("8px")
    await expect(getComputedStyle(content).paddingBottom).toBe("8px")
    const title = canvas.getByRole("link", { name: "Fix the slow deploy" })
    await expect(
      Math.round(
        title.getBoundingClientRect().top - row.getBoundingClientRect().top
      )
      // Past its 1px edge and its 8px.
    ).toBe(9)
  },
}

/** On a phone, a row's facts are a line under its title. */
export const ProjectPageFactsPhone: Story = {
  ...windowOf("phone", 390, 844),
  args: { sidebar: null },
  render: () => <FactsPage />,
  play: async ({ canvas }) => {
    const line = await canvas.findByText("linux-box · main · $0.12 · 2h")
    await expect(line).toBeVisible()
    await expect(canvas.getAllByText("$0.12")[0]).not.toBeVisible()
  },
}

export const ProjectRowActions: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppHeader project={projectList[0]!} />
      <AgentAppProject
        project={projectList[0]!}
        conversations={[
          {
            id: "deploy",
            title: "Fix the slow deploy",
            status: "running",
            description: "3 messages · 2 hours ago",
          },
          { id: "clamp", title: "Clamp styles", description: "1 message" },
        ]}
        href={(target) =>
          "conversation" in target ? `#/c/${target.conversation}` : undefined
        }
        onSelect={(target, event) => {
          event.preventDefault()
          selected(target)
        }}
        conversationActions={(conversation) => (
          <Button
            variant="ghost"
            size="icon-sm"
            className="touch-target relative"
            aria-label={`Pin ${conversation.title}`}
            onClick={() => pinned(conversation.id)}
          >
            <HugeiconsIcon icon={PinIcon} strokeWidth={2} />
          </Button>
        )}
        conversationMenu={() => (
          <>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </>
        )}
      >
        <AgentAppProjectSection
          title="Instructions"
          description="What the agent reads first in this project."
        >
          <p className="text-sm text-muted-foreground">
            AGENTS.md: run pnpm check before every commit.
          </p>
        </AgentAppProjectSection>
      </AgentAppProject>
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    selected.mockClear()
    pinned.mockClear()
    const main = within(canvas.getByRole("main"))
    const link = main.getByRole("link", { name: "Fix the slow deploy" })
    const row = link.closest<HTMLElement>("[data-slot=item]")!
    // Shadcn's row, the link over all of it.
    await expect(row).toHaveAttribute("data-size", "sm")
    const area = getComputedStyle(link, "::after")
    await expect(area.position).toBe("absolute")
    // The row's description is under the link's place.
    const description = within(row).getByText("3 messages · 2 hours ago")
    const box = description.getBoundingClientRect()
    await expect(
      document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    ).toBe(link)
    await userEvent.click(link)
    await expect(selected).toHaveBeenCalledWith({ conversation: "deploy" })
    // Its buttons are their own.
    selected.mockClear()
    await userEvent.click(
      main.getByRole("button", { name: "Pin Fix the slow deploy" })
    )
    await expect(pinned).toHaveBeenCalledWith("deploy")
    await expect(selected).not.toHaveBeenCalled()
    await userEvent.click(
      main.getByRole("button", { name: "More for Fix the slow deploy" })
    )
    const menu = await body.findByRole("menu")
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "Rename" })
      ).toBeVisible()
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await expect(selected).not.toHaveBeenCalled()
    // The section's line under its heading describes it.
    await expect(
      main.getByRole("region", { name: "Instructions" })
    ).toHaveAccessibleDescription("What the agent reads first in this project.")
  },
}

const pinned = fn()

/** Rows of a list with no address nor `onSelect` are not links. */
export const RowsWithoutLinks: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp sidebar={<AgentAppSidebar projects={[]} conversations={[]} />}>
      <AgentAppConversations
        conversations={[{ id: "deploy", title: "Fix the slow deploy" }]}
      />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    const main = within(canvas.getByRole("main"))
    await expect(main.getByText("Fix the slow deploy")).toBeVisible()
    await expect(main.queryByRole("link")).toBeNull()
    await expect(main.queryByRole("button")).toBeNull()
  },
}

/**
 * A conversation's `icon` (e.g. its agent) before its title, in the
 * project's folder's place, and its `detail` (e.g. where it runs) a
 * second line under it, cut short where long; its status, time and menu
 * beside the first line.
 */
export const RowDetails: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          layout="tree"
          projects={[
            {
              ...projectList[0]!,
              conversations: [
                {
                  id: "deploy",
                  title: "Fix the slow deploy",
                  icon: <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />,
                  detail: "linux-box · a1b2-c3d4-e5f",
                  status: "running",
                  time: "now",
                },
                {
                  id: "clamp",
                  title: "Clamp styles",
                  icon: <HugeiconsIcon icon={File01Icon} strokeWidth={2} />,
                  detail: (
                    <>
                      <HugeiconsIcon icon={Layers01Icon} strokeWidth={2} />{" "}
                      a-machine-with-a-long-name · a-worktree-with-a-long-name
                    </>
                  ),
                  time: "2h",
                },
                { id: "plain", title: "Older conversation", time: "3d" },
              ],
            },
          ]}
          conversations={[]}
          current={{ conversation: "clamp" }}
          href={(target) =>
            "conversation" in target ? `#/c/${target.conversation}` : "#/p"
          }
          conversationMenu={() => <DropdownMenuItem>Rename</DropdownMenuItem>}
        />
      }
    >
      <AgentAppConversations conversations={[]} />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    const row = (name: string) =>
      canvas.getByRole("link", { name: new RegExp(`^${name}`) })
    const box = (element: Element) => element.getBoundingClientRect()
    const middle = (element: Element) =>
      Math.round(box(element).top + box(element).height / 2)
    const deploy = row("Fix the slow deploy")
    await expect(box(deploy).height).toBeGreaterThan(
      box(row("Older conversation")).height
    )
    // Its icon, status and time at the middle of its first line.
    const title = within(deploy).getByText("Fix the slow deploy")
    for (const slot of [
      "conversation-icon",
      "status-mark",
      "conversation-time",
    ])
      await expect(middle(deploy.querySelector(`[data-slot=${slot}]`)!)).toBe(
        middle(title)
      )
    // Its icon in the project's folder's place, its title under the
    // project's name; with none, the title there too.
    const project = canvas.getByRole("button", { name: /^agent-ui/ })
    const folder = project.querySelector("svg")!
    const name = within(project).getByText("agent-ui")
    await expect(
      box(deploy.querySelector("[data-slot=conversation-icon]")!).left
    ).toBe(box(folder).left)
    await expect(box(title).left).toBe(box(name).left)
    await expect(
      box(within(row("Older conversation")).getByText("Older conversation"))
        .left
    ).toBe(box(name).left)
    // Cut short, not wrapped.
    const detail = row("Clamp styles").querySelector<HTMLElement>(
      "[data-slot=conversation-detail]"
    )!
    await expect(detail.scrollWidth).toBeGreaterThan(detail.clientWidth)
    await expect(box(detail).height).toBe(16)
    // An icon in it, 12px.
    await expect(box(detail.querySelector("svg")!).width).toBe(12)
  },
}

/**
 * Status marks in a column: each row's time is at least as wide as
 * "59m" or "59分", at its end, and a row with none keeps its place.
 */
export const StatusColumn: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[
            {
              id: "a",
              title: "Fix the slow deploy",
              status: "running",
              time: "now",
            },
            { id: "b", title: "Clamp styles", status: "running", time: "今" },
            { id: "c", title: "Rate limits", status: "waiting", time: "59分" },
            { id: "d", title: "Translate", status: "error", time: "1d" },
            { id: "e", title: "No time kept", status: "running" },
          ]}
        />
      }
    >
      <AgentAppConversations conversations={[]} />
    </AgentApp>
  ),
  play: async () => {
    const marks = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-slot=conversation] [data-slot=status-mark]"
      )
    )
    await expect(marks).toHaveLength(5)
    const left = (mark: HTMLElement) =>
      Math.round(mark.getBoundingClientRect().left)
    for (const mark of marks) await expect(left(mark)).toBe(left(marks[0]!))
  },
}

/**
 * A running conversation stands out of the list of greys: its title in
 * the text's colour, as the current row's, and a spinner in it too.
 */
export const RunningRow: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[
            { id: "deploy", title: "Fix the slow deploy", status: "running" },
            { id: "clamp", title: "Clamp styles" },
          ]}
          current={{ conversation: "clamp" }}
        />
      }
    >
      <AgentAppConversations conversations={[]} />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    const color = (name: string) =>
      getComputedStyle(
        canvas.getByRole("button", { name: new RegExp(`^${name}`) })
      ).color
    await expect(color("Fix the slow deploy")).toBe(color("Clamp styles"))
    const spinner = document.querySelector<SVGElement>(
      "[data-status=running] [data-slot=spinner]"
    )!
    await expect(getComputedStyle(spinner).color).toBe(
      color("Fix the slow deploy")
    )
    await expect(
      getComputedStyle(spinner.querySelector("path")!).strokeWidth
    ).toBe("2px")
  },
}

/**
 * The project picker as a form's field (`variant="outline"`), as wide
 * as the field, named by its label.
 */
export const ProjectPickerField: Story = {
  args: { sidebar: null },
  parameters: { layout: "centered" },
  render: function Render() {
    const [value, setValue] = React.useState<string | null>("agent-ui")
    return (
      <Field className="w-72">
        <FieldLabel htmlFor="project">Project</FieldLabel>
        <ProjectPicker
          id="project"
          variant="outline"
          projects={projectList}
          value={value}
          onValueChange={setValue}
        />
        <FieldDescription>Where the conversation runs.</FieldDescription>
      </Field>
    )
  },
  play: async ({ canvas }) => {
    const picker = canvas.getByRole("combobox", { name: "Project" })
    await expect(picker).toHaveTextContent("agent-ui")
    await expect(picker.getBoundingClientRect().width).toBe(288)
    await userEvent.click(picker)
    const list = await body.findByRole("listbox")
    await userEvent.click(within(list).getByRole("option", { name: /vesper/ }))
    await waitFor(() => expect(picker).toHaveTextContent("vesper"))
    await waitFor(() => expect(body.queryByRole("listbox")).toBeNull())
  },
}

const newConversation = fn()
const searched = fn()

/**
 * Without a rail of the app's, from 640px wide the sidebar folds to a
 * column of its own: its button, a new conversation and search.
 */
export const FoldedWithoutRail: Story = {
  ...viewport("unfolded-no-rail", 690, 880),
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          projects={[]}
          conversations={[]}
          onNewConversation={newConversation}
          onSearch={searched}
        />
      }
    >
      <AgentAppHeader title="A conversation" />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    newConversation.mockClear()
    searched.mockClear()
    const column = document.querySelector<HTMLElement>(
      "[data-slot=agent-app-rail]"
    )!
    await expect(column).toBeVisible()
    await expectLevel()
    const rail = within(column)
    await userEvent.click(
      rail.getByRole("button", { name: "New conversation" })
    )
    await expect(newConversation).toHaveBeenCalledTimes(1)
    await userEvent.click(rail.getByRole("button", { name: "Search" }))
    await expect(searched).toHaveBeenCalledTimes(1)
    await expect(canvas.getByRole("main").getBoundingClientRect().width).toBe(
      690 - 48 - 8
    )
  },
}

const startedIn = fn()

/**
 * A new conversation from the top in no project
 * (`newConversationProject="none"`), while a project's row still starts
 * one in its project.
 */
export const NewConversationAnywhere: Story = {
  args: { sidebar: null },
  render: () => (
    <AgentApp
      sidebar={
        <AgentAppSidebar
          layout="tree"
          projects={[
            {
              id: "api",
              path: "~/code/api",
              conversations: [{ id: "c1", title: "Fix the slow deploy" }],
            },
          ]}
          conversations={[]}
          current={{ conversation: "c1" }}
          newConversationProject="none"
          onNewConversation={startedIn}
        />
      }
    >
      <AgentAppHeader title="Fix the slow deploy" />
    </AgentApp>
  ),
  play: async ({ canvas }) => {
    startedIn.mockClear()
    const sidebar = within(
      canvas.getByRole("navigation", { name: "Projects and conversations" })
    )
    await userEvent.click(
      sidebar.getByRole("button", { name: "New conversation" })
    )
    await expect(startedIn).toHaveBeenLastCalledWith(undefined)
    await userEvent.click(
      sidebar.getByRole("button", { name: "New conversation in api" })
    )
    await expect(startedIn).toHaveBeenLastCalledWith("api")
  },
}

const projectOpened = fn()

/**
 * As an app sets the sidebar up: whether projects are open its own (to
 * keep), all closed at first; its own facts at a row's end (`meta`), a
 * project told apart by its `hint`, and every conversation listed
 * (`shown={Infinity}`).
 */
export const SidebarOptions: Story = {
  args: { sidebar: null },
  render: function Render() {
    const [open, setOpen] = React.useState<Record<string, boolean>>({
      api: true,
    })
    return (
      <FoldProvider>
        <AgentApp
          sidebar={
            <AgentAppSidebar
              layout="tree"
              projects={[
                {
                  id: "api",
                  path: "~/code/api",
                  hint: "Worker",
                  meta: "$0.31",
                  conversations: Array.from({ length: 8 }, (_, index) => ({
                    id: `api:${index}`,
                    title: `Conversation ${index + 1}`,
                    time: `${index + 1}d`,
                  })),
                },
                {
                  id: "web",
                  path: "~/code/web",
                  conversations: [{ id: "web:1", title: "Pricing page" }],
                },
              ]}
              conversations={[]}
              shown={Infinity}
              projectsOpen={open}
              defaultProjectsOpen={false}
              onProjectOpenChange={(id, next) => {
                projectOpened(id, next)
                setOpen((all) => ({ ...all, [id]: next }))
              }}
              header="Chat"
            />
          }
        >
          <AgentAppHeader title="A conversation" />
        </AgentApp>
      </FoldProvider>
    )
  },
  play: async () => {
    projectOpened.mockClear()
    const api = sidebar().getByRole("button", { name: /^api/ })
    // Its hint after its name; its meta at the end, not read out.
    await expect(api).toHaveTextContent("api Worker$0.31")
    await expect(api).toHaveAttribute("aria-expanded", "true")
    // All eight listed, no "Show all".
    await expect(sidebar().getByText("Conversation 8")).toBeVisible()
    await expect(sidebar().queryByText(/^Show all/)).toBeNull()
    // web closed at first; opened, the app is told, and keeps it.
    const web = sidebar().getByRole("button", { name: /^web/ })
    await expect(web).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(web)
    await expect(projectOpened).toHaveBeenCalledWith("web", true)
    await expect(web).toHaveAttribute("aria-expanded", "true")
  },
}

/**
 * Adding a project chooses its folder on the machine of the group (here
 * none: this computer) in a `FolderPicker`.
 */
export const AddProject: Story = {
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    // On its label's middle.
    const add = sidebar().getByRole("button", { name: "Add project" })
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect()
      return box.top + box.height / 2
    }
    await expect(
      Math.abs(middle(add) - middle(sidebar().getByText("Projects")))
    ).toBeLessThanOrEqual(0.5)
    await userEvent.click(add)
    const dialog = await within(document.body).findByRole("dialog", {
      name: "Choose a folder",
    })
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    )
    // Its opening animation over, so what is in it is visible.
    await waitFor(() =>
      expect(
        dialog
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running")
      ).toHaveLength(0)
    )
    const picker = within(dialog)
    await expect(picker.getByText("On This computer")).toBeVisible()
    await userEvent.click(picker.getByRole("option", { name: "code" }))
    await userEvent.click(
      await picker.findByRole("option", { name: "samples" })
    )
    await userEvent.click(picker.getByRole("button", { name: "Choose" }))
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog", { name: "Choose a folder" })
      ).not.toBeInTheDocument()
    )
    await expect(
      await canvas.findByRole("button", { name: /^samples/ })
    ).toBeVisible()
  },
}

/**
 * A desktop window's titlebar, open as a book (two 540px screens, a 34px
 * hinge): the flat sidebar the first screen, to the second's edge, its
 * rows 8px short of the hinge, the rule between it and the main area at
 * that edge; no sidebar button in the titlebar, as it stays open.
 */
export const TitlebarBook: Story = {
  ...viewport("titlebar-book", 1114, 700),
  args: { sidebar: null },
  beforeEach: () => {
    const matchMedia = window.matchMedia
    window.matchMedia = (query) =>
      query.includes("horizontal-viewport-segments: 2")
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
          } satisfies MediaQueryList)
        : matchMedia.call(window, query)
    Object.defineProperty(window, "viewport", {
      configurable: true,
      value: {
        segments: [new DOMRect(0, 0, 540, 700), new DOMRect(574, 0, 540, 700)],
      },
    })
    return () => {
      window.matchMedia = matchMedia
      Reflect.deleteProperty(window, "viewport")
    }
  },
  render: () => <App titlebar browser={false} />,
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar]"
    )!
    await waitFor(() =>
      expect(
        within(bar).queryByRole("button", { name: "Toggle Sidebar" })
      ).not.toBeInTheDocument()
    )
    const sidebar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=sidebar-container]"
    )!
    const main = canvasElement.querySelector<HTMLElement>("#agent-app-main")!
    // As it widens to the screen.
    await waitFor(() =>
      expect(Math.round(sidebar.getBoundingClientRect().right)).toBe(574)
    )
    await waitFor(() =>
      expect(Math.round(main.getBoundingClientRect().left)).toBe(574)
    )
    const row = within(sidebar).getByText("Fix the slow deploy").closest("li")!
    // 8px short of the hinge, and of the rule's 1px.
    await expect(Math.round(row.getBoundingClientRect().right)).toBe(531)
  },
}

/**
 * 720px with the main area's narrowest 420: the sidebar is drawn
 * narrower (236px of its 240) rather than folded to the rail, down to its
 * narrowest (208); the width it was given is kept for a wider window.
 */
export const SidebarNarrower: Story = {
  ...viewport("narrow-window", 720, 900),
  args: { sidebar: null },
  render: () => <App browser={false} minMainWidth={420} />,
  play: async ({ canvasElement }) => {
    const app = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app]"
    )!
    await waitFor(() =>
      expect(app.style.getPropertyValue("--sidebar-width")).toBe("236px")
    )
    await expect(app).not.toHaveAttribute("data-inset")
    const sidebar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=sidebar-container]"
    )!
    await waitFor(() =>
      expect(Math.round(sidebar.getBoundingClientRect().width)).toBe(236)
    )
  },
}

/**
 * The sidebar's trailing line: the new conversation's icon, the search
 * row's keys, a group's plus, the rows' counts and status marks end on
 * one line, in each variant.
 */
async function onTrailingLine(sidebar: HTMLElement) {
  const right = sidebar.getBoundingClientRect().right
  const glyph = (element: Element | null) => {
    if (!element) return undefined
    const range = document.createRange()
    range.selectNodeContents(element)
    const box =
      element instanceof SVGElement
        ? element.getBoundingClientRect()
        : range.getBoundingClientRect()
    return box.width ? Math.round(right - box.right) : undefined
  }
  const newChat = sidebar.querySelector(
    "button[aria-label='New conversation'] svg"
  )
  const ends = {
    newChat: glyph(newChat),
    keys: glyph(
      sidebar.querySelector("[data-slot=agent-app-sidebar-search] kbd")
    ),
    plus: glyph(sidebar.querySelector("[data-sidebar=group-action] svg")),
    count: glyph(sidebar.querySelector("[data-slot=project-count]")),
  }
  const found = Object.values(ends).filter((end) => end !== undefined)
  await expect(found.length).toBeGreaterThanOrEqual(3)
  await expect(new Set(found).size, JSON.stringify(ends)).toBe(1)
  // Its leading column (icons, a group's label) and its text column.
  await onOneLine(
    "sidebar leading column",
    {
      title: sidebar.querySelector("[data-slot=agent-app-sidebar-bar] > div"),
      search: sidebar.querySelector("[data-slot=agent-app-sidebar-search] svg"),
      group: sidebar.querySelector("[data-sidebar=group-label]"),
      project: sidebar.querySelector("[data-slot=project-row] svg"),
    },
    { least: 3 }
  )
  await onOneLine(
    "sidebar text column",
    {
      search: sidebar.querySelector(
        "[data-slot=agent-app-sidebar-search] span"
      ),
      project: sidebar.querySelector(
        "[data-slot=project-row] [data-sidebar=menu-button] span"
      ),
      conversation: sidebar.querySelector(
        "[data-slot=conversation] [data-sidebar=menu-button] span"
      ),
    },
    { least: 2 }
  )
}

const visibleSidebar = () =>
  [...document.querySelectorAll<HTMLElement>("[data-sidebar=sidebar]")].find(
    (each) => each.getBoundingClientRect().width > 0
  )!

export const TrailingLineInset: Story = {
  ...Default,
  play: async () => {
    await waitFor(() => expect(visibleSidebar()).toBeTruthy())
    await onTrailingLine(visibleSidebar())
  },
}

export const TrailingLineSidebar: Story = {
  args: { sidebar: null },
  render: () => <App titlebar browser={false} />,
  play: TrailingLineInset.play,
}

export const TrailingLinePhone: Story = {
  ...phoneWidth,
  args: { sidebar: null },
  render: () => <App />,
  play: async ({ canvas }) => {
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    const dialog = await body.findByRole("dialog")
    await waitFor(() => expect(dialog).toBeVisible())
    // Once it has slid in.
    await waitFor(() =>
      expect(Math.round(dialog.getBoundingClientRect().left)).toBe(0)
    )
    await onTrailingLine(
      dialog.closest<HTMLElement>("[data-sidebar=sidebar]") ??
        dialog.querySelector<HTMLElement>("[data-sidebar=sidebar]") ??
        dialog
    )
  },
}

/**
 * Unsaved changes kept at the page's foot (`footer`), on its colour, in
 * its column, over what scrolls under it.
 */
export const PageFooter: Story = {
  args: { sidebar: null },
  render: () => (
    <div className="flex h-120 flex-col">
      <AgentAppPage
        title="Settings"
        footer={
          <Alert variant="warning" role="status">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            <AlertTitle>Unsaved changes</AlertTitle>
            <AlertAction>
              <Button variant="ghost" size="sm">
                Discard
              </Button>
              <Button size="sm">Save changes</Button>
            </AlertAction>
          </Alert>
        }
      >
        <FieldGroup>
          {Array.from({ length: 12 }, (_, index) => (
            <Field key={index} orientation="responsive">
              <FieldLabel htmlFor={`setting-${index}`}>
                Setting {index + 1}
              </FieldLabel>
              <Input id={`setting-${index}`} defaultValue="On" />
            </Field>
          ))}
        </FieldGroup>
      </AgentAppPage>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const page = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-page]"
    )!
    const footer = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-page-footer]"
    )!
    const column = page.firstElementChild!.getBoundingClientRect()
    const check = async () => {
      const box = footer.getBoundingClientRect()
      await expect(
        Math.round(page.getBoundingClientRect().bottom - box.bottom)
      ).toBe(0)
      await expect([box.left, box.right]).toEqual([column.left, column.right])
    }
    await expect(page.scrollHeight).toBeGreaterThan(page.clientHeight)
    await check()
    await expect(getComputedStyle(footer).backgroundColor).toBe(
      getComputedStyle(page.closest("body")!).backgroundColor
    )
    page.scrollTop = page.scrollHeight
    await waitFor(check)
    // The alert 16px in from the column's edges, as the page's content.
    const alert = footer
      .querySelector("[data-slot=alert]")!
      .getBoundingClientRect()
    await expect(alert.left - column.left).toBe(16)
  },
}

/**
 * A desktop window's titlebar over an open panel, a browser: its tabs in
 * the titlebar's row over the panel, as wide as it, the line between the
 * two on up through the bar; no row of their own under it. The panel's
 * button stays at the window's end, open or closed.
 */
export const TitlebarPanel: Story = {
  ...viewport("titlebar-panel", 1280, 800),
  args: { sidebar: null },
  render: () => <App titlebar panel />,
  play: async ({ canvasElement }) => {
    const titlebar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar]"
    )!
    const aside = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>(
        "[data-slot=agent-app-panel]"
      )
      if (!element) throw new Error("No panel yet")
      return element
    })
    // Light, the window's frame (the titlebar and the rail) a grey; the
    // card of the sidebar and the main area white.
    if (!document.documentElement.classList.contains("dark")) {
      const fill = (selector: string) =>
        getComputedStyle(canvasElement.querySelector(selector)!).backgroundColor
      const frame = getComputedStyle(titlebar).backgroundColor
      await expect(fill("[data-slot=agent-app-rail]")).toBe(frame)
      const sidebar = fill("[data-slot=sidebar-inner]")
      const main = fill("[data-slot=sidebar-inset]")
      await expect(sidebar).toBe(main)
      // A step darker than the sidebar's colour, not it.
      const probe = document.createElement("div")
      probe.style.backgroundColor = "var(--sidebar)"
      document.body.append(probe)
      const own = getComputedStyle(probe).backgroundColor
      probe.remove()
      await expect(frame).not.toBe(own)
      await expect(frame).not.toBe(main)
    }
    const over = titlebar.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar-panel]"
    )!
    const bar = await waitFor(() => {
      const element = over.querySelector<HTMLElement>("[data-slot=browser-bar]")
      if (!element) throw new Error("No bar in the titlebar yet")
      return element
    })
    // In the titlebar's row, none in the panel.
    await expect(aside.querySelector("[data-slot=browser-bar]")).toBeNull()
    // Measured once the panel has opened and stands.
    await quiet(canvasElement)
    const row = titlebar.getBoundingClientRect()
    await waitFor(() =>
      expect(bar.getBoundingClientRect().height).toBe(row.height)
    )
    // Over the panel, as wide; the line before it on up through the bar.
    await waitFor(() =>
      expect(over.getBoundingClientRect().left).toBe(
        aside.getBoundingClientRect().left - 1
      )
    )
    await expect(bar.getBoundingClientRect().left).toBe(
      aside.getBoundingClientRect().left
    )
    await expect(bar.getBoundingClientRect().right).toBe(
      aside.getBoundingClientRect().right
    )
    await expect(getComputedStyle(over).borderInlineStartWidth).toBe("1px")
    // The panel's top right under the bar.
    await expect(aside.getBoundingClientRect().top).toBeLessThanOrEqual(
      row.bottom + 1
    )
    // The card 8px from the window's end and foot, its corners rounded.
    const card = canvasElement.querySelector<HTMLElement>(
      "[data-slot=sidebar-inset]"
    )!
    const edge = card.getBoundingClientRect()
    await expect(edge.right).toBe(window.innerWidth - 8)
    await expect(edge.bottom).toBe(window.innerHeight - 8)
    await expect(
      parseFloat(getComputedStyle(card).borderEndEndRadius)
    ).toBeGreaterThan(0)
    await expect(
      parseFloat(getComputedStyle(card).borderStartEndRadius)
    ).toBeGreaterThan(0)
    const sidebar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=sidebar-container]"
    )!
    await expect(sidebar.getBoundingClientRect().bottom).toBe(edge.bottom)
    await expect(
      parseFloat(getComputedStyle(sidebar).borderEndStartRadius)
    ).toBeGreaterThan(0)
    // Its tabs work there.
    const tabs = within(bar)
    // On the lines of a web page's toolbar under it.
    await userEvent.click(tabs.getByRole("tab", { name: /Browser/ }))
    await waitFor(() =>
      expect(aside.querySelector("[data-slot=browser-address]")).not.toBeNull()
    )
    await onPanelLines(aside, bar)
    await userEvent.click(tabs.getByRole("tab", { name: /Changes/ }))
    await expect(tabs.getByRole("tab", { name: /Changes/ })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    // Its tabs as a desktop browser's: the one shown a solid piece of
    // the panel's colour (light), the others bare on the frame, each
    // with its close.
    {
      const fill = (element: Element) =>
        getComputedStyle(element).backgroundColor
      const shown = tabs.getByRole("tab", { name: /Changes/ })
      const other = tabs.getByRole("tab", { name: /Browser/ })
      await quiet(shown)
      await expect(fill(other)).toBe("rgba(0, 0, 0, 0)")
      await expect(fill(shown)).not.toBe(fill(other))
      // (Once its colour has come.)
      if (!document.documentElement.classList.contains("dark"))
        await waitFor(() =>
          expect(fill(shown)).toBe(
            fill(canvasElement.querySelector("[data-slot=sidebar-inset]")!)
          )
        )
      await expect(
        other.querySelector("[data-slot=browser-tab-close]")
      ).toBeVisible()
      // A thin line between two bare tabs, none by the one shown.
      const line = (tab: HTMLElement) =>
        tab.querySelector<HTMLElement>("[data-slot=browser-tab-line]")!
      await userEvent.click(other)
      await waitFor(() =>
        expect(other).toHaveAttribute("aria-selected", "true")
      )
      const first = tabs.getAllByRole("tab")[0]!
      await expect(line(first)).toBeVisible()
      await expect(line(first).getBoundingClientRect().width).toBe(1)
      await expect(line(shown)).not.toBeVisible()
      await userEvent.click(shown)
      // The panel's bar does not drag the window: Electron would not tell
      // the page the pointer left a button for it.
      if (CSS.supports("-webkit-app-region", "drag"))
        await expect(
          getComputedStyle(over).getPropertyValue("-webkit-app-region")
        ).toBe("no-drag")
    }
    // One button for the panel, at the window's end: in its bar while it
    // is open, in the header while closed.
    const header = titlebar.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar-header]"
    )!
    await expect(
      within(header).queryByRole("button", { name: "Browser" })
    ).toBeNull()
    const toggle = tabs.getByRole("button", { name: "Browser" })
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await expect(tabs.queryByRole("button", { name: "Close" })).toBeNull()
    const end = toggle.getBoundingClientRect().right
    await userEvent.click(toggle)
    const trigger = await within(header).findByRole("button", {
      name: "Browser",
    })
    await waitFor(() => expect(trigger).toHaveFocus())
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await waitFor(() => expect(over.childElementCount).toBe(0))
    await expect(over.getBoundingClientRect().width).toBe(0)
    await expect(trigger.getBoundingClientRect().right).toBe(end)
    // Open again: the bar back over it.
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(over.querySelector("[data-slot=browser-bar]")).not.toBeNull()
    )
  },
}

/** A panel's own bar (its title, close), so in the titlebar's row. */
export const TitlebarPanelBar: Story = {
  ...viewport("titlebar-panel-bar", 1280, 800),
  args: { sidebar: null },
  render: () => <App titlebar panel browser={false} />,
  play: async ({ canvasElement }) => {
    const titlebar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar]"
    )!
    const over = titlebar.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar-panel]"
    )!
    const title = await within(over).findByRole("heading", {
      level: 2,
      name: "Files",
    })
    const aside = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-panel]"
    )!
    await expect(aside).toHaveAccessibleName("Files")
    await expect(aside.querySelector("h2")).toBeNull()
    // Measured once the panel has opened and stands.
    await quiet(canvasElement)
    await expect(title.getBoundingClientRect().left).toBeGreaterThan(
      aside.getBoundingClientRect().left
    )
    await expect(
      within(over).getByRole("button", { name: "Files" })
    ).toHaveAttribute("aria-expanded", "true")
  },
}
