import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  expect,
  fn,
  screen,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { HugeiconsIcon } from "@hugeicons/react"
import { Comment01Icon } from "@hugeicons/core-free-icons"
import {
  SelectionActions,
  SelectionAction,
  SelectionQuote,
  type SelectionActionsSelection,
} from "@/components/selection-actions"
import { Markdown } from "@/components/markdown"
import {
  Composer,
  ComposerEditor,
  type ComposerActions,
} from "@/components/composer"
import { frames, rendered } from "@/stories/wait"

const answer =
  "A paragraph with **bold** and `code` to quote.\n\n- First item\n- Second item\n\n```ts\nconst ready = true\n```"

function Demo({
  onQuote,
  onExplain,
  maxLength,
}: {
  onQuote: (selection: SelectionActionsSelection) => void
  onExplain: (selection: SelectionActionsSelection) => void
  maxLength?: number
}) {
  const composer = React.useRef<ComposerActions>(null)
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <SelectionActions
        maxLength={maxLength}
        actions={
          <>
            <SelectionQuote
              onQuote={(selection) => {
                onQuote(selection)
                composer.current?.insert([
                  {
                    type: "quote",
                    text: selection.text,
                    id: "answer",
                    source: "Answer",
                  },
                ])
                composer.current?.focus()
              }}
            />
            <SelectionAction onAction={onExplain}>
              <HugeiconsIcon icon={Comment01Icon} strokeWidth={2} />
              Explain
            </SelectionAction>
          </>
        }
      >
        <Markdown>{answer}</Markdown>
      </SelectionActions>
      <p data-testid="outside">This paragraph is outside the answer.</p>
      <Composer actionsRef={composer} onSubmit={() => {}}>
        <ComposerEditor aria-label="Message" />
      </Composer>
    </div>
  )
}

const meta = {
  title: "Components/Selection Actions",
  component: Demo,
  args: { onQuote: fn(), onExplain: fn() },
} satisfies Meta<typeof Demo>
export default meta

type Story = StoryObj<typeof meta>

function select(node: Node, start?: number, end?: number) {
  const range = document.createRange()
  range.selectNodeContents(node)
  if (start !== undefined) range.setStart(node, start)
  if (end !== undefined) range.setEnd(node, end)
  getSelection()!.removeAllRanges()
  getSelection()!.addRange(range)
  return range
}

const toolbar = () => screen.getByRole("toolbar", { name: "Selection actions" })
const opened = () => waitFor(() => expect(toolbar()).toBeVisible())
const closed = () =>
  waitFor(() =>
    expect(
      screen.queryByRole("toolbar", { name: "Selection actions" })
    ).toBeNull()
  )
const paragraph = (root: HTMLElement) =>
  root.querySelector('[data-slot="selection-actions"] p')!

export const Quote: Story = {
  play: async ({ canvasElement, args }) => {
    select(paragraph(canvasElement))
    await opened()
    await userEvent.click(
      within(toolbar()).getByRole("button", { name: "Quote" })
    )
    await expect(args.onQuote).toHaveBeenCalledWith({
      text: "A paragraph with **bold** and `code` to quote.",
      range: expect.any(Range),
    })
    await closed()
    await expect(getSelection()!.toString()).toBe("")
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-kind="quote"]')).toBeVisible()
    )
  },
}

export const AppAction: Story = {
  play: async ({ canvasElement, args }) => {
    select(canvasElement.querySelector("ul")!)
    await opened()
    await userEvent.click(
      within(toolbar()).getByRole("button", { name: "Explain" })
    )
    await expect(args.onExplain).toHaveBeenCalledWith({
      text: "- First item\n- Second item",
      range: expect.any(Range),
    })
    await closed()
  },
}

export const OutsideRegion: Story = {
  play: async ({ canvasElement }) => {
    const outside = canvasElement.querySelector('[data-testid="outside"]')!
    select(outside)
    await frames(2)
    await rendered()
    await expect(
      screen.queryByRole("toolbar", { name: "Selection actions" })
    ).toBeNull()
    const range = select(paragraph(canvasElement))
    range.setEnd(outside.firstChild!, 8)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
    await frames(2)
    await rendered()
    await expect(
      screen.queryByRole("toolbar", { name: "Selection actions" })
    ).toBeNull()
  },
}

export const TooLong: Story = {
  args: { maxLength: 20 },
  play: async ({ canvasElement }) => {
    select(paragraph(canvasElement))
    await opened()
    await expect(within(toolbar()).getByRole("status")).toHaveTextContent(
      "Selection is too long to quote"
    )
    await expect(
      within(toolbar()).queryByRole("button", { name: "Quote" })
    ).toBeNull()
  },
}

export const Escape: Story = {
  play: async ({ canvasElement }) => {
    const p = paragraph(canvasElement)
    select(p)
    await opened()
    await userEvent.keyboard("{Escape}")
    await closed()
    await expect(getSelection()!.toString()).not.toBe("")
    // Selecting the same text again shows it again.
    select(p)
    await opened()
    select(p.firstChild!, 0, 5)
    await opened()
    await userEvent.tab()
    await expect(
      within(toolbar()).getByRole("button", { name: "Quote" })
    ).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(
      within(toolbar()).getByRole("button", { name: "Explain" })
    ).toHaveFocus()
    await userEvent.keyboard("{Escape}")
    await closed()
  },
}

/** A quoted code block keeps its fence and language. */
export const QuoteCode: Story = {
  play: async ({ canvasElement, args }) => {
    select(canvasElement.querySelector("[data-slot=code-block-content]")!)
    await opened()
    await userEvent.click(
      within(toolbar()).getByRole("button", { name: "Quote" })
    )
    await expect(args.onQuote).toHaveBeenCalledWith({
      text: "```ts\nconst ready = true\n```",
      range: expect.any(Range),
    })
  },
}

const listened = [
  "selectionchange",
  "pointerdown",
  "pointerup",
  "pointercancel",
  "keydown",
]
const listeners = new Map<string, number>()
const commits = new Set<string>()
let netListeners = () => {}

/**
 * A long conversation: 200 answers, each its own region, share one set of
 * document listeners, and a selection in one renders that one alone.
 */
export const ManyRegions: Story = {
  // Calls through: counts the listeners added and removed while it renders.
  beforeEach: () => {
    const adding = spyOn(document, "addEventListener")
    const removing = spyOn(document, "removeEventListener")
    listeners.clear()
    netListeners = () => {
      for (const [type] of adding.mock.calls)
        listeners.set(type, (listeners.get(type) ?? 0) + 1)
      for (const [type] of removing.mock.calls)
        listeners.set(type, (listeners.get(type) ?? 0) - 1)
    }
    return () => {
      adding.mockRestore()
      removing.mockRestore()
    }
  },
  render: function Render(args) {
    return (
      <div className="mx-auto max-w-2xl space-y-2 p-8">
        {Array.from({ length: 200 }, (_, index) => (
          <React.Profiler
            key={index}
            id={String(index)}
            onRender={(id) => commits.add(id)}
          >
            <SelectionActions
              data-testid={`answer-${index}`}
              actions={<SelectionQuote onQuote={args.onQuote} />}
            >
              <p>Answer {index + 1}, a few words to select.</p>
            </SelectionActions>
          </React.Profiler>
        ))}
      </div>
    )
  },
  play: async ({ canvas }) => {
    netListeners()
    for (const type of listened) await expect(listeners.get(type), type).toBe(1)
    await rendered()
    commits.clear()
    select(canvas.getByTestId("answer-120").querySelector("p")!)
    await opened()
    await expect(
      screen.getAllByRole("toolbar", { name: "Selection actions" })
    ).toHaveLength(1)
    await rendered()
    await expect([...commits]).toEqual(["120"])
    commits.clear()
    select(canvas.getByTestId("answer-7").querySelector("p")!)
    await waitFor(() => expect(commits).toContain("7"))
    await rendered()
    await expect([...commits].sort()).toEqual(["120", "7"])
    await expect(
      screen.getAllByRole("toolbar", { name: "Selection actions" })
    ).toHaveLength(1)
  },
}
