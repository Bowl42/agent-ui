import { useLayoutEffect, useState } from "react"
import { test } from "vitest"

import {
  AgentApp,
  AgentAppColumn,
  AgentAppHeader,
} from "@/components/agent-app/agent-app"
import {
  AgentAppRail,
  AgentAppRailItem,
} from "@/components/agent-app/agent-app-rail"
import { AgentTurn } from "@/components/agent-turn"
import { Markdown } from "@/components/markdown"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { UserMessage, UserMessageText } from "@/components/user-message"

import {
  frame,
  measureFrames,
  render,
  report,
  reportFrames,
  sync,
  time,
} from "./harness"

const control: { write?: (text: string) => void } = {}

const earlier = (turn: number) => `## Turn ${turn}

The build now splits vendor code once and skips what nothing imports.
${Array.from({ length: 8 }, (_, line) => `- Item ${line} of turn ${turn}, a line long enough to wrap once or twice in a column.`).join("\n")}

\`\`\`ts
export const value${turn} = ${turn} * 2
\`\`\``

/** An app's page: rail, sidebar, header, a conversation and a reply streaming at its end. */
function App({ rail, turns }: { rail: boolean; turns: number }) {
  const [text, setText] = useState("")
  useLayoutEffect(() => {
    control.write = (more) => setText((current) => current + more)
  }, [])
  return (
    <div className="h-[800px]">
      <AgentApp
        {...(rail
          ? {
              rail: (
                <AgentAppRail label="Areas">
                  <AgentAppRailItem
                    icon={<span>C</span>}
                    label="Chat"
                    current
                  />
                  <AgentAppRailItem icon={<span>P</span>} label="Projects" />
                </AgentAppRail>
              ),
            }
          : {})}
        sidebar={<div className="p-4">Conversations</div>}
      >
        <AgentAppHeader title="Tune the build" />
        <MessageScrollerProvider>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport aria-label="Conversation">
              <AgentAppColumn
                render={<MessageScrollerContent className="py-8" />}
              >
                {Array.from({ length: turns }, (_, turn) => (
                  <MessageScrollerItem key={turn} messageId={`m${turn}`}>
                    <UserMessage>
                      <UserMessageText>Question {turn}?</UserMessageText>
                    </UserMessage>
                    <Message>
                      <MessageContent>
                        <AgentTurn
                          id={`t${turn}`}
                          status="done"
                          parts={[
                            {
                              type: "content",
                              id: `c${turn}`,
                              content: <Markdown>{earlier(turn)}</Markdown>,
                            },
                          ]}
                        />
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
                <MessageScrollerItem messageId="live">
                  <Message>
                    <MessageContent>
                      <AgentTurn
                        id="live"
                        status="running"
                        parts={[
                          {
                            type: "content",
                            id: "live:answer",
                            content: <Markdown isAnimating>{text}</Markdown>,
                          },
                        ]}
                      />
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              </AgentAppColumn>
            </MessageScrollerViewport>
          </MessageScroller>
        </MessageScrollerProvider>
      </AgentApp>
    </div>
  )
}

const sentence = (index: number) =>
  `Sentence ${index} of the reply says a little more about the build. `

const codeLine = (index: number) =>
  `export const value${index} = compute(${index}, "a line of the fence")\n`

for (const rail of [false, true]) {
  test(`agent app: a reply streaming, ${rail ? "with" : "no"} rail`, async () => {
    render(<App rail={rail} turns={40} />)
    for (let i = 0; i < 20; i++) await frame()
    const name = (what: string) =>
      `agent app ${what}, 40 turns before, ${rail ? "rail" : "no rail"}`
    let index = 0
    const run = async (what: string, next: (chunk: number) => string) => {
      const samples: number[] = []
      const frames = []
      for (let chunk = 0; chunk < 80; chunk++) {
        const more = next(chunk)
        if (chunk % 2)
          samples.push(time(() => sync(() => control.write!(more))))
        else
          frames.push(
            await measureFrames(() => sync(() => control.write!(more)))
          )
      }
      report(name(what), samples)
      reportFrames(name(what), frames)
    }
    await run(
      "reply chunk",
      (chunk) => sentence(index++) + (chunk % 6 === 5 ? "\n\n" : "")
    )
    sync(() => control.write!("\n\n```ts\n"))
    await run("code line", () => codeLine(index++))
    // Then a long answer: 300 paragraphs more, and more words as they come.
    const long: string[] = ["\n```\n\n"]
    for (let paragraph = 0; paragraph < 300; paragraph++)
      long.push(sentence(index++).repeat(3) + "\n\n")
    sync(() => control.write!(long.join("")))
    for (let i = 0; i < 5; i++) await frame()
    await run(
      "reply chunk, 300 paragraphs in",
      (chunk) => sentence(index++) + (chunk % 6 === 5 ? "\n\n" : "")
    )
  })
}
