import { memo, useLayoutEffect, useState, type ReactNode } from "react"
import { test } from "vitest"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"

import { frame, render, report, sync, time } from "./harness"

const control: { write?: (text: string) => void } = {}
const write = (text: string) => control.write!(text)

/** Finished paragraphs are not rendered again, as Markdown renderers do. */
const Paragraph = memo(function Paragraph({ text }: { text: string }) {
  return (
    <p>
      {text.split(" ").map((word, i) => (
        <span key={i}>{word} </span>
      ))}
    </p>
  )
})

function Bare({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 text-sm">{children}</div>
}

/** A reply streaming in as Markdown would render: paragraphs of words. */
function Reply({
  footer,
  bare,
  sidebar,
}: {
  footer: boolean
  bare: boolean
  sidebar: boolean
}) {
  const [text, setText] = useState("")
  useLayoutEffect(() => {
    control.write = (more) => setText((current) => current + more)
  }, [])
  const paragraphs = text
    .split("\n")
    .map((paragraph, index) => <Paragraph key={index} text={paragraph} />)
  if (sidebar)
    return (
      <SidebarProvider>
        <SidebarInset>
          <Bare>{paragraphs}</Bare>
        </SidebarInset>
      </SidebarProvider>
    )
  if (bare) return <Bare>{paragraphs}</Bare>
  return (
    <Message>
      <MessageAvatar>AI</MessageAvatar>
      <MessageContent>
        <Bubble variant="ghost">
          <BubbleContent>{paragraphs}</BubbleContent>
        </Bubble>
        {footer ? <MessageFooter>Done</MessageFooter> : null}
      </MessageContent>
    </Message>
  )
}

const paragraph = (index: number) =>
  `Paragraph ${index} of a long reply with a dozen words in it.\n`

for (const [name, footer, bare, sidebar] of [
  ["message", false, false, false],
  ["message (footer)", true, false, false],
  ["no message", false, true, false],
  ["in a sidebar layout", false, false, true],
] as const) {
  test(`stream a reply: ${name}`, async () => {
    render(<Reply footer={footer} bare={bare} sidebar={sidebar} />)
    let index = 0
    for (const upTo of [500, 2000]) {
      const text: string[] = []
      while (index < upTo - 50) text.push(paragraph(index++))
      sync(() => write(text.join("")))
      await frame()
      const samples: number[] = []
      for (let step = 0; step < 50; step++) {
        const words = paragraph(index++).split(" ")
        for (const word of words) {
          samples.push(time(() => sync(() => write(word + " "))))
        }
      }
      report(`reply chunk, ${name}, ~${upTo} paragraphs`, samples)
    }
  })
}
