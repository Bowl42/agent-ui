import * as React from "react"
import { onAPhone } from "@/stories/phone"
import {
  ComposerSelect,
  ComposerSelectContent,
  ComposerSelectItem,
  ComposerSelectList,
  ComposerSelectTrigger,
  ComposerSelectValue,
} from "@/components/composer-select"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AtIcon,
  BrainIcon,
  CloudIcon,
  Cancel01Icon,
  CodeIcon,
  File01Icon,
  HelpCircleIcon,
  LaptopIcon,
  Message01Icon,
  ArrowUpDoubleIcon,
  ArrowDown01Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"
import {
  expect,
  fireEvent,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from "storybook/test"

import {
  Composer,
  ComposerAttachments,
  ComposerEditor,
  ComposerOptionsFold,
  ComposerSuggestions,
  ComposerTakeover,
  type ComposerAttachment,
  type ComposerAttachmentState,
  type ComposerSuggestion,
  type ComposerStatus,
  type ComposerValue,
} from "@/components/composer"
import {
  ComposerContext,
  ComposerContextButton,
  type AppProject,
} from "@/components/agent-app/project-picker"
import {
  AgentRequest,
  AgentRequestContent,
  AgentRequestFooter,
  AgentRequestHeader,
  AgentRequestTitle,
} from "@/components/agent-request"
import { ComposerQueue } from "@/components/composer-queue"
import { FullToolbar } from "@/stories/composer-tools"
import { coarseHitSize, coarseLength } from "@/stories/touch"
import { rendered } from "@/stories/wait"
import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNavigation,
  QuestionnaireProgress,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"

// The composer in each state of the design, with the design's content:
// a toolbar of add, permissions, model and effort, context, voice and
// send.

const icon = (glyph: typeof AtIcon) => (
  <HugeiconsIcon icon={glyph} strokeWidth={2} />
)

/** What "@" finds, by kind; the app matches loosely and marks the hits. */
const mentionables: ComposerSuggestion[] = [
  {
    id: "vite.config.ts",
    label: "vite.config.ts",
    detail: "./",
    group: "Files",
    icon: icon(File01Icon),
    highlight: [0, 1, 5],
  },
  {
    id: "vitest.config.ts",
    label: "vitest.config.ts",
    detail: "./",
    group: "Files",
    icon: icon(File01Icon),
    highlight: [0, 1, 7],
  },
  {
    id: "theme.css",
    label: "theme.css",
    detail: "src/styles/",
    group: "Files",
    icon: icon(File01Icon),
    highlight: [3, 4, 8],
  },
  {
    id: "conversation:vite",
    label: "Tune the vite build",
    detail: "now",
    group: "Conversations",
    icon: icon(Message01Icon),
    highlight: [9, 10],
  },
  {
    id: "agent:visual",
    label: "Visual reviewer",
    detail: "agent",
    group: "Agents",
    icon: icon(BrainIcon),
    highlight: [0, 1],
  },
]

const commands: ComposerSuggestion[] = [
  {
    id: "compact",
    label: "compact",
    description: "Summarise the conversation to free context",
    detail: "38%",
    icon: icon(CodeIcon),
    execute: true,
  },
  {
    id: "model",
    label: "model",
    description: "Switch the model or effort",
    icon: icon(BrainIcon),
  },
  {
    id: "send",
    label: "send",
    description: "Send this to another conversation…",
    icon: icon(ArrowUpDoubleIcon),
  },
  {
    id: "clear",
    label: "clear",
    description: "Start over in a new conversation",
    icon: icon(Cancel01Icon),
    execute: true,
  },
]

const projects: AppProject[] = [
  { id: "agent-ui", path: "~/src/agent-ui" },
  { id: "docs", path: "~/src/docs" },
]

/** Sent before, the latest first. */
const sent: ComposerValue[] = [
  ["Bump the version in package.json."],
  ["Run the checks, tag v0.1.9 and push it."],
  ...Array.from({ length: 12 }, (_, index) => [`Earlier message ${index + 1}`]),
]

type DemoProps = {
  onSubmit: (value: ComposerValue) => void
  onRetry: () => void
  onCancelEdit: () => void
  onSaveSecret: () => void
  onOpenAttachment: (attachment: ComposerAttachment) => void
  initial?: ComposerValue
  placeholder?: string
  status?: ComposerStatus
  /** A new conversation: its project, environment and agent over the text. */
  newChat?: boolean
  queue?: boolean
  editing?: boolean
  error?: string
  /** Files in a row over the text, with their uploads' state. */
  uploads?: Record<string, ComposerAttachmentState>
  reason?: string
  secrets?: boolean
  completes?: boolean
  dropDetail?: boolean
  /** A phone folds permissions and usage into the options sheet. */
  options?: boolean
}

function Demo({
  onSubmit,
  onRetry,
  onCancelEdit,
  onSaveSecret,
  onOpenAttachment,
  initial = [],
  placeholder = "Ask anything",
  status = "ready",
  newChat = false,
  queue = false,
  editing = false,
  error,
  uploads,
  reason,
  secrets = false,
  completes = false,
  dropDetail = false,
  options = true,
}: DemoProps) {
  const [value, setValue] = React.useState(initial)
  const [project, setProject] = React.useState<string | null>("agent-ui")
  const [query, setQuery] = React.useState<string | null>(null)
  const [commandQuery, setCommandQuery] = React.useState<string | null>(null)

  return (
    <div
      data-testid="stage"
      className="flex w-185 max-w-full flex-col items-center justify-end px-9 pt-80 pb-9 max-md:px-3 max-md:pb-3.5"
    >
      {queue ? (
        <ComposerQueue
          items={[
            { id: "1", text: "Also bump the changelog date" },
            {
              id: "2",
              text: "Then open a PR against main with the release notes",
            },
          ]}
          onEdit={fn()}
          onSendNow={fn()}
          onRemove={fn()}
          onReorder={fn()}
          labels={{ queuedDetail: "sent when this turn ends" }}
        />
      ) : null}
      <Composer
        value={value}
        onValueChange={setValue}
        status={status}
        submitDisabled={!!reason}
        editing={editing}
        onCancelEdit={onCancelEdit}
        error={error}
        onRetry={onRetry}
        history={sent}
        labels={
          dropDetail
            ? { dropDetail: "Files from the workspace are added as references" }
            : undefined
        }
        onAddFiles={() => []}
        renderMention={(mention) => (
          <>
            {icon(mention.trigger === "$" ? SecurityCheckIcon : File01Icon)}
            <span className="truncate">{mention.label}</span>
          </>
        )}
        attachmentState={(attachment) => uploads?.[attachment.id]}
        onOpenAttachment={onOpenAttachment}
        {...(secrets
          ? {
              detectSecret: (text: string) => {
                const found = /sk_live_\S+/.exec(text)
                return found ? { text: found[0], name: "STRIPE_KEY" } : null
              },
              onSaveSecret: () => {
                onSaveSecret()
                return [
                  {
                    type: "mention" as const,
                    trigger: "$",
                    id: "STRIPE_KEY",
                    label: "STRIPE_KEY",
                  },
                ]
              },
            }
          : {})}
        {...(completes
          ? {
              complete: async () => " list the breaking changes first",
            }
          : {})}
        onSubmit={(message) => {
          onSubmit(message)
          setValue([])
        }}
      >
        {newChat ? (
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
              {icon(BrainIcon)}
              Coder
              {icon(ArrowDown01Icon)}
            </ComposerContextButton>
          </ComposerContext>
        ) : null}
        <ComposerSuggestions
          trigger="@"
          label="Mentions"
          items={query === null || query === "" ? [] : mentionables}
          total={1204}
          onQueryChange={setQuery}
        />
        <ComposerSuggestions
          trigger="/"
          label="Commands"
          items={commands.filter((command) =>
            command.label.startsWith(commandQuery ?? "")
          )}
          hints={[
            { keys: ["↵"], label: "run" },
            { keys: ["tab"], label: "complete" },
          ]}
          onQueryChange={setCommandQuery}
          className="w-105"
        />
        {uploads ? <ComposerAttachments placement="row" /> : null}
        <ComposerEditor aria-label="Message" placeholder={placeholder} />
        <FullToolbar reason={reason} options={options} />
      </Composer>
    </div>
  )
}

const meta = {
  title: "Components/Composer States",
  component: Demo,
  args: {
    onSubmit: fn(),
    onRetry: fn(),
    onCancelEdit: fn(),
    onSaveSecret: fn(),
    onOpenAttachment: fn(),
  },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

const editorOf = (canvas: { getByRole: typeof screen.getByRole }) =>
  canvas.getByRole("textbox", { name: "Message" })

/** Puts the caret at the editor's end, once the editor has taken it. */
async function caretAtEnd(editor: HTMLElement) {
  const changed = new Promise((resolve) =>
    document.addEventListener("selectionchange", resolve, { once: true })
  )
  getSelection()!.selectAllChildren(editor)
  getSelection()!.collapseToEnd()
  await changed
  await rendered()
}

/** 1 · Empty: a line of hint, the whole toolbar, send greyed. */
export const Idle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Send" })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    await expect(
      canvas.getByRole("button", { name: "Permissions: Ask first" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
    ).toBeVisible()
  },
}

/** 2 · A new conversation: its project, environment and agent over the text. */
export const NewChat: Story = {
  args: { newChat: true, placeholder: "What should we work on?" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("combobox", { name: "Project: agent-ui" })
    ).toBeVisible()
    // A pill's icon 14px, a grey lighter than its value; its chevron 12px.
    const pill = canvas.getByRole("button", { name: "Runs on Local" })
    const [icon, chevron] = [
      pill.querySelector("svg")!,
      pill.querySelector("svg:last-child")!,
    ]
    await expect(icon.getBoundingClientRect().width).toBe(14)
    await expect(chevron.getBoundingClientRect().width).toBe(12)
    await expect(getComputedStyle(icon).color).not.toBe(
      getComputedStyle(pill).color
    )
  },
}

/** 3 · The add menu: files, photos, a screenshot, the workspace, triggers. */
export const AddMenu: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add" }))
    const menu = await screen.findByRole("menu")
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: /Upload files/ })
      ).toBeVisible()
    )
    // 256px; 4px either side of the rule between its groups.
    // (Once it has zoomed in.)
    await waitFor(() => expect(menu.getBoundingClientRect().width).toBe(256))
    const rule = menu.querySelector<HTMLElement>(
      "[data-slot=dropdown-menu-separator]"
    )!
    await expect(getComputedStyle(rule).marginTop).toBe("4px")
    await expect(getComputedStyle(rule).marginBottom).toBe("4px")
  },
}

/** 4 · A mention: what matches the query, by kind. */
export const Mention: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(editorOf(canvas))
    await userEvent.keyboard("Compare the chunks in @vic")
    const list = await screen.findByRole("listbox")
    await expect(list).toBeVisible()
    // 32px rows; 44px to a finger.
    const option = within(list).getAllByRole("option")[0]!
    await expect(option.getBoundingClientRect().height).toBe(32)
    await expect(coarseLength(option, "min-height")).toBe(44)
  },
}

/** 5 · Commands, at the start of a line, with what each does. */
export const Commands: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(editorOf(canvas))
    await userEvent.keyboard("/")
    const list = await screen.findByRole("listbox")
    await expect(list).toBeVisible()
    const detail = within(list).getByText("38%")
    await waitFor(() => {
      expect(getComputedStyle(detail).lineHeight).toBe("20px")
      expect(detail.getBoundingClientRect().height).toBe(20)
    })
  },
}

/** A picture for an image's thumbnail. */
const screenshot = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f5"/><stop offset="1" stop-color="#d4d4d8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>'
)}`

/**
 * 6 · Uploads: sending waits for them, and says why. Files over the text
 * are image tiles or file cards, with upload progress over the image
 * or icon; a failed one's edge is dashed.
 */
export const Attachments: Story = {
  args: {
    uploads: {
      "checkout.png": { progress: 0.64 },
      "recording.mov": { error: "64 MB · over the 50 MB limit" },
    },
    reason: "Waiting for 1 upload",
    initial: [
      {
        type: "attachment",
        id: "checkout.png",
        name: "checkout.png",
        mediaType: "image/png",
        preview: screenshot,
      },
      {
        type: "attachment",
        id: "pasted",
        name: "Pasted text",
        mediaType: "text/plain",
        detail: "214 lines · click to edit",
      },
      {
        type: "attachment",
        id: "recording.mov",
        name: "recording.mov",
        mediaType: "video/quicktime",
      },
      "Why does ",
      {
        type: "mention",
        trigger: "@",
        id: "checkout.tsx",
        label: "checkout.tsx",
      },
      " re-render here? See ",
      {
        type: "link",
        url: "https://github.com/acme/web/issues/412",
        title: "github.com/…/issues/412",
      },
    ],
  },
  play: async ({ args, canvas, canvasElement }) => {
    const send = canvas.getByRole("button", { name: "Send" })
    await expect(send).toHaveAttribute("aria-disabled", "true")
    await expect(send).toHaveAccessibleDescription("Waiting for 1 upload")

    const tray = canvasElement.querySelector<HTMLElement>(
      "[data-slot=composer-attachments]"
    )!
    const cards = Array.from(
      tray.querySelectorAll<HTMLElement>("[data-slot=composer-attachment-card]")
    )
    await expect(cards).toHaveLength(2)
    const box = (element: Element) => element.getBoundingClientRect()
    const slot = (card: HTMLElement, name: string) =>
      card.querySelector<HTMLElement>(`[data-slot=composer-attachment-${name}]`)
    const upload = tray.querySelector<HTMLElement>(
      "[data-slot=composer-attachment-tile-item]"
    )!
    await expect([box(upload).width, box(upload).height]).toEqual([64, 64])
    await expect(Math.round(box(upload).top - box(tray).top)).toBe(12)
    // File cards stay 44px, 8px apart, 12px from the box's edge.
    await expect(Math.round(box(cards[0]!).left - box(tray).left)).toBe(12)
    await expect(Math.round(box(cards[1]!).left - box(cards[0]!).right)).toBe(8)
    for (const card of cards) {
      await expect(box(card).height).toBe(44)
      await expect(getComputedStyle(card).borderTopLeftRadius).toBe("10px")
      // A 32px tile, 4px in from the edge (inside its hairline), centred.
      const tile = box(slot(card, "tile")!)
      await expect([tile.width, tile.height]).toEqual([32, 32])
      await expect(tile.left - box(card).left).toBe(5)
      await expect(tile.top - box(card).top).toBe(6)
      // The name over its state, two 16px lines, 8px after the tile.
      const name = box(slot(card, "name")!)
      const status = box(slot(card, "status")!)
      // Firefox lays the words out at a fraction of a pixel.
      await expect(Math.round(name.left - tile.right)).toBe(8)
      await expect([name.top, name.height]).toEqual([tile.top, 16])
      await expect([status.bottom, status.height]).toEqual([tile.bottom, 16])
    }
    const [pasted, failed] = cards as [HTMLElement, HTMLElement]
    await expect(
      within(upload).getByRole("button", { name: "checkout.png" })
    ).toHaveAccessibleDescription("Uploading · 64%")
    await expect(slot(pasted, "status")).toHaveTextContent(
      "214 lines · click to edit"
    )
    await expect(slot(failed, "status")).toHaveTextContent(
      "64 MB · over the 50 MB limit"
    )
    // The name whole, not cut short by the error.
    const failedName = slot(failed, "name")!
    await expect(failedName.scrollWidth).toBe(failedName.clientWidth)
    // The upload's progress over its picture; a failed file's edge dashed.
    await expect(slot(upload, "progress")).not.toBeNull()
    await expect(upload.querySelector("img")).not.toBeNull()
    await expect(getComputedStyle(failed).borderTopStyle).toBe("dashed")
    await expect(getComputedStyle(pasted).borderTopStyle).toBe("solid")

    // A round 18px × on the corner, 7px past its hairline: shown
    // on every card at rest.
    for (const card of cards) {
      const remove = within(card).getByRole("button", { name: /^Remove / })
      const x = box(remove)
      await expect([x.width, x.height]).toEqual([20, 20])
      await expect(Math.round(x.right - box(card).right)).toBe(7)
      await expect(Math.round(box(card).top - x.top)).toBe(7)
      await expect(getComputedStyle(remove).opacity).toBe("1")
      await expect(getComputedStyle(remove).visibility).toBe("visible")
    }
    const remove = within(pasted).getByRole("button", {
      name: "Remove Pasted text",
    })
    const hit = coarseHitSize(remove)
    await expect(Math.min(hit.width, hit.height)).toBeGreaterThanOrEqual(40)

    // The chips in the text are 24px. A file's name is 500, as a link's
    // title; a link titled with its address has no host after it. In dark, a chip is recessed: the
    // page's colour in the lighter field.
    const editor = canvas.getByRole("textbox", { name: "Message" })
    const inline = Array.from(
      editor.querySelectorAll<HTMLElement>("[data-slot=composer-chip]")
    )
    await expect(inline).toHaveLength(2)
    const [file, link] = inline as [HTMLElement, HTMLElement]
    await expect(box(file).height).toBe(24)
    await expect(getComputedStyle(file).fontWeight).toBe("500")
    await expect(link).toHaveTextContent(/^github\.com\/…\/issues\/412$/)
    await expect(link.querySelector("[data-slot=chip-detail]")).toBeNull()
    const fill = (element: Element) => getComputedStyle(element).backgroundColor
    await expect(fill(file)).not.toBe(
      fill(canvasElement.querySelector("[data-slot=composer]")!)
    )
    if (document.documentElement.classList.contains("dark"))
      await expect(fill(file)).toBe(fill(document.body))

    const open = within(pasted).getByRole("button", { name: /^Pasted text/ })
    await userEvent.click(open)
    await expect(args.onOpenAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pasted" })
    )
  },
}

/**
 * An upload the app cannot tell how far along it is (`progress: null`):
 * a turning quarter ring, and "Uploading" with no percent.
 */
export const AttachmentUploadingUnknown: Story = {
  args: {
    uploads: { "notes.txt": { progress: null } },
    reason: "Waiting for 1 upload",
    initial: [
      {
        type: "attachment",
        id: "notes.txt",
        name: "notes.txt",
        mediaType: "text/plain",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(
      "[data-slot=composer-attachment-card]"
    )!
    await expect(card).toHaveAttribute("data-state", "uploading")
    await expect(
      card.querySelector("[data-slot=composer-attachment-status]")
    ).toHaveTextContent(/^Uploading$/)
    const ring = card.querySelector("[data-slot=composer-attachment-progress]")!
    await expect(ring).toHaveAttribute("data-indeterminate")
    await expect(ring).toHaveClass("animate-spin")
  },
}

/** 7 · Running: the queue tucked over it; stop, and send to queue. */
export const RunningQueue: Story = {
  args: {
    status: "running",
    queue: true,
    initial: ["And tag it once CI is green"],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Stop" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Send" })).toBeVisible()
    // When they go, after the count, not in the shelf's name.
    const shelf = canvas.getByRole("region", { name: "2 queued" })
    await expect(
      shelf.querySelector("[data-slot=composer-queue-header]")
    ).toHaveTextContent("2 queued · sent when this turn ends")
  },
}

/** 8 · Editing a sent message: a bar says so, ✓ saves, Escape cancels. */
export const Editing: Story = {
  args: {
    editing: true,
    initial: [
      "Can you make the build faster and drop the unused chunks? Keep lodash for now.",
    ],
  },
  play: async ({ canvas }) => {
    // The shelf fades in.
    await waitFor(() =>
      expect(canvas.getByText("Editing your message")).toBeVisible()
    )
    await expect(canvas.getByRole("button", { name: "Save" })).toBeVisible()
  },
}

/** Escape, or Cancel, puts the edit away. */
export const EditingCancel: Story = {
  tags: ["!autodocs"],
  args: Editing.args,
  play: async ({ args, canvas }) => {
    await userEvent.click(editorOf(canvas))
    await userEvent.keyboard("{Escape}")
    await expect(args.onCancelEdit).toHaveBeenCalled()
  },
}

/** 9 · The model and its effort. */
export const ModelEffort: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
    )
    const popup = await screen.findByRole("dialog", { name: "Model" })
    await waitFor(() => expect(popup).toBeVisible())
  },
}

/** 10 · Permissions: discuss, ask first, auto. */
export const Permissions: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Permissions: Ask first" })
    )
    const list = await screen.findByRole("listbox", { name: "Permissions" })
    await waitFor(() => expect(list).toBeVisible())
    await expect(
      within(list).getByRole("option", { name: /^Ask first/ })
    ).toHaveAttribute("aria-selected", "true")
  },
}

/** Choosing a mode closes the list; the trigger says it. */
export const PermissionsChoose: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Permissions: Ask first" })
    )
    const list = await screen.findByRole("listbox", { name: "Permissions" })
    await userEvent.click(
      within(list).getByRole("option", { name: /^Full access/ })
    )
    // A mode that does not ask, chosen, is marked as such.
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Permissions: Full access" })
      ).toHaveAttribute("data-tone", "destructive")
    )
  },
}

/** 11 · Context and cost, with a way to compact. */
export const ContextCost: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Context/ }))
    const compact = await screen.findByRole("button", { name: "Compact now" })
    await waitFor(() => expect(compact).toBeVisible())
    // Its end where the send column starts, not at the meter's end.
    const popup = compact.closest("[data-side]")!
    const send = canvas.getByRole("button", { name: "Send" })
    await waitFor(() =>
      expect(popup.getBoundingClientRect().right).toBe(
        send.getBoundingClientRect().left
      )
    )
  },
}

/** 12 · Voice: the time and a waveform; Done puts the words in the box. */
export const Voice: Story = {
  play: async ({ canvas, step }) => {
    await step("records", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Voice input" }))
      await expect(
        await canvas.findByRole("status", { name: "Recording 0:07" })
      ).toBeVisible()
      const done = canvas.getByRole("button", { name: "Done" })
      await expect(done).toHaveFocus()
      // Cancel 12px before it.
      const cancel = canvas.getByRole("button", { name: "Cancel" })
      await expect(
        Math.round(
          done.getBoundingClientRect().left -
            cancel.getBoundingClientRect().right
        )
      ).toBe(12)
    })
  },
}

/** Done: the transcript goes in the box, to edit before sending. */
export const VoiceDone: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Voice input" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Done" }))
    await waitFor(() =>
      expect(editorOf(canvas)).toHaveTextContent("Tag it once CI is green")
    )
    await userEvent.click(canvas.getByRole("button", { name: "Voice input" }))
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Voice input" })).toBeVisible()
    )
  },
}

/** 13 · History: Up on an empty box recalls what was sent. */
export const History: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(editorOf(canvas))
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() =>
      expect(editorOf(canvas)).toHaveTextContent("Bump the version")
    )
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() =>
      expect(editorOf(canvas)).toHaveTextContent(
        "Run the checks, tag v0.1.9 and push it."
      )
    )
    await expect(
      canvas.getByText("2 of 14 sent · ↓ newer · esc back to draft")
    ).toBeVisible()
  },
}

/** Escape goes back to the draft; an edit keeps what was recalled. */
export const HistoryBack: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas }) => {
    await userEvent.click(editorOf(canvas))
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowDown}")
    await waitFor(() =>
      expect(editorOf(canvas)).toHaveTextContent("Bump the version")
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(editorOf(canvas)).toHaveTextContent(""))
    await userEvent.keyboard("{ArrowUp}!")
    await waitFor(() => expect(canvas.queryByText(/of 14 sent/)).toBeNull())
    await expect(editorOf(canvas)).toHaveTextContent("package.json.!")
  },
}

/** 14 · A pasted secret: save it as a named secret, or keep it. */
export const SecretDetected: Story = {
  args: {
    secrets: true,
    initial: ["Use this key for the webhook test: sk_live_51N…Qx"],
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByText("That looks like an API key.")).toBeVisible()
    )
    // The secret stands out in the text, as code.
    await waitFor(() =>
      expect(editorOf(canvas).querySelector("code")).toHaveTextContent(
        "sk_live_51N…Qx"
      )
    )
    const save = canvas.getByRole("button", { name: "Save as $STRIPE_KEY" })
    await expect(save).toBeVisible()
    // Free space is shared evenly on either side of the lesser choice.
    const bar = save.closest("[data-slot=composer-shelf-bar]")!
    const words = canvas
      .getByText("That looks like an API key.")
      .getBoundingClientRect()
    const keep = canvas.getByRole("button", { name: "Keep as text" })
    await waitFor(() => {
      const choice = keep.parentElement!.getBoundingClientRect()
      const actions = save.parentElement!.getBoundingClientRect()
      const before = choice.left - words.right
      const after = actions.left - choice.right
      expect(Math.abs(before - after)).toBeLessThanOrEqual(1)
    })
    await expect(
      Math.round(
        bar.getBoundingClientRect().right - save.getBoundingClientRect().right
      )
    ).toBe(4)
  },
}

/** Saving it puts the app's reference in the secret's place. */
export const SecretSaved: Story = {
  tags: ["!autodocs"],
  args: SecretDetected.args,
  play: async ({ args, canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Save as $STRIPE_KEY" })
    )
    await expect(args.onSaveSecret).toHaveBeenCalled()
    await waitFor(() =>
      expect(editorOf(canvas)).not.toHaveTextContent("sk_live")
    )
    await expect(canvas.queryByText("That looks like an API key.")).toBeNull()
  },
}

/** 16 · It could not send: why, under the box, and Retry. */
export const CouldNotSend: Story = {
  args: {
    error: "Couldn't reach the server. Your message is back in the box.",
    initial: ["Run the checks, tag v0.1.9 and push it."],
  },
  play: async ({ canvas }) => {
    await expect(editorOf(canvas)).toHaveAccessibleDescription(
      "Couldn't reach the server. Your message is back in the box."
    )
  },
}

/** Retry is the app's: it sends the message again. */
export const CouldNotSendRetry: Story = {
  tags: ["!autodocs"],
  args: CouldNotSend.args,
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }))
    await expect(args.onRetry).toHaveBeenCalled()
  },
}

/** 17 · A file dragged over it. */
export const Drop: Story = {
  args: { dropDetail: true },
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector("form")!
    const data = new DataTransfer()
    data.items.add(new File(["…"], "notes.txt", { type: "text/plain" }))
    fireEvent(
      form,
      new DragEvent("dragenter", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      })
    )
    const title = await within(canvasElement).findByText("Drop to attach")
    await expect(title).toBeVisible()
    // 96px tall, its icon, title (13px) and detail at 15, 37 and 61.
    const target = title.parentElement!
    const box = target.getBoundingClientRect()
    await expect(box.height).toBe(96)
    const top = (element: Element) =>
      element.getBoundingClientRect().top - box.top
    const [icon, , detail] = [...target.children]
    await expect([top(icon!), top(title), top(detail!)]).toEqual([14, 38, 62])
    await expect(getComputedStyle(title).fontSize).toBe("13px")
  },
}

/** An ending suggested after the caret: Tab takes it. */
export const InlineCompletion: Story = {
  args: {
    completes: true,
    initial: ["Write the release notes for v0.1.9 an"],
  },
  play: async ({ canvas, canvasElement }) => {
    const editor = editorOf(canvas)
    await userEvent.click(editor)
    await caretAtEnd(editor)
    await userEvent.keyboard("d")
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=composer-completion]")
      ).toHaveTextContent("list the breaking changes first")
    )
  },
}

/** Tab takes the ending; it is part of the message only then. */
export const InlineCompletionTab: Story = {
  tags: ["!autodocs"],
  args: InlineCompletion.args,
  play: async ({ args, canvas, canvasElement }) => {
    const editor = editorOf(canvas)
    await userEvent.click(editor)
    await caretAtEnd(editor)
    await userEvent.keyboard("d")
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=composer-completion]")
      ).not.toBeNull()
    )
    await userEvent.keyboard("{Tab}")
    await expect(editor).toHaveTextContent(
      "Write the release notes for v0.1.9 and list the breaking changes first"
    )
    await userEvent.keyboard("{Enter}")
    await expect(args.onSubmit).toHaveBeenCalledWith([
      "Write the release notes for v0.1.9 and list the breaking changes first",
    ])
  },
}

const phone = {
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
}

/**
 * 18 · A phone: 16px text, larger targets; permissions and the context
 * meter folded into the options button (⚙), the model its name only.
 */
export const Phone: Story = {
  ...phone,
  args: { options: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Options" })).toBeVisible()
    await expect(
      canvas.queryByRole("button", { name: "Permissions: Ask first" })
    ).toBeNull()
    await expect(canvas.queryByRole("button", { name: /^Context/ })).toBeNull()
  },
}

/** The options sheet: a row a setting, its value; a row opens its picker. */
export const PhoneOptions: Story = {
  ...phone,
  args: { options: true },
  play: async ({ canvas, step }) => {
    await step("opens the sheet", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Options" }))
      const sheet = await screen.findByRole("dialog", { name: "Options" })
      await waitFor(() => expect(sheet).toBeVisible())
      await expect(
        within(sheet).getByRole("button", { name: /^Permissions/ })
      ).toHaveTextContent("PermissionsAsk first")
      // A handle at its top to swipe it away by.
      await expect(
        sheet.querySelector("[data-slot=drawer-swipe-handle]")
      ).toBeVisible()
    })
  },
}

/** A row of the sheet opens its picker in its place. */
export const PhoneOptionsPermissions: Story = {
  ...phone,
  tags: ["!autodocs"],
  args: { options: true },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Options" }))
    const sheet = await screen.findByRole("dialog", { name: "Options" })
    await userEvent.click(
      within(sheet).getByRole("button", { name: /^Permissions/ })
    )
    const list = await screen.findByRole("listbox", { name: "Permissions" })
    await waitFor(() => expect(list).toBeVisible())
  },
}

/**
 * A narrow composer in a wide window, as beside the sidebar on an
 * unfolded foldable: the toolbar folds by its own width, not the
 * window's; a folded picker opens from the options button, above the
 * composer, not from the corner of the page.
 */
export const Narrow: Story = {
  tags: ["!autodocs"],
  args: { options: true },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const options = canvas.getByRole("button", { name: "Options" })
    await expect(options).toBeVisible()
    await expect(
      canvas.queryByRole("button", { name: "Permissions: Ask first" })
    ).toBeNull()
    // Desktop sizes: the phone's go by the window.
    await expect(options.getBoundingClientRect().height).toBe(28)

    await userEvent.click(options)
    const sheet = await screen.findByRole("dialog", { name: "Options" })
    await userEvent.click(
      within(sheet).getByRole("button", { name: /^Permissions/ })
    )
    const list = await screen.findByRole("listbox", { name: "Permissions" })
    await waitFor(() => expect(list).toBeVisible())
    const composer = canvasElement
      .querySelector("[data-slot=input-group]")!
      .getBoundingClientRect()
    const popup = () => list.closest("[data-side]")!.getBoundingClientRect()
    await waitFor(() =>
      expect(Math.round(popup().bottom)).toBe(Math.round(composer.top - 8))
    )
    // By the options button, at the composer's end.
    await expect(popup().right).toBeGreaterThan(
      composer.left + composer.width / 2
    )
  },
}

/** A composer as wide as `width`, waiting on an upload, for `Narrowing`. */
function NarrowingRow({ width }: { width: number }) {
  const [value, setValue] = React.useState<ComposerValue>([
    "Also bump the changelog date",
  ])
  return (
    <div data-width={width} style={{ width }}>
      <Composer value={value} onValueChange={setValue} submitDisabled>
        <ComposerEditor aria-label={`Message ${width}`} />
        <FullToolbar reason="Waiting for 1 upload" options />
      </Composer>
    </div>
  )
}

/**
 * The toolbar gives up room by its own width, in steps: at 560 the hint
 * goes; at 440 permissions are an icon and the meter only its bar, the
 * model still "· High"; at 360 they fold into the options button, the
 * model its name only.
 */
export const Narrowing: Story = {
  tags: ["!autodocs"],
  render: () => (
    <div className="flex flex-col items-start gap-6 p-6">
      {[760, 560, 440, 360].map((width) => (
        <NarrowingRow key={width} width={width} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const at = (width: number) => {
      const row = canvasElement.querySelector<HTMLElement>(
        `[data-width="${width}"]`
      )!
      const shown = (selector: string) => {
        const element = row.querySelector<HTMLElement>(selector)
        return !!element && element.getBoundingClientRect().width > 0
      }
      const effort = [
        ...within(row)
          .getByRole("button", { name: /^Model:/ })
          .querySelectorAll("span"),
      ].find((span) => span.textContent === "· High")!
      return {
        hint: shown("[data-slot=composer-submit-reason]"),
        mode: shown(
          "[data-slot=composer-mode-picker] [data-slot=composer-select-value]"
        ),
        modeIcon: shown("[data-slot=composer-mode-picker]"),
        meterValue: shown("[data-slot=usage-meter-value]"),
        meter: shown("[data-slot=usage-meter-breakdown]"),
        options: shown("[data-slot=composer-options]"),
        effort: effort.getBoundingClientRect().width > 0,
      }
    }
    const full = {
      hint: true,
      mode: true,
      modeIcon: true,
      meterValue: true,
      meter: true,
      options: false,
      effort: true,
    }
    await expect(at(760)).toEqual(full)
    await expect(at(560)).toEqual({ ...full, hint: false })
    await expect(at(440)).toEqual({
      ...full,
      hint: false,
      mode: false,
      meterValue: false,
    })
    await expect(at(360)).toEqual({
      hint: false,
      mode: false,
      modeIcon: false,
      meterValue: false,
      meter: false,
      options: true,
      effort: false,
    })
  },
}

/** An app's own picker in the toolbar: which account the model runs on. */
function AccountPicker() {
  return (
    <ComposerSelect value="subscription">
      <ComposerSelectTrigger aria-label="Account: Anthropic · Subscription">
        <ComposerSelectValue>Anthropic · Subscription</ComposerSelectValue>
      </ComposerSelectTrigger>
      <ComposerSelectContent title="Account">
        <ComposerSelectList aria-label="Account">
          <ComposerSelectItem value="subscription">
            Anthropic · Subscription
          </ComposerSelectItem>
          <ComposerSelectItem value="api">
            Anthropic · API key
          </ComposerSelectItem>
        </ComposerSelectList>
      </ComposerSelectContent>
    </ComposerSelect>
  )
}

/** A composer as wide as `width` with an app's picker more, for `Crowded`. */
function CrowdedRow({ width }: { width: number }) {
  return (
    <div data-width={width} style={{ width }}>
      <Composer>
        <ComposerEditor aria-label={`Message ${width}`} />
        <FullToolbar options extra={<AccountPicker />} />
      </Composer>
    </div>
  )
}

/**
 * An app's picker more than the toolbar plans for: where, unfolded, the
 * tools do not fit (a picker's value cut short), it folds as under 24rem,
 * permissions and the meter into the options button, the model its name
 * only; with the room, nothing folds.
 */
export const Crowded: Story = {
  tags: ["!autodocs"],
  render: () => (
    <div className="flex flex-col items-start gap-6 p-6">
      {[880, 440].map((width) => (
        <CrowdedRow key={width} width={width} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const row = (width: number) =>
      canvasElement.querySelector<HTMLElement>(`[data-width="${width}"]`)!
    const shown = (width: number, selector: string) => {
      const element = row(width).querySelector<HTMLElement>(selector)
      return !!element && element.getBoundingClientRect().width > 0
    }
    const cut = (width: number) =>
      [
        ...row(width).querySelectorAll<HTMLElement>(
          "[data-slot=composer-select-value]"
        ),
      ].filter((value) => value.scrollWidth > value.clientWidth + 1).length
    await waitFor(() =>
      expect(shown(440, "[data-slot=composer-options]")).toBe(true)
    )
    await expect(shown(440, "[data-slot=usage-meter-breakdown]")).toBe(false)
    await expect(shown(440, "[data-slot=composer-mode-picker]")).toBe(false)
    await expect(cut(440)).toBe(0)
    await expect(shown(880, "[data-slot=composer-options]")).toBe(false)
    await expect(shown(880, "[data-slot=usage-meter-breakdown]")).toBe(true)
    await expect(cut(880)).toBe(0)
  },
}

/**
 * An app's endpoint picker: the provider by its name, and its usage of
 * the week's rate limit, which stays when it is compact.
 */
function EndpointPicker() {
  return (
    <ComposerOptionsFold keep>
      <ComposerSelect value="pro">
        <ComposerSelectTrigger aria-label="Endpoint: Pro 48%">
          <HugeiconsIcon icon={CloudIcon} strokeWidth={2} />
          <ComposerSelectValue>Pro</ComposerSelectValue>{" "}
          <span className="tabular-nums">48%</span>
        </ComposerSelectTrigger>
        <ComposerSelectContent title="Endpoint">
          <ComposerSelectList aria-label="Endpoint">
            <ComposerSelectItem value="pro">Pro</ComposerSelectItem>
            <ComposerSelectItem value="api">API key</ComposerSelectItem>
          </ComposerSelectList>
        </ComposerSelectContent>
      </ComposerSelect>
    </ComposerOptionsFold>
  )
}

function CompactComposer() {
  return (
    <Composer>
      <ComposerEditor aria-label="Message" />
      <FullToolbar options compact extra={<EndpointPicker />} />
    </Composer>
  )
}

/** Where a story's toolbar shows a tool: its slot's box is laid out. */
const shownIn = (root: HTMLElement, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector)
  return !!element && element.getBoundingClientRect().width > 0
}

/**
 * Wide, every tool whole: the permissions, the endpoint by its name and
 * usage, the meter with its number; no options button.
 */
export const CompactFoldsWide: Story = {
  tags: ["!autodocs"],
  render: () => (
    <div className="w-225">
      <CompactComposer />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("button", { name: /^Endpoint/ })
    ).toHaveTextContent("Pro 48%")
    await expect(shownIn(canvasElement, "[data-slot=composer-options]")).toBe(
      false
    )
    await expect(
      shownIn(
        canvasElement,
        "[data-slot=composer-mode-picker] [data-slot=composer-select-value]"
      )
    ).toBe(true)
  },
}

/**
 * On a phone the tools fold a step at a time: compact in place (the
 * endpoint its icon and usage, the meter its bar and number, the
 * permissions their icon), then, as that does not fit either, the
 * permissions into the options button; the kept meters stay.
 */
export const CompactFoldsPhone: Story = {
  ...onAPhone,
  tags: ["!autodocs"],
  render: () => (
    <div className="w-96">
      <CompactComposer />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const endpoint = canvas.getByRole("button", { name: /^Endpoint/ })
    const toolbarElement = canvasElement.querySelector<HTMLElement>(
      "[data-slot=composer-toolbar]"
    )!
    // Folded as far as it goes.
    await waitFor(() => expect(toolbarElement.dataset.folded).toBe("2"), {
      // A step a frame or two, each after layout.
      timeout: 4000,
    })
    await expect(shownIn(canvasElement, "[data-slot=composer-options]")).toBe(
      true
    )
    await expect(endpoint).toBeVisible()
    // The model by its name, cut short if it must be.
    await expect(
      shownIn(
        canvasElement,
        "[data-slot=model-picker] [data-slot=composer-select-value]"
      )
    ).toBe(true)
    // Its name gone, its usage kept.
    await expect(endpoint.getBoundingClientRect().width).toBeLessThan(80)
    await expect(within(endpoint).getByText("48%")).toBeVisible()
    await expect(
      within(endpoint).getByText("Pro").getBoundingClientRect().width
    ).toBe(0)
    // The meter: its bar and number.
    await expect(
      shownIn(canvasElement, "[data-slot=usage-meter-breakdown]")
    ).toBe(true)
    await expect(shownIn(canvasElement, "[data-slot=usage-meter-value]")).toBe(
      true
    )
    // The permissions folded away.
    await expect(
      shownIn(canvasElement, "[data-slot=composer-mode-picker]")
    ).toBe(false)
    // Every tool inside the toolbar, once laid out at that step.
    const toolbar = () =>
      canvasElement
        .querySelector("[data-slot=composer-toolbar]")!
        .getBoundingClientRect()
    const outside = () =>
      [
        ...canvasElement.querySelectorAll(
          "[data-slot=composer-toolbar] button"
        ),
      ].filter((tool) => {
        const box = tool.getBoundingClientRect()
        return box.width > 0 && box.right > toolbar().right + 0.5
      }).length
    await waitFor(() => expect(outside()).toBe(0), { timeout: 4000 })
    // The meter still opens its breakdown.
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>(
        "[data-slot=usage-meter-breakdown]"
      )!
    )
    const compact = await screen.findByText("Compact now")
    await waitFor(() => expect(compact).toBeVisible())
  },
}

const questions = [
  {
    name: "notes",
    title: "Anything to add to the release notes?",
  },
  {
    name: "branch",
    title: "Which branch should the release go to?",
    description: "main has 3 commits that aren't on release yet.",
    choices: [
      { value: "release", label: "release — only the build change" },
      { value: "main", label: "main — include the 3 newer commits" },
    ],
  },
  {
    name: "checks",
    title: "Which checks should run first?",
    choices: [
      { value: "lint", label: "Lint and types" },
      { value: "unit", label: "Unit tests" },
    ],
  },
  { name: "announce", title: "Anything to tell the team?" },
]

/** The agent's questions in the composer's place; its draft is kept. */
function QuestionDemo({
  onDismiss,
  decline = false,
}: {
  onDismiss: () => void
  /** Whether the reader can decline the whole request. */
  decline?: boolean
}) {
  return (
    <div
      data-testid="stage"
      className="flex w-185 max-w-full flex-col items-center justify-end gap-3.5 px-9 pt-80 pb-9"
    >
      <ComposerTakeover
        request={
          <Questionnaire
            defaultItem="branch"
            shortcuts="numbers"
            items={questions.map(({ name, choices }) => ({
              name,
              required: false,
              ...(choices && {
                choices: choices.map(({ value }) => ({ value })),
              }),
            }))}
          >
            <AgentRequest>
              <AgentRequestHeader icon={icon(HelpCircleIcon)} note="Draft kept">
                The agent has 4 questions
              </AgentRequestHeader>
              <AgentRequestContent>
                {questions.map((question) => (
                  <QuestionnaireItem key={question.name} name={question.name}>
                    <QuestionnaireTitle>{question.title}</QuestionnaireTitle>
                    {question.description ? (
                      <QuestionnaireDescription>
                        {question.description}
                      </QuestionnaireDescription>
                    ) : null}
                    {question.choices ? (
                      <QuestionnaireChoices>
                        {question.choices.map((choice) => (
                          <QuestionnaireChoice
                            key={choice.value}
                            value={choice.value}
                            defaultChecked={choice.value === "release"}
                          >
                            {choice.label}
                          </QuestionnaireChoice>
                        ))}
                        <QuestionnaireInput
                          aria-label="Something else"
                          placeholder="Something else…"
                        />
                      </QuestionnaireChoices>
                    ) : (
                      <QuestionnaireInput
                        aria-label={question.title}
                        placeholder="Type an answer, or skip"
                      />
                    )}
                  </QuestionnaireItem>
                ))}
              </AgentRequestContent>
              <AgentRequestFooter>
                <QuestionnaireProgress />
                <QuestionnaireNavigation
                  size="sm"
                  onDecline={decline ? onDismiss : undefined}
                  labels={{ decline: "Dismiss" }}
                />
              </AgentRequestFooter>
            </AgentRequest>
          </Questionnaire>
        }
      >
        <Composer>
          <ComposerEditor aria-label="Message" />
        </Composer>
      </ComposerTakeover>
      <div className="w-full px-1.5">
        <AgentRequest
          icon={icon(HelpCircleIcon)}
          decision={{
            summary: (
              <>
                4 questions ·{" "}
                <span className="text-foreground">3 answered, 1 skipped</span>
              </>
            ),
          }}
        >
          <AgentRequestTitle>The agent had 4 questions</AgentRequestTitle>
        </AgentRequest>
      </div>
    </div>
  )
}

/** 15 · A question takes the composer's place; its draft is kept. */
export const QuestionTakesOver: StoryObj<typeof QuestionDemo> = {
  render: (args) => <QuestionDemo {...args} />,
  args: { onDismiss: fn() },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("group", { name: "The agent has 4 questions" })
    ).toBeVisible()
    await expect(canvas.getByText("Question 2 of 4")).toBeVisible()
    // The free answer is the row after the choices, its key the next one.
    const other = canvas.getByRole("textbox", { name: "Something else" })
    await expect(other).toHaveAttribute("aria-keyshortcuts", "3")
    await expect(other).toHaveAttribute("placeholder", "Something else…")
  },
}

/** The key after the choices' types an answer of the reader's own. */
export const QuestionSomethingElse: StoryObj<typeof QuestionDemo> = {
  tags: ["!autodocs"],
  render: (args) => <QuestionDemo {...args} />,
  args: { onDismiss: fn() },
  play: async ({ canvas }) => {
    const other = canvas.getByRole("textbox", { name: "Something else" })
    const release = canvas.getByRole("radio", { name: /^release/ })
    await waitFor(() => expect(release).toBeChecked())
    release.focus()
    await userEvent.keyboard("3")
    await expect(other).toHaveFocus()
    await userEvent.keyboard("staging")
    await expect(other).toHaveValue("staging")
    await expect(
      other.closest("[data-slot=questionnaire-choice]")
    ).toHaveAttribute("data-checked")
    await expect(release).not.toBeChecked()
  },
}

/** Dismiss declines the whole request. */
export const QuestionDismiss: StoryObj<typeof QuestionDemo> = {
  tags: ["!autodocs"],
  render: (args) => <QuestionDemo {...args} />,
  args: { onDismiss: fn(), decline: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss" }))
    await expect(args.onDismiss).toHaveBeenCalled()
  },
}

/** Inline completion takes Tab before code indentation does. */
export const FenceTabAcceptsCompletion: Story = {
  args: { completes: true, initial: ["```\ncode"] },
  play: async ({ args, canvas, canvasElement }) => {
    const editor = editorOf(canvas)
    await userEvent.click(editor)
    await caretAtEnd(editor)
    await userEvent.keyboard("s")
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=composer-completion]")
      ).not.toBeNull()
    )
    await userEvent.keyboard("{Tab}")
    await waitFor(() =>
      expect(editor).toHaveTextContent("codes list the breaking changes first")
    )
    await userEvent.click(canvas.getByRole("button", { name: "Send" }))
    await expect(args.onSubmit).toHaveBeenCalledWith([
      "```\ncodes list the breaking changes first",
    ])
  },
}

/** A secret pasted into code still offers the secret actions. */
export const FencePasteSecret: Story = {
  args: { secrets: true, initial: ["```\n"] },
  play: async ({ canvas }) => {
    const editor = editorOf(canvas)
    await userEvent.click(editor)
    await caretAtEnd(editor)
    const data = new DataTransfer()
    data.setData("text/plain", "sk_live_51N…Qx")
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
    })
    Object.defineProperty(event, "clipboardData", { value: data })
    editor.dispatchEvent(event)
    // The secret's shelf fades in.
    await waitFor(() =>
      expect(canvas.getByText("That looks like an API key.")).toBeVisible()
    )
    await expect(
      canvas.getByRole("button", { name: "Save as $STRIPE_KEY" })
    ).toBeVisible()
  },
}
