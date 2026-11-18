import { useLayoutEffect, useState } from "react"
import { expect, test } from "vitest"

import { AgentTurn, type AgentTurnPart } from "@/components/agent-turn"
import {
  ConversationFind,
  ConversationFindBar,
  useConversationFind,
} from "@/components/conversation-find"
import { Markdown } from "@/components/markdown"
import { UserMessage, UserMessageText } from "@/components/user-message"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { FoldProvider } from "@/hooks/use-fold"

import { frame, memory, render, report, sync, timeWithFrames } from "./harness"

const turns = 200
const steps = 30
// The one place the needle is: deep in a closed fold, turn 150, step 21 (a command; line 12 of 20, past the 4 shown).
const needle = "zirconquill"

const diff = (turn: number, step: number) =>
  [
    `--- a/src/module-${turn}-${step}.ts`,
    `+++ b/src/module-${turn}-${step}.ts`,
    "@@ -1,6 +1,7 @@",
    ...Array.from({ length: 12 }, (_, line) =>
      line % 4 === 0
        ? `-const value${line} = read(${line})`
        : line % 4 === 1
          ? `+const value${line} = await read(${line}, { cache: true })`
          : ` export function step${line}() { return value${line} }`
    ),
  ].join("\n")

const output = (turn: number, step: number) =>
  Array.from(
    { length: 20 },
    (_, line) =>
      `${turn === 150 && step === 21 && line === 12 ? needle + " " : ""}line ${line}: checked package ${turn}-${step}, resolved dependencies and wrote the report`
  ).join("\n")

function parts(turn: number): AgentTurnPart[] {
  const tools = Array.from({ length: steps }, (_, step): AgentTurnPart => {
    const id = `t${turn}-${step}`
    if (step % 3 === 0)
      return {
        type: "tool",
        id,
        kind: "command",
        command: `pnpm run check --filter package-${turn}-${step}`,
        output: output(turn, step),
        status: "done",
      }
    if (step % 3 === 1)
      return {
        type: "tool",
        id,
        kind: "edit",
        path: `src/module-${turn}-${step}.ts`,
        diff: diff(turn, step),
        added: 3,
        removed: 3,
        status: "done",
      }
    return {
      type: "tool",
      id,
      kind: "read",
      path: `src/module-${turn}-${step}.ts`,
      status: "done",
    }
  })
  const answer = Array.from(
    { length: 8 },
    (_, paragraph) =>
      `Paragraph ${paragraph} of turn ${turn}: the review checked every module, the cache settings and the release notes, and everything else stays as it was.`
  ).join("\n\n")
  return [
    ...tools,
    {
      type: "content",
      id: `answer-${turn}`,
      content: <Markdown mode="static">{answer}</Markdown>,
    },
  ]
}

const data = Array.from({ length: turns }, (_, turn) => parts(turn))

const control: {
  setOpen?: (open: boolean) => void
  find?: ReturnType<typeof useConversationFind>
} = {}

function Spy() {
  const find = useConversationFind()
  useLayoutEffect(() => {
    control.find = find
  })
  return null
}

function Conversation() {
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => {
    control.setOpen = setOpen
  }, [])
  return (
    <MessageScrollerProvider>
      <FoldProvider>
        <ConversationFind open={open} onOpenChange={setOpen}>
          <Spy />
          <div style={{ height: 800 }}>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {data.map((turn, index) => (
                    <MessageScrollerItem key={index} messageId={`m${index}`}>
                      <UserMessage>
                        <UserMessageText>
                          Please review package {index} and fix what fails.
                        </UserMessageText>
                      </UserMessage>
                      <AgentTurn
                        id={`turn-${index}`}
                        status="done"
                        parts={turn}
                      />
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <ConversationFindBar />
            </MessageScroller>
          </div>
        </ConversationFind>
      </FoldProvider>
    </MessageScrollerProvider>
  )
}

/** Waits until the frames settle: work deferred to them included. */
async function settle(frames = 3) {
  for (let i = 0; i < frames; i++) await frame()
}

const mb = (bytes: number) => Math.round(bytes / 1e5) / 10

test("find in a long conversation: 200 turns of 30 folded steps", async () => {
  render(<Conversation />)
  await settle(10)
  const before = await memory()

  // (a) Opening: every closed fold mounts its content, hidden until found.
  const opens: number[] = []
  let after = before
  for (let run = 0; run < 3; run++) {
    opens.push(await timeWithFrames(() => sync(() => control.setOpen!(true))))
    if (run === 0) after = await memory()
    sync(() => control.setOpen!(false))
    await settle()
  }
  report("open find (sync and deferred work over 3 frames)", opens)
  console.log(
    `PERF heap: ${mb(before.heap)}MB before, ${mb(after.heap)}MB open; DOM nodes ${before.nodes} → ${after.nodes}`
  )

  sync(() => control.setOpen!(true))
  await settle()

  // (b) A keystroke: search and highlight.
  // The last is nowhere: the whole conversation walked.
  for (const query of ["e", "ch", "cache", "release notes", "absentword"]) {
    const samples: number[] = []
    for (let run = 0; run < 5; run++) {
      sync(() => control.find!.setQuery(""))
      await settle()
      samples.push(
        await timeWithFrames(() => sync(() => control.find!.setQuery(query)), 2)
      )
    }
    const total = control.find!.total
    report(
      `keystroke "${query}" (${total} matches, sync and deferred work over 2 frames)`,
      samples
    )
  }

  // (c) Going to a match deep in a closed fold, until it is in view.
  sync(() => control.find!.setQuery(""))
  await settle()
  const start = performance.now()
  sync(() => control.find!.setQuery(needle))
  const viewport = document.querySelector(
    "[data-slot=message-scroller-viewport]"
  )!
  let frames = 0
  for (; frames < 60; frames++) {
    await frame()
    const highlight = CSS.highlights?.get("conversation-find-current")
    const range = highlight ? ([...highlight][0] as Range) : undefined
    if (!range) continue
    const box = range.getBoundingClientRect()
    const view = viewport.getBoundingClientRect()
    if (box.height > 0 && box.top >= view.top && box.bottom <= view.bottom)
      break
  }
  const went = performance.now() - start
  console.log(
    `PERF go to a match in a closed fold: ${Math.round(went)}ms, ${frames + 1} frames`
  )
  expect(frames).toBeLessThan(60)
})
