import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  AiBrain01Icon,
  ArrowDown01Icon,
  BookOpen01Icon,
  BrowserIcon,
  BubbleChatIcon,
  CommandLineIcon,
  Folder01Icon,
  GitBranchIcon,
  LaptopIcon,
  Layers01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Settings02Icon,
  Share03Icon,
  Shield01Icon,
  Tick02Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { settled } from "@/stories/wait"

import {
  AgentApp,
  AgentAppColumn,
  AgentAppDock,
  AgentAppHeader,
  AgentAppPanelClose,
  AgentAppPanelExpand,
  AgentAppPanelTrigger,
  AgentAppPanels,
  AgentAppStart,
} from "@/components/agent-app/agent-app"
import {
  AgentAppRail,
  AgentAppRailBrand,
  AgentAppRailFooter,
  AgentAppRailItem,
} from "@/components/agent-app/agent-app-rail"
import {
  AgentAppSidebar,
  type AppSidebarProject,
} from "@/components/agent-app/agent-app-sidebar"
import {
  ComposerContext,
  ComposerContextButton,
  type AppProject,
} from "@/components/agent-app/project-picker"
import {
  AgentRequest,
  AgentRequestContent,
  AgentRequestDescription,
  AgentRequestFooter,
  AgentRequestStatus,
  AgentRequestTitle,
} from "@/components/agent-request"
import {
  AgentTurn,
  AgentTurnTarget,
  type AgentTurnPart,
} from "@/components/agent-turn"
import {
  AgentTurnAction,
  AgentTurnFooter,
  AgentTurnInfo,
  AgentTurnMore,
  AgentTurnRetry,
} from "@/components/agent-turn-footer"
import { Browser, useBrowser, type BrowserPage } from "@/components/browser"
import { Composer, ComposerEditor } from "@/components/composer"
import { ComposerQueue } from "@/components/composer-queue"
import { CopyButton } from "@/components/copy-button"
import {
  AgentTurnChanges,
  AgentTurnChangesProvider,
  AgentTurnChangesTrigger,
  AgentTurnSources,
} from "@/components/agent-turn-changes"
import { Markdown } from "@/components/markdown"
import { UserMessage, UserMessageText } from "@/components/user-message"
import { FoldProvider } from "@/hooks/use-fold"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { FullToolbar } from "@/stories/composer-tools"
import { asCoarse } from "@/stories/touch"
import { Kbd } from "@/components/ui/kbd"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

/**
 * The app's screens as the design draws them, on the same made-up
 * content: a conversation, one running, a new one, the changes and the
 * browser beside a conversation, and a phone. Each is the blocks
 * composed as an app would, with no styles of the story's own.
 */
const meta = {
  title: "Blocks/Agent App Screens",
  component: AgentApp,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AgentApp>

export default meta
type Story = StoryObj<typeof meta>

const icon = (of: Parameters<typeof HugeiconsIcon>[0]["icon"]) => (
  <HugeiconsIcon icon={of} strokeWidth={2} />
)

const projects: AppSidebarProject[] = [
  {
    id: "agent-ui",
    path: "~/code/agent-ui",
    count: 12,
    conversations: [
      { id: "vite", title: "Tune the vite build", time: "now" },
      { id: "rail", title: "Rail for the app's areas", time: "2h" },
      { id: "graphite", title: "Graphite theme tokens", time: "5h" },
      { id: "release", title: "Release v0.1.9", time: "1d" },
      { id: "touch", title: "Touch targets on coarse pointers", time: "3d" },
    ],
  },
  {
    id: "vesper",
    path: "~/code/vesper",
    count: 8,
    conversations: [{ id: "v1", title: "Login redirect loop", time: "2d" }],
  },
  {
    id: "agentry",
    path: "~/code/agentry",
    count: 5,
    conversations: [{ id: "a1", title: "Session list", time: "4d" }],
  },
]

const agentUi: AppProject = projects[0]!
const agentUiConversations = projects[0]!.conversations!

/** As an app keeps the reader's folds: two projects closed, the work open. */
const folds = {
  "vesper:project": false,
  "agentry:project": false,
  "vite:work": true,
  "release:work": true,
  "pricing:work": true,
}

/** The browser's calls, a kind of the app's own. */
const kinds = { web: () => "opened a page, took a screenshot" }

const say = (id: string, text: string): AgentTurnPart => ({
  type: "content",
  id,
  content: <p>{text}</p>,
})

const output = (text: string) => (
  <CodeBlock size="sm">
    <CodeBlockContent wrap>{text}</CodeBlockContent>
  </CodeBlock>
)

const buildSteps = (id: string): AgentTurnPart[] => [
  {
    type: "tool",
    id: `${id}:read`,
    kind: "read",
    status: "done",
    icon: icon(BookOpen01Icon),
    title: (
      <>
        Read{" "}
        <AgentTurnTarget href="#vite.config.ts">vite.config.ts</AgentTurnTarget>
      </>
    ),
  },
  {
    type: "tool",
    id: `${id}:edit`,
    kind: "edit",
    status: "done",
    icon: icon(PencilEdit02Icon),
    title: (
      <>
        Edited{" "}
        <AgentTurnTarget href="#vite.config.ts">vite.config.ts</AgentTurnTarget>
      </>
    ),
  },
  {
    type: "tool",
    id: `${id}:build`,
    kind: "command",
    status: "done",
    icon: icon(CommandLineIcon),
    title: (
      <>
        Ran <AgentTurnTarget code>pnpm build</AgentTurnTarget>
      </>
    ),
    details: output("✓ built in 4.1s"),
  },
  {
    type: "tool",
    id: `${id}:test`,
    kind: "command",
    status: "error",
    icon: icon(CommandLineIcon),
    title: (
      <>
        Ran <AgentTurnTarget code>pnpm test</AgentTurnTarget>
      </>
    ),
    details: output("Tests  1 failed | 41 passed (42)"),
  },
]

const answer = `## What changed

The build now splits vendor code once and skips what nothing imports. Tests failed on one snapshot, which I left for you to review.

1. Added a \`manualChunks\` rule so React ships in one cached vendor chunk.
2. Dropped \`lodash\`; the two helpers it was used for are now native.
3. Enabled \`cssCodeSplit\`, so each route loads only its own CSS.
`

/** The same answer, shorter, as the phone and foldable screens draw it. */
const shortAnswer = `The build now splits vendor code once and skips what nothing imports. One snapshot test failed; I left it for you to review.

- React ships in one cached \`vendor\` chunk.
- \`lodash\` is gone; its helpers are native.
- Each route loads only its own CSS.
`

const viteDiff = [
  "--- a/vite.config.ts",
  "+++ b/vite.config.ts",
  "@@ -8,4 +8,6 @@",
  "   build: {",
  "-    rollupOptions: { output: { inlineDynamicImports: true } },",
  "-    cssCodeSplit: false,",
  "+    rollupOptions: {",
  '+      output: { manualChunks: { vendor: ["react", "react-dom"] } },',
  "+    },",
  "+    cssCodeSplit: true,",
  "   },",
].join("\n")

/** The changes of the turn: three files, for the panel's list. */
const changes = [
  "--- a/vite.config.ts",
  "+++ b/vite.config.ts",
  "@@ -6,7 +6,9 @@ export default defineConfig({",
  "   plugins: [react()],",
  '   resolve: { alias: { "@": "/src" } },',
  "   build: {",
  "-    rollupOptions: { output: { inlineDynamicImports: true } },",
  "-    cssCodeSplit: false,",
  "+    rollupOptions: {",
  '+      output: { manualChunks: { vendor: ["react", "react-dom"] } },',
  "+    },",
  "+    cssCodeSplit: true,",
  '     target: "es2022",',
  "   },",
  "@@ -21,4 +23,4 @@ export default defineConfig({",
  "   server: {",
  "-    port: 3000,",
  "+    port: 5173,",
  "   },",
  " })",
  "--- a/package.json",
  "+++ b/package.json",
  "@@ -12,3 +12,2 @@",
  '     "react-dom": "^19.2.0",',
  '-    "lodash": "^4.17.21",',
  "   },",
  "--- /dev/null",
  "+++ b/src/lib/debounce.ts",
  "@@ -0,0 +1,14 @@",
  ...Array.from({ length: 14 }, (_, n) => `+// line ${n + 1}`),
].join("\n")

const sources = [
  { href: "https://vitejs.dev/config/build-options" },
  { href: "https://rollupjs.org/configuration-options/" },
]

function Footer({ phone = false }: { phone?: boolean }) {
  return (
    <AgentTurnFooter>
      <CopyButton value={answer} labels={{ copy: "Copy", copied: "Copied" }} />
      <AgentTurnRetry onClick={() => {}}>
        <DropdownMenuGroup>
          <DropdownMenuItem>Retry with more thinking</DropdownMenuItem>
        </DropdownMenuGroup>
      </AgentTurnRetry>
      <AgentTurnAction label="Branch from here" optional>
        {icon(GitBranchIcon)}
      </AgentTurnAction>
      <AgentTurnMore>
        <DropdownMenuGroup>
          <DropdownMenuItem>Copy as plain text</DropdownMenuItem>
        </DropdownMenuGroup>
      </AgentTurnMore>
      <AgentTurnInfo details={null}>
        {phone && <AgentTurnChangesTrigger />}
        {!phone && <span>Opus 5.5</span>}
        {!phone && <span>48s</span>}
        <time dateTime="2026-11-08T12:04">12:04</time>
      </AgentTurnInfo>
    </AgentTurnFooter>
  )
}

type Screen = "thread" | "running" | "new" | "changes" | "preview"

const page = (
  id: string,
  title: string,
  content: BrowserPage["content"],
  count?: number
): BrowserPage => ({
  id,
  title,
  ...(count !== undefined ? { count } : {}),
  content,
})

const site = `<!doctype html><html><head><title>Pricing</title><style>
body{margin:0;font:14px/1.5 -apple-system,system-ui,sans-serif;color:#18181b;background:#fff}
nav{display:flex;align-items:center;gap:18px;height:44px;padding:0 20px;border-bottom:1px solid #ebebed;font-size:13px}
nav i{width:18px;height:18px;border-radius:5px;background:#18181b;margin-right:6px}
nav a{color:#6b6b73;text-decoration:none}
nav .in{margin-left:auto;border:1px solid #ebebed;border-radius:8px;padding:3px 10px;color:#18181b}
main{padding:48px 32px}
h1{font-size:26px;line-height:1.2;letter-spacing:-.02em;margin:0 0 12px;max-width:10em}
p{color:#6b6b73;margin:0 0 20px;max-width:30em;font-size:13px}
.cta{display:flex;gap:8px}
.cta a{display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:8px;text-decoration:none;font-weight:500;font-size:13px}
.cta-primary{background:#18181b;color:#fff}
.cta-secondary{border:1px solid #ebebed;color:#18181b}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:32px}
.cards div{height:96px;border-radius:10px;background:#fafafa;border:1px solid #f0f0f1}
</style></head><body>
<nav><i></i><a href="#">Product</a><a href="#">Pricing</a><a href="#">Docs</a><a class="in" href="#">Sign in</a></nav>
<main><h1>Ship faster with smaller bundles.</h1>
<p>A vendor chunk that caches, CSS per route, and nothing you don't import.</p>
<div class="cta"><a class="cta-primary" href="#">Get started</a><a class="cta-secondary" href="#">Read the docs</a></div>
<div class="cards"><div></div><div></div><div></div></div></main>
</body></html>`

const siteUrl = `data:text/html,${encodeURIComponent(site)}`

function Panel({ screen, touch }: { screen: Screen; touch: boolean }) {
  const browser = useBrowser({
    defaultValue: {
      tabs: [
        {
          id: "changes",
          pinned: true,
          index: 0,
          pages: [
            page(
              "changes",
              "Changes",
              {
                type: "diff",
                diff: changes,
                status: (
                  <>
                    {icon(GitBranchIcon)}
                    <span>perf/vite-chunks · 3 files</span>
                  </>
                ),
                // On a touch screen, as the design has it there: the file's
                // changes undone, or all kept.
                actions: touch ? (
                  <>
                    <Button variant="outline" size="sm">
                      Undo file
                    </Button>
                    <Button size="sm">Keep all</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm">
                      {icon(Undo02Icon)}
                      Discard
                    </Button>
                    <Button size="sm">
                      {icon(Tick02Icon)}
                      Commit
                    </Button>
                  </>
                ),
              },
              3
            ),
          ],
        },
        {
          id: "files",
          pinned: true,
          index: 0,
          pages: [
            {
              ...page("files", "Files", {
                type: "files",
                files: [{ name: "vite.config.ts", path: "vite.config.ts" }],
              }),
              location: "~/agent-ui",
            },
          ],
        },
        {
          id: "web",
          pinned: true,
          index: 0,
          pages: [
            {
              ...page("web", "Browser", {
                type: "web",
                url: siteUrl,
                running: true,
                console: [
                  { id: "1", level: "error", text: "404 GET /api/plans" },
                ],
              }),
              location: "http://localhost:5173/pricing",
            },
          ],
        },
        {
          id: "terminal",
          pinned: true,
          index: 0,
          pages: [
            page("terminal", "Terminal", {
              type: "terminal",
              output: "$ pnpm dev\n",
            }),
          ],
        },
      ],
      active: screen === "preview" ? "web" : "changes",
    },
  })
  return (
    <Browser
      browser={browser}
      onPickElement={() => {}}
      actions={
        <>
          <AgentAppPanelExpand />
          <AgentAppPanelClose />
        </>
      }
    />
  )
}

/**
 * How much of the answer a screen shows, as the design draws it: all of
 * it on a desktop; shorter on a phone, with its changes' card; shorter
 * still on a foldable or a tablet.
 */
type Answer = "full" | "phone" | "short"

function Turn({ screen, answer: length }: { screen: Screen; answer: Answer }) {
  const id = screen === "preview" ? "pricing" : "vite"
  const parts: AgentTurnPart[] =
    screen === "preview"
      ? [
          say(
            "p:1",
            "I'll build first, then check the pricing page in the browser."
          ),
          buildSteps("p")[0]!,
          ...buildSteps("p").slice(2),
          say(
            "p:2",
            "The build is fine; one snapshot fails. Looking at the page itself."
          ),
          {
            type: "tool",
            id: "p:open",
            kind: "web",
            status: "done",
            icon: icon(BrowserIcon),
            title: (
              <>
                Opened <AgentTurnTarget>localhost:5173/pricing</AgentTurnTarget>
              </>
            ),
          },
          {
            type: "tool",
            id: "p:shot",
            kind: "web",
            status: "done",
            icon: icon(BrowserIcon),
            title: "Took a screenshot",
          },
        ]
      : [
          say(
            "v:1",
            "I'll read the build config, change the chunking, then build and run the tests."
          ),
          ...buildSteps("v"),
        ]
  const turn = (
    <>
      <AgentTurn
        id={id}
        status="done"
        duration="48s"
        kinds={kinds}
        parts={[
          ...parts,
          {
            type: "content",
            id: `${id}:answer`,
            content: (
              <>
                <Markdown>{length === "full" ? answer : shortAnswer}</Markdown>
                {length !== "short" && (
                  <AgentTurnChanges
                    diff={
                      screen === "thread" && length === "full"
                        ? viteDiff
                        : changes
                    }
                    {...(length === "full"
                      ? { current: "vite.config.ts" }
                      : {})}
                    onOpen={() => {}}
                    onViewAll={() => {}}
                    labels={{ viewAll: "Review all" }}
                    actions={() => (
                      <CopyButton
                        value={viteDiff}
                        labels={{ copy: "Copy", copied: "Copied" }}
                      />
                    )}
                  />
                )}
                {length === "full" && (
                  <AgentTurnSources sources={sources} className="mt-4" />
                )}
              </>
            ),
          },
        ]}
      />
      <Footer phone={length === "phone"} />
    </>
  )
  return (
    <Message>
      <MessageContent>
        {/* On a phone, the changes open from the footer. */}
        {length === "phone" ? (
          <AgentTurnChangesProvider diff={changes}>
            {turn}
          </AgentTurnChangesProvider>
        ) : (
          turn
        )}
      </MessageContent>
    </Message>
  )
}

/** On a phone, as the design draws it: the steps and the question only. */
function PhoneRunningTurn() {
  return (
    <>
      <MessageScrollerItem messageId="release:1">
        <UserMessage>
          <UserMessageText>
            Run the checks, tag v0.1.9 and push it.
          </UserMessageText>
        </UserMessage>
      </MessageScrollerItem>
      <MessageScrollerItem>
        <Message>
          <MessageContent>
            <AgentTurn
              id="release"
              status="running"
              duration="1m 12s"
              kinds={kinds}
              parts={[
                {
                  type: "tool",
                  id: "r:check",
                  kind: "command",
                  status: "done",
                  icon: icon(CommandLineIcon),
                  title: (
                    <>
                      Ran <AgentTurnTarget code>pnpm check</AgentTurnTarget>
                    </>
                  ),
                },
                {
                  type: "tool",
                  id: "r:tag",
                  kind: "command",
                  status: "done",
                  icon: icon(CommandLineIcon),
                  title: (
                    <>
                      Ran <AgentTurnTarget code>git tag v0.1.9</AgentTurnTarget>
                    </>
                  ),
                },
                {
                  type: "tool",
                  id: "r:push",
                  kind: "command",
                  status: "waiting",
                  title: (
                    <>
                      Waiting to run{" "}
                      <AgentTurnTarget code>git push</AgentTurnTarget>
                    </>
                  ),
                },
                {
                  type: "content",
                  id: "r:ask",
                  content: (
                    <AgentRequest icon={icon(Shield01Icon)}>
                      <AgentRequestTitle>
                        Allow the agent to push?
                      </AgentRequestTitle>
                      <AgentRequestDescription>
                        Pushes main and the v0.1.9 tag. This can&apos;t be
                        undone from here.
                      </AgentRequestDescription>
                      <AgentRequestContent>
                        <CodeBlock size="sm">
                          <CodeBlockContent wrap>
                            git push origin main --follow-tags
                          </CodeBlockContent>
                        </CodeBlock>
                      </AgentRequestContent>
                      <AgentRequestFooter>
                        <Button variant="outline" size="sm">
                          Deny
                        </Button>
                        <Button variant="outline" size="sm">
                          Always allow
                        </Button>
                        <Button size="sm">Allow once</Button>
                      </AgentRequestFooter>
                    </AgentRequest>
                  ),
                },
              ]}
            />
          </MessageContent>
        </Message>
      </MessageScrollerItem>
    </>
  )
}

function RunningTurn() {
  return (
    <>
      <MessageScrollerItem messageId="release:1">
        <UserMessage>
          <UserMessageText>
            Run the checks, tag v0.1.9 and push it.
          </UserMessageText>
        </UserMessage>
      </MessageScrollerItem>
      <MessageScrollerItem>
        <Message>
          <MessageContent>
            <AgentTurn
              id="release"
              status="running"
              duration="1m 12s"
              kinds={kinds}
              parts={[
                say("r:1", "I'll run the checks, then tag v0.1.9 and push it."),
                {
                  type: "tool",
                  id: "r:check",
                  kind: "command",
                  status: "done",
                  icon: icon(CommandLineIcon),
                  title: (
                    <>
                      Ran <AgentTurnTarget code>pnpm check</AgentTurnTarget>
                    </>
                  ),
                },
                say(
                  "r:2",
                  "Checks pass. Tagging, then pushing main with the tag."
                ),
                {
                  type: "tool",
                  id: "r:tag",
                  kind: "command",
                  status: "done",
                  icon: icon(CommandLineIcon),
                  title: (
                    <>
                      Ran <AgentTurnTarget code>git tag v0.1.9</AgentTurnTarget>
                    </>
                  ),
                },
                {
                  type: "tool",
                  id: "r:push",
                  kind: "command",
                  status: "waiting",
                  title: (
                    <>
                      Waiting to run{" "}
                      <AgentTurnTarget code>
                        git push origin main
                      </AgentTurnTarget>
                    </>
                  ),
                },
                {
                  type: "content",
                  id: "r:ask",
                  content: (
                    <div className="flex flex-col gap-3">
                      <AgentRequest icon={icon(Shield01Icon)}>
                        <AgentRequestTitle>
                          Allow the agent to push?
                        </AgentRequestTitle>
                        <AgentRequestDescription>
                          It pushes main and the v0.1.9 tag to
                          github.com/Bowl42/agent-ui. This can&apos;t be undone
                          from here.
                        </AgentRequestDescription>
                        <AgentRequestContent>
                          <CodeBlock size="sm">
                            <CodeBlockContent wrap>
                              git push origin main --follow-tags
                            </CodeBlockContent>
                          </CodeBlock>
                        </AgentRequestContent>
                        <AgentRequestFooter>
                          <AgentRequestStatus>Asked 4s ago</AgentRequestStatus>
                          <Button variant="outline" size="sm">
                            Deny <Kbd aria-hidden="true">Esc</Kbd>
                          </Button>
                          <Button variant="outline" size="sm">
                            Always allow
                          </Button>
                          <Button size="sm">
                            Allow once <Kbd aria-hidden="true">↵</Kbd>
                          </Button>
                        </AgentRequestFooter>
                      </AgentRequest>
                      {/* In a turn, the request's 13px, its text in
                          line with the card's. */}
                      <Alert className="px-3 py-2.5 text-2sm has-[>svg]:gap-x-2.5">
                        {icon(Alert02Icon)}
                        <AlertTitle>
                          The registry build skipped 2 files.
                        </AlertTitle>
                        <AlertDescription className="text-2sm">
                          chart.tsx and sonner.tsx aren&apos;t in registry.json,
                          so they won&apos;t ship.
                        </AlertDescription>
                        <AlertAction>
                          <Button variant="outline" size="sm">
                            Show
                          </Button>
                        </AlertAction>
                      </Alert>
                      <p>
                        Checks passed and the tag is in place. Once you allow
                        the push, I&apos;ll publish the registry and post the
                        release notes
                      </p>
                    </div>
                  ),
                },
              ]}
            />
          </MessageContent>
        </Message>
      </MessageScrollerItem>
    </>
  )
}

function Dock({ screen, phone = false }: { screen: Screen; phone?: boolean }) {
  const [project, setProject] = React.useState<string | null>("agent-ui")
  const composer = (
    <Composer status={screen === "running" ? "running" : "ready"}>
      {screen === "new" && (
        <ComposerContext
          started={false}
          projects={projects}
          value={project}
          onValueChange={setProject}
        >
          <ComposerContextButton aria-label="Runs on Local">
            {icon(LaptopIcon)}
            Local
            {icon(ArrowDown01Icon)}
          </ComposerContextButton>
          <ComposerContextButton aria-label="Agent: Coder">
            {icon(AiBrain01Icon)}
            Coder
            {icon(ArrowDown01Icon)}
          </ComposerContextButton>
        </ComposerContext>
      )}
      <ComposerEditor aria-label="Message" placeholder="Ask anything" />
      <FullToolbar usage={screen !== "new"} options={phone} />
    </Composer>
  )
  if (screen === "new")
    return (
      <AgentAppStart title="What should we work on?">{composer}</AgentAppStart>
    )
  return (
    <AgentAppDock>
      {screen === "running" && !phone && (
        <ComposerQueue
          items={[
            {
              id: "q1",
              text: "Then open a PR against main with the release notes",
            },
          ]}
          onRemove={() => {}}
        />
      )}
      {composer}
    </AgentAppDock>
  )
}

/** A screen of the app, as the design draws it. */
function Screen({
  screen,
  panel: initialPanel = screen === "changes" || screen === "preview",
  phone = false,
  answer = phone ? "phone" : "full",
  touch = answer !== "full",
  minTouchMainWidth,
  railPlacement,
  many = false,
}: {
  screen: Screen
  /** Its panel open at first: by default beside the changes and browser. */
  panel?: boolean
  /** A phone's: the work folded, a new conversation in the header. */
  phone?: boolean
  answer?: Answer
  /**
   * A touch screen's, as the design draws one: the rail without the app's
   * mark or the account, the panel's changes kept or undone.
   */
  touch?: boolean
  minTouchMainWidth?: number | false
  railPlacement?: "column" | "sidebar"
  /** Five areas, and three buttons of the app's at the rail's foot. */
  many?: false | "buttons" | "menu"
}) {
  const [panel, setPanel] = React.useState(initialPanel)
  const title =
    screen === "running"
      ? "Release v0.1.9"
      : screen === "new"
        ? "New chat"
        : "Tune the vite build"
  const current =
    screen === "running" ? "release" : screen === "new" ? undefined : "vite"
  return (
    <FoldProvider
      defaultValue={phone ? { ...folds, "vite:work": false } : folds}
    >
      <AgentApp
        {...(minTouchMainWidth !== undefined ? { minTouchMainWidth } : {})}
        {...(railPlacement ? { railPlacement } : {})}
        rail={
          <AgentAppRail
            label="Areas"
            {...(touch
              ? {}
              : {
                  header: (
                    <AgentAppRailBrand label="Agent">A</AgentAppRailBrand>
                  ),
                })}
          >
            <AgentAppRailItem
              icon={icon(BubbleChatIcon)}
              label="Chat"
              current
            />
            <AgentAppRailItem icon={icon(Folder01Icon)} label="Projects" />
            <AgentAppRailItem icon={icon(Layers01Icon)} label="Models" />
            {many && (
              <>
                <AgentAppRailItem icon={icon(LaptopIcon)} label="Files" />
                <AgentAppRailItem icon={icon(Share03Icon)} label="Shared" />
              </>
            )}
            <AgentAppRailFooter>
              {many ? (
                <>
                  {[
                    { label: "Theme", glyph: AiBrain01Icon },
                    { label: "Feedback", glyph: BubbleChatIcon },
                    { label: "Connect a phone", glyph: Shield01Icon },
                  ].map(({ label, glyph }) => (
                    <Button
                      key={label}
                      variant="ghost"
                      size="icon"
                      aria-label={label}
                      // As a menu folds them on a touch screen (an app's
                      // `pointer-coarse:hidden`): none shown.
                      className={
                        many === "menu" ? "hidden" : "pointer-coarse:size-11"
                      }
                    >
                      {icon(glyph)}
                    </Button>
                  ))}
                  {many === "menu" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="More"
                      className="size-11"
                    >
                      {icon(MoreHorizontalIcon)}
                    </Button>
                  )}
                </>
              ) : (
                <AgentAppRailItem
                  icon={icon(Settings02Icon)}
                  label="Settings"
                />
              )}
              {!touch && (
                <AgentAppRailItem
                  label="Account"
                  icon={
                    <Avatar size="sm">
                      <AvatarFallback>D</AvatarFallback>
                    </Avatar>
                  }
                />
              )}
            </AgentAppRailFooter>
          </AgentAppRail>
        }
        sidebar={
          // Its projects, then the current one's latest conversations.
          <AgentAppSidebar
            projects={projects}
            conversations={agentUiConversations}
            conversationsTarget={{ project: agentUi.id }}
            {...(current ? { current: { conversation: current } } : {})}
            header="Chat"
            onNewConversation={() => {}}
            onSearch={() => {}}
            onAddProject={() => {}}
            onSelect={(_, event) => event.preventDefault()}
          />
        }
      >
        <AgentAppPanels
          title="Changes"
          bar={false}
          open={panel}
          onOpenChange={setPanel}
          defaultSize={600}
          panel={<Panel screen={screen} touch={touch} />}
        >
          <AgentAppHeader
            {...(screen === "new" ? {} : { project: agentUi })}
            title={title}
            onProjectSelect={() => {}}
            actions={
              phone ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New conversation"
                >
                  {icon(PencilEdit02Icon)}
                </Button>
              ) : (
                <>
                  {!touch && (
                    <Button variant="ghost" size="icon-sm" aria-label="Share">
                      {icon(Share03Icon)}
                    </Button>
                  )}
                  {touch ? (
                    <>
                      <AgentAppPanelTrigger />
                      <Button variant="ghost" size="icon-sm" aria-label="More">
                        {icon(MoreHorizontalIcon)}
                      </Button>
                    </>
                  ) : screen === "changes" || screen === "preview" ? (
                    <AgentAppPanelTrigger />
                  ) : (
                    <Button variant="ghost" size="icon-sm" aria-label="More">
                      {icon(MoreHorizontalIcon)}
                    </Button>
                  )}
                </>
              )
            }
          />
          {screen === "new" ? (
            <Dock screen={screen} />
          ) : (
            <>
              {/* At its end, as a conversation opens; one running at its
                  start, as the design draws it, the question in sight. On
                  a phone the other way round: a conversation from its
                  start, a running one at its end, the card that asks above
                  the composer rather than under the fade. */}
              <MessageScrollerProvider
                defaultScrollPosition={
                  (screen === "running") !== phone ? "start" : "end"
                }
              >
                <MessageScroller className="flex-1">
                  <MessageScrollerViewport aria-label="Conversation">
                    <AgentAppColumn
                      render={<MessageScrollerContent className="py-8" />}
                    >
                      {/* Under the page's heading, the title, before the
                          cards' (a changes card's is an h3). */}
                      <h2 className="sr-only">Conversation</h2>
                      {screen === "running" ? (
                        phone ? (
                          <PhoneRunningTurn />
                        ) : (
                          <RunningTurn />
                        )
                      ) : (
                        <>
                          {/* The design's desktop conversation and preview
                              show the answer from its work, the question
                              scrolled above. */}
                          {(screen === "changes" || answer !== "full") && (
                            <MessageScrollerItem messageId="vite:1">
                              <UserMessage>
                                <UserMessageText>
                                  Can you make the build faster and drop the
                                  unused chunks?
                                </UserMessageText>
                              </UserMessage>
                            </MessageScrollerItem>
                          )}
                          <MessageScrollerItem>
                            <Turn screen={screen} answer={answer} />
                          </MessageScrollerItem>
                        </>
                      )}
                    </AgentAppColumn>
                  </MessageScrollerViewport>
                </MessageScroller>
              </MessageScrollerProvider>
              <Dock screen={screen} phone={phone} />
            </>
          )}
        </AgentAppPanels>
      </AgentApp>
    </FoldProvider>
  )
}

/** A finished conversation: its work open, the answer, a diff, sources. */
export const Thread: Story = {
  args: { sidebar: null },
  render: () => <Screen screen="thread" />,
  play: async ({ canvas }) => {
    // The column and the composer line up, 752px wide at most: the 12 columns.
    const column = canvas.getAllByRole("group", { name: "vite.config.ts" })[0]!
    await waitFor(() => expect(column).toBeVisible())
    await expect(column.getBoundingClientRect().width).toBeLessThanOrEqual(752)
    // Add project: a quiet 14px plus, its end on the projects' counts.
    const add = canvas.getByRole("button", { name: "Add project" })
    const plus = add.querySelector("svg")!
    await expect(plus.getBoundingClientRect().width).toBe(14)
    await expect(getComputedStyle(add).color).toBe(
      getComputedStyle(
        canvas.getByText("Projects", { selector: "[data-sidebar=group-label]" })
      ).color
    )
    const count = within(
      add.closest<HTMLElement>("[data-sidebar=group]")!
    ).getByRole("button", { name: /^agent-ui/ }).lastElementChild!
    await expect(plus.getBoundingClientRect().right).toBe(
      count.getBoundingClientRect().right
    )
  },
}

/** A turn that runs and asks first; a warning on the way. */
export const Running: Story = {
  args: { sidebar: null },
  render: () => <Screen screen="running" />,
  play: async ({ canvas }) => {
    // The request's words and the warning's at 13px, their text on one
    // column; the command a grey well, 38px for its line.
    const card = canvas.getByRole("group", { name: "Allow the agent to push?" })
    const description = card.querySelector<HTMLElement>(
      "[data-slot=agent-request-description]"
    )!
    await expect(getComputedStyle(description).fontSize).toBe("13px")
    const command = card.querySelector<HTMLElement>("[data-slot=code-block]")!
    await expect(command.getBoundingClientRect().height).toBe(38)
    const side = document.createElement("div")
    side.style.backgroundColor = "var(--sidebar)"
    card.append(side)
    await expect(getComputedStyle(command).backgroundColor).toBe(
      getComputedStyle(side).backgroundColor
    )
    side.remove()
    const alert = canvas.getByRole("alert")
    const title = alert.querySelector<HTMLElement>("[data-slot=alert-title]")!
    for (const part of [
      title,
      alert.querySelector<HTMLElement>("[data-slot=alert-description]")!,
    ])
      await expect(getComputedStyle(part).fontSize).toBe("13px")
    await expect(
      Math.abs(
        title.getBoundingClientRect().left -
          description.getBoundingClientRect().left
      )
    ).toBeLessThanOrEqual(1)
  },
}

/** A new conversation: what to ask over the composer, in the middle. */
export const NewChat: Story = {
  args: { sidebar: null },
  render: () => <Screen screen="new" />,
  play: async ({ canvasElement }) => {
    // Its context row: pills with no edge, a short line between them,
    // in the middle of their height.
    const row = canvasElement.querySelector("[data-slot=composer-context]")!
    const lines = row.querySelectorAll<HTMLElement>(
      "[data-slot=composer-context-separator]"
    )
    await expect(lines).toHaveLength(2)
    const pill = row.querySelector<HTMLElement>(
      "[data-slot=composer-context-button]"
    )!
    // No ring: its shadows (Tailwind's ring layers) all transparent.
    await expect(
      getComputedStyle(pill)
        .boxShadow.split(/,(?![^(]*\))/)
        .every((shadow) => shadow.trim().startsWith("rgba(0, 0, 0, 0)"))
    ).toBe(true)
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect()
      return box.top + box.height / 2
    }
    for (const line of lines)
      await expect(Math.abs(middle(line) - middle(pill))).toBeLessThan(1)
  },
}

/**
 * The changes beside the conversation: the sidebar folds to the rail
 * for the panel, 600px; its list of files over the diff of the one
 * picked, Discard and Commit at its foot.
 */
export const Changes: Story = {
  args: { sidebar: null },
  render: () => <Screen screen="changes" />,
  play: async ({ canvas, canvasElement }) => {
    // The sidebar closes to the rail for the panel: 600px, or less where
    // the main area would have less than its narrowest, 600px.
    const sidebar = canvasElement.querySelector("[data-slot=sidebar]")!
    await waitFor(() =>
      expect(sidebar).toHaveAttribute("data-state", "collapsed")
    )
    const panel = canvasElement.querySelector("[data-slot=agent-app-panel]")!
    const main = canvasElement.querySelector("#agent-app-main-panel")!
    await waitFor(() =>
      expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(600)
    )
    await waitFor(() =>
      expect(
        Math.round(main.getBoundingClientRect().width)
      ).toBeGreaterThanOrEqual(599)
    )
    // Once the sidebar has slid shut and the panels stand (no motion of
    // theirs, five frames alike): a loaded machine's frames come slow, so
    // two alike are not yet still.
    const still = () =>
      settled(() => Math.round(panel.getBoundingClientRect().width), {
        busy: () => panel.closest("[data-panel-motion]") !== null,
      })
    await still()
    const width = Math.round(panel.getBoundingClientRect().width)
    // The diff as a page of code: its numbers in a 36px column, the code
    // 74px in, on 20px lines.
    const line = panel.querySelector<HTMLElement>(
      "[data-slot=browser-diff] [data-slot=code-block-line]:not([data-diff])"
    )!
    await expect(
      panel.querySelector("[data-slot=diff-touch-header]")
    ).not.toBeVisible()
    await expect(getComputedStyle(line).paddingInlineStart).toBe("74px")
    await expect(getComputedStyle(line, "::before").width).toBe("36px")
    await expect(line.getBoundingClientRect().height).toBe(20)
    // Its list picks the file the diff shows.
    const list = within(panel as HTMLElement)
    await userEvent.click(list.getByRole("button", { name: /package\.json/ }))
    await expect(
      list.getByRole("button", { name: /package\.json/ })
    ).toHaveAttribute("aria-current", "true")
    // Closed, the sidebar opens again.
    await userEvent.click(
      canvas.getByRole("button", { name: "Changes", expanded: true })
    )
    await waitFor(() =>
      expect(sidebar).toHaveAttribute("data-state", "expanded")
    )
    // Once it has slid open.
    const gap = sidebar.querySelector("[data-slot=sidebar-gap]")!
    await waitFor(() => expect(gap.getBoundingClientRect().width).toBe(240))
    // And open, as the screen is drawn: as wide as it first opened.
    await userEvent.click(
      canvas.getByRole("button", { name: "Changes", expanded: false })
    )
    await waitFor(() =>
      expect(sidebar).toHaveAttribute("data-state", "collapsed")
    )
    await waitFor(
      () =>
        expect(
          Math.round(
            canvasElement
              .querySelector("[data-slot=agent-app-panel]")!
              .getBoundingClientRect().width
          )
        ).toBe(width),
      { timeout: 5000 }
    )
    ;(document.activeElement as HTMLElement | null)?.blur()
  },
}

/** The app's page in the browser beside the conversation. */
export const Preview: Story = {
  args: { sidebar: null },
  render: () => <Screen screen="preview" />,
}

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

/**
 * On a phone: 16px text, the header's title over its project; the
 * conversation from its start.
 */
export const Phone: Story = {
  ...viewport("phone", 390, 844),
  args: { sidebar: null },
  render: () => <Screen screen="changes" panel={false} phone />,
  play: async ({ canvas }) => {
    // The phone's type scale.
    await expect(
      getComputedStyle(canvas.getByText(/^Can you make the build faster/))
        .fontSize
    ).toBe("16px")
    // Its toolbar: add, the model, options (permissions and the context
    // folded into its sheet), voice and send.
    const toolbar = canvas
      .getByRole("button", { name: "Options" })
      .closest<HTMLElement>("[data-slot=composer-toolbar]")!
    await expect(
      within(toolbar).getByRole("button", { name: "Options" })
    ).toBeVisible()
    await expect(
      toolbar.querySelector("[data-slot=composer-options-fold]")
    ).not.toBeVisible()
  },
}

/**
 * A new conversation on a phone: the composer at the foot, where the
 * conversation's is, the heading centred over it.
 */
export const PhoneNewChat: Story = {
  ...viewport("phone", 390, 844),
  args: { sidebar: null },
  render: () => <Screen screen="new" phone />,
  play: async ({ canvas, canvasElement }) => {
    const editor = canvas.getByRole("textbox", { name: "Message" })
    const dock = canvasElement.querySelector(
      "[data-slot=agent-app-start] [data-slot=agent-app-dock]"
    )!
    await expect(dock).toContainElement(editor)
    const main = canvasElement
      .querySelector("[data-slot=agent-app-start]")!
      .getBoundingClientRect()
    await expect(
      Math.abs(dock.getBoundingClientRect().bottom - main.bottom)
    ).toBeLessThan(1)
  },
}

/** On a phone, a turn that asks first: the question in thumb's reach. */
export const PhoneRunning: Story = {
  ...viewport("phone", 390, 844),
  args: { sidebar: null },
  render: () => <Screen screen="running" phone />,
  play: async ({ canvasElement }) => {
    // The request ending the work: its edge and shadow not cut off by
    // the work's clip, at its foot as at its sides.
    const card = await waitFor(() =>
      canvasElement.querySelector("[data-slot=agent-request]")!
    )
    let clip = card.parentElement!
    while (getComputedStyle(clip).overflow !== "hidden")
      clip = clip.parentElement!
    const box = clip.getBoundingClientRect()
    const edge = card.getBoundingClientRect()
    await expect(box.bottom - edge.bottom).toBeGreaterThanOrEqual(6)
    await expect(edge.left - box.left).toBeGreaterThanOrEqual(6)
  },
}

/**
 * On a phone, the sidebar: a sheet of projects with their counts, then
 * the current one's conversations, 44px rows of 16px; the app's areas at
 * its foot.
 */
export const PhoneSidebar: Story = {
  ...viewport("phone", 390, 844),
  args: { sidebar: null },
  render: () => <Screen screen="changes" panel={false} phone />,
  play: async ({ canvas }) => {
    await userEvent.click(
      within(canvas.getByRole("banner")).getByRole("button", {
        name: "Toggle Sidebar",
      })
    )
    const sheet = await within(document.body).findByRole("dialog")
    await waitFor(() => expect(sheet.getBoundingClientRect().left).toBe(0))
    await expect(sheet.getBoundingClientRect().width).toBe(390 * 0.8)
    const row = within(sheet).getByRole("button", { name: /^agent-ui/ })
    await expect(row.getBoundingClientRect().height).toBe(44)
    await expect(getComputedStyle(row).fontSize).toBe("16px")
    await expect(row).toHaveTextContent("12")
    await expect(
      within(sheet).getByRole("button", { name: /^Tune the vite build/ })
    ).toHaveAttribute("aria-current", "page")
    ;(document.activeElement as HTMLElement | null)?.blur()
  },
}

/**
 * The panel under a finger: its tabs a segmented control across its bar,
 * 36px tall, at the phone's 15px or the desktop's 13px; its files with
 * their status, their names in the text's colour; its two actions sharing
 * its foot, 44px tall, without the branch.
 */
async function expectTouchPanel(sheet: HTMLElement, phone: boolean) {
  const list = within(sheet).getByRole("tablist")
  const bar = sheet.querySelector<HTMLElement>("[data-slot=viewer-action-bar]")!
  const row = within(sheet).getByRole("button", { name: /package\.json/ })
  const measured = asCoarse(sheet, () => ({
    list: list.getBoundingClientRect().toJSON() as DOMRect,
    actions: list
      .nextElementSibling!.getBoundingClientRect()
      .toJSON() as DOMRect,
    tabs: within(list)
      .getAllByRole("tab")
      .map((tab) => ({
        size: getComputedStyle(tab).fontSize,
        width: tab.getBoundingClientRect().width,
        // A title cut short has a span wider than its box.
        cut: Array.from(tab.querySelectorAll<HTMLElement>(".truncate")).some(
          (title) => title.scrollWidth > title.clientWidth + 1
        ),
      })),
    diff: Array.from(
      sheet.querySelectorAll<HTMLElement>("[data-slot=browser-diff] section")
    ).map((section) => {
      const header = section.querySelector<HTMLElement>(
        "[data-slot=diff-touch-header]"
      )!
      const line = section.querySelector<HTMLElement>(
        "[data-slot=code-block-line]:not([data-diff])"
      )!
      const content = line.querySelector("[data-slot=code-block-line-content]")!
      return {
        header: getComputedStyle(header).display,
        text: header.textContent,
        name: section.getAttribute("aria-label"),
        inset:
          content.getBoundingClientRect().left -
          line.getBoundingClientRect().left,
        hunks: Array.from(section.querySelectorAll("[data-diff=hunk]")).map(
          (hunk) => getComputedStyle(hunk).display
        ),
      }
    }),
    status: getComputedStyle(row.querySelector("[data-slot=diff-file-status]")!)
      .display,
    name: getComputedStyle(row).color,
    branch: getComputedStyle(within(bar).getByText(/^perf\/vite-chunks/))
      .display,
    bar: bar.getBoundingClientRect().toJSON() as DOMRect,
    buttons: within(bar)
      .getAllByRole("button")
      .map((button) => ({
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
        size: getComputedStyle(button).fontSize,
      })),
  }))
  await expect(measured.list.height).toBe(36)
  // On a phone across the bar, up to its buttons; from 640px a browser's
  // tabs, as wide as they may be, never under its buttons.
  if (phone)
    await expect(
      measured.actions.left - measured.list.right
    ).toBeLessThanOrEqual(4)
  else
    await expect(
      measured.actions.left - measured.list.right
    ).toBeGreaterThanOrEqual(0)
  for (const tab of measured.tabs) {
    await expect(tab.size).toBe(phone ? "15px" : "13px")
    await expect(tab.cut).toBe(false)
    // Equal segments across the bar on a phone.
    if (phone)
      await expect(
        Math.abs(tab.width - measured.tabs[0]!.width)
      ).toBeLessThanOrEqual(1)
  }
  for (const diff of measured.diff) {
    await expect(diff.header).toBe("flex")
    await expect(diff.text).toContain(diff.name)
    await expect(diff.text).toContain("Unified")
    await expect(diff.inset).toBe(phone ? 32 : 36)
    for (const hunk of diff.hunks) await expect(hunk).toBe("none")
  }
  await expect(measured.status).not.toBe("none")
  await expect(measured.name).toBe(getComputedStyle(sheet).color)
  await expect(measured.branch).toBe("none")
  const [undo, keep] = measured.buttons
  for (const button of [undo!, keep!]) {
    await expect(button.height).toBe(44)
    await expect(button.size).toBe(phone ? "15px" : "14px")
  }
  // Half the bar each, less its padding and the gap between them.
  await expect(Math.abs(undo!.width - keep!.width)).toBeLessThanOrEqual(1)
  await expect(
    Math.abs(undo!.width + keep!.width + 8 + 24 - measured.bar.width)
  ).toBeLessThanOrEqual(1)
}

/**
 * On a phone, the changes: a sheet from the bottom with the panel's tabs,
 * its files over the diff, and the file's changes undone or all kept.
 */
export const PhoneChanges: Story = {
  ...viewport("phone", 390, 844),
  args: { sidebar: null },
  render: () => <Screen screen="changes" phone panel />,
  play: async () => {
    const sheet = await within(document.body).findByRole("dialog", {
      name: "Changes",
    })
    await waitFor(() => expect(sheet).toBeVisible())
    await expect(
      within(sheet).getByRole("button", { name: "Keep all" })
    ).toBeVisible()
    await expectTouchPanel(sheet, true)
    ;(document.activeElement as HTMLElement | null)?.blur()
  },
}

/**
 * A foldable unfolded, 690px, under a finger: a list and its page beside
 * the rail, the sidebar open at its narrowest and the conversation the
 * rest, wider than `minTouchMainWidth` (344px); the app's areas in the
 * rail, not at the sidebar's foot.
 */
export const Unfolded: Story = {
  ...viewport("unfolded", 690, 880),
  args: { sidebar: null },
  beforeEach: pretend("(pointer: coarse)"),
  render: () => <Screen screen="thread" answer="short" />,
  play: async ({ canvas }) => {
    const main = canvas.getByRole("main", { hidden: true })
    const sidebar = document.querySelector<HTMLElement>(
      "[data-slot=sidebar-container]"
    )!
    await waitFor(() => expect(sidebar).toBeVisible())
    const rail = document.querySelector<HTMLElement>(
      "[data-slot=agent-app-rail]"
    )!
    await expect(rail).toBeVisible()
    await expect(
      within(rail).getByRole("button", { name: "Projects" })
    ).toBeVisible()
    await expect(
      within(sidebar).queryByRole("button", { name: "Projects" })
    ).toBeNull()
    await waitFor(() =>
      expect(
        Math.round(main.getBoundingClientRect().width)
      ).toBeGreaterThanOrEqual(344)
    )
    await expect(sidebar.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      208
    )
    await expect(sidebar.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      rail.getBoundingClientRect().right
    )
    await expect(main.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      sidebar.getBoundingClientRect().right
    )
    await expect(main.getBoundingClientRect().top).toBe(8)
  },
}

/**
 * Unfolded, 850px, under a finger: rows of 40px (44px on a phone); the
 * sidebar's edge a handle to see, a thin line on its line, 24px wide to take
 * hold of. A finger drags it narrower or wider without the page
 * scrolling; a tap on it leaves the sidebar open; Enter still closes it.
 */
export const UnfoldedSidebarEdge: Story = {
  ...viewport("unfolded-wide", 850, 1000),
  args: { sidebar: null },
  beforeEach: pretend("(pointer: coarse)"),
  render: () => <Screen screen="thread" answer="short" />,
  play: async ({ canvas }) => {
    const sidebar = document.querySelector<HTMLElement>(
      "[data-slot=sidebar-container]"
    )!
    await waitFor(() => expect(sidebar).toBeVisible())
    const row = await canvas.findByRole("button", {
      name: /^Tune the vite build/,
      hidden: true,
    })
    const edge = canvas.getByRole("separator", {
      name: "Sidebar width",
      hidden: true,
    })
    const wrapper = document.querySelector<HTMLElement>(
      "[data-slot=agent-app]"
    )!
    const rows = asCoarse(wrapper, () => ({
      row: row.getBoundingClientRect().height,
      edge: edge.getBoundingClientRect().width,
    }))
    await expect(rows.row).toBe(40)
    await expect(rows.edge).toBe(24)
    await expect(getComputedStyle(edge).touchAction).toBe("none")
    const width = () => sidebar.getBoundingClientRect().width
    const from = width()
    const { x, y } = edge.getBoundingClientRect()
    const at = (type: string, clientX: number) =>
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX,
        clientY: y,
        pointerType: "touch",
      })
    // A tap: the sidebar stays open.
    edge.dispatchEvent(at("pointerdown", x))
    window.dispatchEvent(at("pointerup", x))
    edge.click()
    await expect(sidebar.closest("[data-state]")).toHaveAttribute(
      "data-state",
      "expanded"
    )
    // A finger's drag, 24px in.
    edge.dispatchEvent(at("pointerdown", x))
    window.dispatchEvent(at("pointermove", x - 12))
    window.dispatchEvent(at("pointermove", x - 24))
    window.dispatchEvent(at("pointerup", x - 24))
    edge.click()
    await waitFor(() => expect(width()).toBe(from - 24))
    // The keys as before: Enter closes it.
    edge.focus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(sidebar.closest("[data-state]")).toHaveAttribute(
        "data-state",
        "collapsed"
      )
    )
  },
}

/**
 * Unfolded, with `minTouchMainWidth={false}`: the rail, the conversation
 * a card beside it, the sidebar folded. In the desktop's type scale (the
 * phone's is below 640px).
 */
export const UnfoldedFolded: Story = {
  ...viewport("unfolded", 690, 880),
  args: { sidebar: null },
  beforeEach: pretend("(pointer: coarse)"),
  render: () => (
    <Screen screen="thread" answer="short" minTouchMainWidth={false} />
  ),
  play: async ({ canvas }) => {
    const main = canvas.getByRole("main", { hidden: true })
    const rail = document.querySelector("[data-slot=agent-app-rail]")!
    // A card right after the rail, 8px from the other edges.
    await waitFor(() =>
      expect(main.getBoundingClientRect().left).toBe(
        rail.getBoundingClientRect().right
      )
    )
    await expect(main.getBoundingClientRect().top).toBe(8)
    await expect(getComputedStyle(main).borderTopLeftRadius).not.toBe("0px")
    // Under a finger: its first button centred on the header's line, 18px
    // down; its areas 13px under search, past the rule; each an icon of
    // 32px, as on a desktop, in a rail 48px wide.
    const touch = asCoarse(rail as HTMLElement, () => {
      const buttons = rail.querySelectorAll("[data-slot=agent-app-rail-button]")
      const chat = rail.querySelector("[data-slot=agent-app-rail-item]")!
      return {
        first: buttons[0]!.getBoundingClientRect().toJSON() as DOMRect,
        search: buttons[buttons.length - 1]!.getBoundingClientRect().bottom,
        chat: chat.getBoundingClientRect().toJSON() as DOMRect,
        rail: rail.getBoundingClientRect().width,
      }
    })
    const bar = document.querySelector<HTMLElement>(
      "[data-slot=agent-app-header]"
    )!
    const header = asCoarse(bar, () => bar.getBoundingClientRect())
    await expect(touch.first.top).toBe(18)
    await expect(touch.first.top + touch.first.height / 2).toBe(
      header.top + header.height / 2
    )
    await expect(touch.chat.top - touch.search).toBe(13)
    await expect(touch.chat.width).toBe(32)
    await expect(touch.chat.height).toBe(32)
    await expect(touch.rail).toBe(48)
    await expect(
      getComputedStyle(canvas.getByText(/^Can you make the build faster/))
        .fontSize
    ).toBe("16px")
  },
}

/**
 * Unfolded, `railPlacement="sidebar"`, five areas and three buttons of
 * the app's at the sidebar's foot, the sidebar 242px (a conversation of
 * 432px beside it): the areas a row of their own, each 40px or wider,
 * over the buttons, none over another.
 */
export const UnfoldedManyAreas: Story = {
  ...viewport("unfolded", 690, 880),
  args: { sidebar: null },
  beforeEach: pretend("(pointer: coarse)"),
  render: () => (
    <Screen
      screen="thread"
      answer="short"
      many="buttons"
      railPlacement="sidebar"
      minTouchMainWidth={432}
    />
  ),
  play: async () => {
    const bar = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot=agent-app-rail-menu]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    await waitFor(() => expect(bar).toHaveAttribute("data-wrapped"))
    const areas = Array.from(
      bar.querySelectorAll("[data-slot=agent-app-rail-item]"),
      (item) => item.getBoundingClientRect()
    )
    await expect(areas).toHaveLength(5)
    for (const [index, area] of areas.entries()) {
      await expect(area.width).toBeGreaterThanOrEqual(40)
      if (index > 0)
        await expect(area.left).toBeGreaterThanOrEqual(areas[index - 1]!.right)
      await expect(area.top).toBe(areas[0]!.top)
    }
    const buttons = within(bar).getByRole("button", { name: "Theme" })
    await expect(buttons.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      areas[0]!.bottom
    )
  },
}

/**
 * Unfolded, `railPlacement="sidebar"`, five areas and one button of the
 * app's at the sidebar's foot (its others hidden, in a menu): one row, the areas narrower than 40px
 * rather than the button on a row by itself.
 */
export const UnfoldedFooterMenu: Story = {
  ...viewport("unfolded", 690, 880),
  args: { sidebar: null },
  beforeEach: pretend("(pointer: coarse)"),
  render: () => (
    <Screen
      screen="thread"
      answer="short"
      many="menu"
      railPlacement="sidebar"
    />
  ),
  play: async () => {
    const bar = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot=agent-app-rail-menu]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    const more = within(bar).getByRole("button", { name: "More" })
    const areas = Array.from(
      bar.querySelectorAll("[data-slot=agent-app-rail-item]")
    )
    await expect(areas).toHaveLength(5)
    await waitFor(() => expect(bar).not.toHaveAttribute("data-wrapped"))
    const last = areas[4]!.getBoundingClientRect()
    await expect(more.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      last.right
    )
    await expect(more.getBoundingClientRect().top).toBeLessThan(last.bottom)
    for (const area of areas)
      await expect(area.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        32
      )
  },
}

/**
 * As `UnfoldedFooterMenu`, the page's text 125% (a browser's text size):
 * the areas' narrowest is as large, in rem; the button still beside them,
 * or on a row of its own at the end, never wrapped there by itself.
 */
export const UnfoldedFooterMenuLargeText: Story = {
  ...viewport("unfolded-large-text", 838, 945),
  args: { sidebar: null },
  beforeEach: () => {
    const restore = pretend("(pointer: coarse)")()
    const root = document.documentElement.style
    root.fontSize = "125%"
    return () => {
      root.fontSize = ""
      restore()
    }
  },
  render: () => (
    <Screen
      screen="thread"
      answer="short"
      many="menu"
      railPlacement="sidebar"
    />
  ),
  play: async () => {
    const bar = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot=agent-app-rail-menu]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    const more = within(bar).getByRole("button", { name: "More" })
    // As they stand once the larger text has laid them out.
    await waitFor(() => {
      const areas = Array.from(
        bar.querySelectorAll("[data-slot=agent-app-rail-item]"),
        (area) => area.getBoundingClientRect()
      )
      // The areas one row.
      for (const area of areas) expect(area.top).toBe(areas[0]!.top)
      const last = areas[areas.length - 1]!
      const button = more.getBoundingClientRect()
      if (button.top < last.bottom)
        expect(button.left).toBeGreaterThanOrEqual(last.right)
      else {
        // Its own row, at the end.
        expect(bar).toHaveAttribute("data-wrapped")
        expect(button.right).toBeCloseTo(last.right, 0)
      }
    })
  },
}

/**
 * Unfolded and turned, 880px: the changes a card over the conversation,
 * 440px wide, 8px in from the edges, on a flat scrim.
 */
export const UnfoldedLandscape: Story = {
  ...viewport("unfolded-landscape", 880, 664),
  args: { sidebar: null },
  render: () => <Screen screen="thread" answer="short" panel />,
  play: async () => {
    const sheet = await within(document.body).findByRole("dialog", {
      name: "Changes",
    })
    await waitFor(() => expect(sheet).toBeVisible())
    await waitFor(() =>
      expect(sheet.getBoundingClientRect().right).toBe(880 - 8)
    )
    await expect(Math.round(sheet.getBoundingClientRect().width)).toBe(448)
    await expect(Math.round(sheet.getBoundingClientRect().top)).toBe(8)
    await expect(Math.round(sheet.getBoundingClientRect().bottom)).toBe(664 - 8)
    await expect(getComputedStyle(sheet).borderTopLeftRadius).toBe("14px")
    await expect(
      getComputedStyle(document.querySelector("[data-slot=sheet-overlay]")!)
        .backdropFilter
    ).toBe("none")
    await expectTouchPanel(sheet, false)
    ;(document.activeElement as HTMLElement | null)?.blur()
  },
}

/**
 * A tablet: the rail, the sidebar and the conversation; the rail the
 * desktop's, the sidebar with its own new conversation and search.
 */
export const Tablet: Story = {
  ...viewport("tablet", 1024, 640),
  args: { sidebar: null },
  // The browser under test has a mouse: the page told it is a finger's.
  beforeEach: () => {
    const matchMedia = window.matchMedia
    window.matchMedia = (query) =>
      query.includes("pointer: coarse")
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
  render: () => <Screen screen="thread" answer="short" />,
  play: async ({ canvas }) => {
    await canvas.findByRole("main")
    // 28px wider than a mouse's 240.
    await waitFor(() =>
      expect(
        document
          .querySelector<HTMLElement>("[data-slot=agent-app]")!
          .style.getPropertyValue("--sidebar-width")
      ).toBe("268px")
    )
    // The desktop's rail: 48px, its areas alone; the sidebar keeps its
    // new conversation and search, the header its button.
    const rail = document.querySelector<HTMLElement>(
      "[data-slot=agent-app-rail]"
    )!
    await expect(rail.getBoundingClientRect().width).toBe(48)
    await expect(
      document.querySelector("[data-slot=agent-app-rail-controls]")
    ).toBeNull()
    const sidebar = document.querySelector("[data-slot=agent-app-sidebar-bar]")!
    await expect(sidebar.querySelector("button")).not.toBeNull()
    await expect(
      document.querySelector("[data-slot=agent-app-sidebar-search]")
    ).not.toBeNull()
    const header = document.querySelector("[data-slot=agent-app-header]")!
    await expect(header.querySelector("[data-sidebar=trigger]")).not.toBeNull()
    await expect(
      within(header as HTMLElement).getByText("Tune the vite build")
    ).toBeVisible()
  },
}

/**
 * A foldable open as a book: the conversation on the first screen, the
 * changes on the second. Where the browser does not say where its
 * screens are (any engine but Chromium's), at the middle.
 */
export const Book: Story = {
  ...viewport("book", 1102, 694),
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
    // Two 540px screens and a 22px hinge, as drawn.
    Object.defineProperty(window, "viewport", {
      configurable: true,
      value: {
        segments: [new DOMRect(0, 0, 540, 694), new DOMRect(562, 0, 540, 694)],
      },
    })
    return () => {
      window.matchMedia = matchMedia
      Reflect.deleteProperty(window, "viewport")
    }
  },
  render: () => <Screen screen="thread" answer="short" panel />,
  play: async ({ canvas }) => {
    const panel = await canvas.findByRole("complementary", { name: "Changes" })
    const box = (element: Element) => {
      const { left, top, right, bottom, width, height } =
        element.getBoundingClientRect()
      return [left, top, right, bottom, width, height].map(Math.round) as [
        number,
        number,
        number,
        number,
        number,
        number,
      ]
    }
    // The panel a card on the second screen, 8px in from its edges.
    await waitFor(() =>
      expect(box(panel)).toEqual([570, 8, 1094, 686, 524, 678])
    )
    await expect(getComputedStyle(panel).borderTopLeftRadius).toBe("14px")
    // The main area a card on the first, from the rail to 8px short of
    // the hinge: nothing over the fold.
    const rail = document.querySelector("[data-slot=agent-app-rail]")!
    const header = document.querySelector<HTMLElement>(
      "[data-slot=agent-app-header]"
    )!
    const main = header.parentElement!
    await expect(box(main)).toEqual([
      box(rail)[2],
      8,
      532,
      686,
      532 - box(rail)[2],
      678,
    ])
    await expect(getComputedStyle(main).borderTopLeftRadius).toBe("14px")
    await expect(
      document.querySelector("[data-slot=resizable-handle]")
    ).not.toBeVisible()
    await expectTouchPanel(panel, false)
    // Each screen's own: the panel takes no more of the main area's.
    await expect(
      within(panel).queryByRole("button", { name: "Expand" })
    ).not.toBeInTheDocument()
    // The header's toggle pressed while the panel is open, filled.
    const toggle = within(header).getByRole("button", { name: "Changes" })
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await expect(getComputedStyle(toggle).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)"
    )
    // Under a finger: the rail's first button (32px, as a desktop's), the
    // header's and the panel's on one line; theirs 44px, 12px down, 4px
    // from its card's end.
    const coarse = asCoarse(document.body, () => ({
      first: box(rail.querySelector("[data-slot=agent-app-rail-button]")!),
      toggle: box(toggle),
      more: box(within(header).getByRole("button", { name: "More" })),
      close: box(within(panel).getByRole("button", { name: "Close" })),
      main: box(main),
    }))
    await expect(coarse.first[1] + coarse.first[5]! / 2).toBe(12 + 22)
    await expect(coarse.toggle).toEqual([
      coarse.main[2] - 4 - 88,
      12,
      coarse.main[2] - 4 - 44,
      56,
      44,
      44,
    ])
    await expect(coarse.more[2]).toBe(coarse.main[2] - 4)
    await expect(coarse.close).toEqual([1046, 12, 1090, 56, 44, 44])
  },
}

/** The page told a media query matches: e.g. a finger's pointer. */
function pretend(query: string) {
  return () => {
    const matchMedia = window.matchMedia
    window.matchMedia = (media) =>
      media.includes(query)
        ? ({
            matches: true,
            media,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
          } satisfies MediaQueryList)
        : matchMedia.call(window, media)
    return () => {
      window.matchMedia = matchMedia
    }
  }
}

/**
 * The page told it is a foldable's, its two screens and a 22px hinge:
 * side by side (a book) or one over the other (tabletop).
 */
function foldable(posture: "book" | "tabletop", width: number, height: number) {
  return () => {
    const query =
      posture === "book"
        ? "horizontal-viewport-segments: 2"
        : "vertical-viewport-segments: 2"
    const restore = pretend(query)()
    const half = ((posture === "book" ? width : height) - 22) / 2
    Object.defineProperty(window, "viewport", {
      configurable: true,
      value: {
        segments:
          posture === "book"
            ? [
                new DOMRect(0, 0, half, height),
                new DOMRect(half + 22, 0, half, height),
              ]
            : [
                new DOMRect(0, 0, width, half),
                new DOMRect(0, half + 22, width, half),
              ],
      },
    })
    return () => {
      restore()
      Reflect.deleteProperty(window, "viewport")
    }
  }
}

/**
 * Open as a book with no panel, a list and its page: the sidebar the
 * first screen, its rows 8px short of the hinge; the conversation the
 * second's card. Nothing over the hinge, and no button to close the
 * sidebar, which would leave the first screen empty.
 */
export const BookList: Story = {
  ...viewport("book", 1102, 694),
  args: { sidebar: null },
  beforeEach: foldable("book", 1102, 694),
  render: () => <Screen screen="thread" answer="short" />,
  play: async ({ canvas }) => {
    const header = await waitFor(() =>
      document.querySelector<HTMLElement>("[data-slot=agent-app-header]")!
    )
    const main = header.parentElement!
    await waitFor(() =>
      expect(Math.round(main.getBoundingClientRect().left)).toBe(570)
    )
    await expect(Math.round(main.getBoundingClientRect().right)).toBe(1094)
    const sidebar = document.querySelector<HTMLElement>(
      "[data-slot=sidebar-container]"
    )!
    const row = within(sidebar).getByText("Tune the vite build").closest("li")!
    await expect(Math.round(row.getBoundingClientRect().right)).toBe(532)
    await expect(
      canvas.queryByRole("button", { name: "Toggle Sidebar" })
    ).not.toBeInTheDocument()
    await expect(
      document.querySelector("[data-slot=sidebar-rail]")
    ).not.toBeInTheDocument()
  },
}

/**
 * Half open as a laptop: the conversation on the top screen, the
 * composer on the bottom one, 12px under the hinge.
 */
export const Tabletop: Story = {
  ...viewport("tabletop", 880, 690),
  args: { sidebar: null },
  beforeEach: foldable("tabletop", 880, 690),
  render: () => <Screen screen="thread" answer="short" />,
  play: async ({ canvas }) => {
    const conversation = await canvas.findByRole("region", {
      name: "Conversation",
    })
    // The hinge from 334px to 356px.
    await waitFor(() =>
      expect(conversation.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        334
      )
    )
    await expect(
      Math.round(
        document
          .querySelector(
            "[data-slot=agent-app-dock] [data-slot=agent-app-column] > *"
          )!
          .getBoundingClientRect().top
      )
    ).toBe(356 + 12)
  },
}

/** A phone that folds shut, half open: the composer under the hinge. */
export const TabletopPhone: Story = {
  ...viewport("tabletop-phone", 390, 844),
  args: { sidebar: null },
  beforeEach: foldable("tabletop", 390, 844),
  render: () => <Screen screen="changes" panel={false} phone />,
  play: async ({ canvas }) => {
    const conversation = await canvas.findByRole("region", {
      name: "Conversation",
    })
    // The hinge from 411px to 433px.
    await waitFor(() =>
      expect(conversation.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        411
      )
    )
    const dock = document.querySelector(
      "[data-slot=agent-app-dock] [data-slot=agent-app-column] > *"
    )!
    await expect(Math.round(dock.getBoundingClientRect().top)).toBe(433 + 12)
  },
}
