import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  ArrowExpand01Icon,
  ArrowShrink02Icon,
  Clock01Icon,
  File01Icon,
  PencilEdit02Icon,
  TextIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import { CopyButton } from "@/components/copy-button"
import { MessageDivider } from "@/components/message-divider"
import {
  MessageCommand,
  MessageLink,
  MessageMention,
  MessageMentionLabel,
  UserMessage,
  UserMessageAction,
  UserMessageCommand,
  UserMessageFooter,
  UserMessageHeader,
  UserMessageText,
} from "@/components/user-message"
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"

const onOpen = fn()

const meta = {
  title: "Components/User Message",
  component: UserMessage,
  parameters: { layout: "padded" },
  beforeEach: () => {
    onOpen.mockClear()
  },
  decorators: [
    (Story) => (
      <div className="mx-auto flex w-xl max-w-full flex-col gap-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserMessage>

export default meta
type Story = StoryObj<typeof meta>

// A small picture, drawn, so the story needs no network.
const thumbnail = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#d4d4d8"/><circle cx="11" cy="5" r="3" fill="#a1a1aa"/></svg>'
)}`

const long = `I'm seeing the registry build fail only on the linux runner. Here's everything I collected. First the environment, then the full log, then what I already tried so you don't repeat it.

Environment: ubuntu-24.04, node 22.11, pnpm 10.2, the cache is restored from the previous run. The macOS runner passes with the same lockfile.

What I tried: clearing the pnpm store, pinning shadcn to 3.5.0, running pnpm registry:build locally in a linux container — it passes there too, which is the strange part.

Then the log:
Error: ENOENT: no such file or directory, open 'public/r/chart.json'
  at Object.openSync (node:fs:573:3)
  at readFileSync (node:fs:452:35)
  at build (scripts/registry.mjs:41:18)
  at main (scripts/registry.mjs:88:3)

Line 1 of the rest of the log
Line 2 of the rest of the log
Line 3 of the rest of the log
Line 4 of the rest of the log
Line 5 of the rest of the log
Line 6 of the rest of the log
Line 7 of the rest of the log
Line 8 of the rest of the log

Anything else you need, ask.`

/**
 * On the conversation's grid (12 columns of 48px, 16 apart): a message at
 * most 9 columns wide, 560px, at the column's end.
 */
export const OnTheGrid: Story = {
  decorators: [
    (Story) => (
      <div className="w-188">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <UserMessage>
      <UserMessageText>
        The registry build fails only on the linux runner, with the same
        lockfile that passes on macOS; clearing the store and pinning shadcn did
        not help, and it passes in a linux container locally.
      </UserMessageText>
    </UserMessage>
  ),
  play: async ({ canvasElement }) => {
    const column = canvasElement
      .querySelector("[data-slot=user-message]")!
      .getBoundingClientRect()
    const bubble = canvasElement
      .querySelector("[data-slot=user-message-text]")!
      .getBoundingClientRect()
    await expect(column.width).toBe(752)
    await expect(bubble.width).toBe(9 * 48 + 8 * 16)
    await expect(bubble.right).toBe(column.right)
  },
}

/** A short message: when, edit and copy show on hover or focus. */
export const Default: Story = {
  render: () => (
    <UserMessage>
      <UserMessageText>
        Can you make the build faster and drop the unused chunks?
      </UserMessageText>
      <UserMessageFooter>
        <span>12:03</span>
        <UserMessageAction label="Edit">
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
        </UserMessageAction>
        <CopyButton value="Can you make the build faster and drop the unused chunks?" />
      </UserMessageFooter>
    </UserMessage>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", { level: 3, name: "You" })
    ).toBeInTheDocument()
    // Short: no row to show more.
    await expect(
      canvas.queryByRole("button", { name: "Show all" })
    ).not.toBeInTheDocument()
    // Its text 12px in from the bubble's edge and 8px down, past its
    // transparent border.
    const bubble = canvasElement.querySelector<HTMLElement>(
      "[data-slot=user-message-text] > [data-slot=bubble-content]"
    )!
    const corners = getComputedStyle(bubble)
    await expect(corners.borderTopRightRadius).toBe(
      corners.borderBottomRightRadius
    )
    await expect(corners.borderTopLeftRadius).toBe(
      corners.borderBottomLeftRadius
    )
    const inside = canvasElement.querySelector<HTMLElement>(
      "[data-slot=clamp-content]"
    )!
    const edge = bubble.getBoundingClientRect()
    const text = inside.getBoundingClientRect()
    await expect(text.left - edge.left).toBe(13)
    await expect(text.top - edge.top).toBe(9)
    const footer = canvasElement.querySelector<HTMLElement>(
      "[data-slot=user-message-footer]"
    )!
    // Hidden until the reader comes to it; focus shows it.
    await expect(getComputedStyle(footer).opacity).toBe("0")
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Edit" })).toHaveFocus()
    await waitFor(() => expect(getComputedStyle(footer).opacity).toBe("1"))
  },
}

/**
 * Files, images and links it refers to are chips in its text, as the
 * composer showed them; each opens what it refers to.
 */
export const Mentions: Story = {
  render: () => (
    <UserMessage>
      <UserMessageText>
        Match{" "}
        <MessageMention onClick={() => onOpen("pricing.tsx")}>
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          <MessageMentionLabel>pricing.tsx</MessageMentionLabel>
        </MessageMention>{" "}
        to{" "}
        <MessageMention onClick={() => onOpen("mock-a.png")}>
          <img src={thumbnail} alt="" />
          <MessageMentionLabel>mock-a.png</MessageMentionLabel>
        </MessageMention>{" "}
        and{" "}
        <MessageMention onClick={() => onOpen("mock-b.png")}>
          <img src={thumbnail} alt="" />
          <MessageMentionLabel>mock-b.png</MessageMentionLabel>
        </MessageMention>
        , keep the copy from{" "}
        <MessageMention detail="12 pages" onClick={() => onOpen("spec.pdf")}>
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          <MessageMentionLabel>spec.pdf</MessageMentionLabel>
        </MessageMention>
        .
      </UserMessageText>
    </UserMessage>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /spec\.pdf/ }))
    await expect(onOpen).toHaveBeenCalledWith("spec.pdf")
    await expect(
      canvas.getByRole("button", { name: "spec.pdf 12 pages" })
    ).toBeVisible()
  },
}

/**
 * A message that is only a command: no bubble, a quiet line in
 * monospace at the message's end; what it did after it, the app's.
 */
export const Command: Story = {
  render: () => (
    <>
      <UserMessage>
        <UserMessageCommand>/compact</UserMessageCommand>
      </UserMessage>
      <MessageDivider>
        <HugeiconsIcon icon={ArrowShrink02Icon} strokeWidth={2} />
        Context compacted · 120k → 18k tokens
      </MessageDivider>
      <UserMessage>
        <UserMessageCommand>
          /model claude-opus-5-5 --effort high
        </UserMessageCommand>
      </UserMessage>
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    const command = canvas.getByText("/compact")
    await expect(command.closest("[data-slot=user-message-text]")).toBeNull()
    await expect(getComputedStyle(command).fontFamily).toMatch(/mono/i)
    await expect(command.getBoundingClientRect().height).toBe(28)
    // At the message's end, as the user's words are.
    const message = command.closest<HTMLElement>("[data-slot=user-message]")!
    await expect(
      Math.round(
        message.getBoundingClientRect().right -
          command.getBoundingClientRect().right
      )
    ).toBe(0)
    await expect(
      canvasElement.querySelector("[data-slot=message-divider]")
    ).toBeVisible()
  },
}

/** A command with words after it: the command a chip in its text. */
export const CommandInText: Story = {
  render: () => (
    <UserMessage>
      <UserMessageText>
        <MessageCommand>/review</MessageCommand> the pricing page against the
        spec, and keep the copy.
      </UserMessageText>
    </UserMessage>
  ),
  play: async ({ canvas }) => {
    const command = canvas.getByText("/review")
    await expect(
      command.closest("[data-slot=user-message-text]")
    ).not.toBeNull()
    await expect(getComputedStyle(command).fontFamily).toMatch(/mono/i)
    // The page's colour on the bubble's tint, as a mention.
    await expect(getComputedStyle(command).backgroundColor).toBe(
      getComputedStyle(document.body).backgroundColor
    )
  },
}

// A site's icon, drawn, so the story needs no network.
const siteIcon = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="#22c55e"/></svg>'
)}`

/**
 * A web address as a link, its site's icon before it: the icon in the
 * middle of the line beside Japanese and Latin text alike, apart from
 * the text before it; a long address breaks anywhere.
 */
export const Links: Story = {
  render: () => (
    <UserMessage>
      <UserMessageText>
        公式ドキュメント：
        <MessageLink
          href="https://developer.mozilla.org/ja/docs/Web/API/Intersection_Observer_API"
          icon={<img src={siteIcon} alt="" />}
        >
          https://developer.mozilla.org/ja/docs/Web/API/Intersection_Observer_API
        </MessageLink>
        {"\n"}
        Docs:{" "}
        <MessageLink
          href="https://example.com/guide"
          icon={<img src={siteIcon} alt="" />}
        >
          example.com/guide
        </MessageLink>
      </UserMessageText>
    </UserMessage>
  ),
  play: async ({ canvas }) => {
    for (const name of [/developer\.mozilla/, /example\.com/]) {
      const link = canvas.getByRole("link", { name })
      const image = link.querySelector("img")!
      await waitFor(() => expect(image.complete).toBe(true))
      // The text before it, on its line: its glyphs' middle.
      const before = document.createRange()
      before.selectNodeContents(link.previousSibling ?? link)
      const words = [...before.getClientRects()].at(-1)!
      const icon = image.getBoundingClientRect()
      await expect(
        Math.abs(icon.top + icon.height / 2 - (words.top + words.height / 2))
      ).toBeLessThanOrEqual(1)
      // Apart from it.
      await expect(icon.left - words.right).toBeGreaterThanOrEqual(1.5)
      await expect(icon.width).toBe(14)
      // On the line of its words' first characters, not alone.
      const text = document.createRange()
      text.selectNodeContents(link.lastChild!)
      const first = text.getClientRects()[0]!
      await expect(
        Math.abs(first.top + first.height / 2 - (icon.top + icon.height / 2))
      ).toBeLessThanOrEqual(1)
    }
  },
}

/**
 * Over 6 lines it is cut, fading out, with a row: "Show all", how long
 * it is, copy, and a button that opens it in a reader. Where it came
 * from goes over it, and whether it was edited under it.
 */
export const Long: Story = {
  render: () => (
    <UserMessage>
      <UserMessageHeader>
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
        Sent from queue
      </UserMessageHeader>
      <UserMessageText
        onOpen={() => onOpen("reader")}
        actions={<CopyButton value={long} />}
      >
        {long}
      </UserMessageText>
      <UserMessageFooter>
        <span>Edited · 12:03</span>
      </UserMessageFooter>
    </UserMessage>
  ),
  play: async ({ canvas, canvasElement }) => {
    const more = await canvas.findByRole("button", { name: "Show all" })
    await expect(more).toHaveAttribute("aria-expanded", "false")
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=clamp-content]"
    )!
    const lineHeight = parseFloat(getComputedStyle(content).lineHeight)
    await expect(Math.round(content.clientHeight / lineHeight)).toBe(6)
    // How long it is, as the reader sees it, in lines and in words.
    await expect(canvas.getByText(/^\d+ lines · \d+ words$/)).toBeVisible()

    await userEvent.click(
      canvas.getByRole("button", { name: "Open in reader" })
    )
    await expect(onOpen).toHaveBeenCalledWith("reader")

    await userEvent.click(more)
    await expect(
      canvas.getByRole("button", { name: "Show less" })
    ).toHaveAttribute("aria-expanded", "true")
    await waitFor(() =>
      expect(Math.round(content.clientHeight / lineHeight)).toBeGreaterThan(20)
    )
  },
}

/**
 * Open and scrolled past its start, a bar at the top says whose it is
 * and how far the reader is, and closes it, bringing its start back.
 */
export const ScrolledPast: Story = {
  render: () => (
    <div
      data-shot-scroll
      className="h-80 overflow-y-auto rounded-lg border px-4"
    >
      <div className="h-6" />
      <UserMessage>
        <UserMessageText defaultOpen actions={<CopyButton value={long} />}>
          {long}
        </UserMessageText>
      </UserMessage>
      <div className="h-40" />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const scroller =
      canvasElement.querySelector<HTMLElement>("[data-shot-scroll]")!
    await expect(
      canvasElement.querySelector("[data-slot=clamp-bar]")
    ).toBeNull()
    scroller.scrollTop = 200
    const collapse = await canvas.findByRole("button", { name: "Collapse" })
    const bar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=clamp-bar]"
    )!
    await expect(bar).toHaveTextContent("Your message")
    // Stuck to the top of what scrolls.
    await expect(
      Math.abs(
        bar.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      )
    ).toBeLessThan(2)
    // Across what scrolls, not the bubble: on the page's colour, under
    // a rule, "· 29 lines · … words" after the title.
    const pane = scroller.getBoundingClientRect()
    await waitFor(() =>
      expect(
        Math.abs(bar.getBoundingClientRect().left - pane.left - 1)
      ).toBeLessThan(1)
    )
    await expect(
      Math.abs(
        bar.getBoundingClientRect().right -
          (pane.left + 1 + scroller.clientWidth)
      )
    ).toBeLessThan(1)
    await expect(bar.getBoundingClientRect().height).toBe(40)
    await expect(getComputedStyle(bar).backdropFilter).toMatch(/blur/)
    await expect(getComputedStyle(bar).borderBottomWidth).toBe("1px")
    await expect(bar).toHaveTextContent(/Your message· \d+ lines/)
    // Collapse is a bordered 28px button; the fill is muted, not the
    // text's colour.
    await expect(collapse.getBoundingClientRect().height).toBe(28)
    await expect(getComputedStyle(collapse).borderTopWidth).toBe("1px")
    const fill = bar.querySelector<HTMLElement>(
      "[data-slot=clamp-progress] > span"
    )!
    await expect(getComputedStyle(fill).backgroundColor).toBe(
      getComputedStyle(bar).color
    )
    await expect(getComputedStyle(fill).backgroundColor).not.toBe(
      getComputedStyle(collapse).color
    )

    await userEvent.click(collapse)
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Show all" })
      ).toBeInTheDocument()
    )
    // Its start is in view again.
    const message = canvasElement.querySelector("[data-slot=user-message]")!
    await waitFor(() =>
      expect(message.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        scroller.getBoundingClientRect().top - 1
      )
    )
  },
}

/**
 * Text too long for a message (a log thousands of lines long) is a chip
 * over it, opening it in the app's panel; the bubble has only what the
 * user wrote.
 */
export const Pasted: Story = {
  render: () => (
    <UserMessage>
      <Attachment variant="filled" size="sm" className="self-end">
        <AttachmentMedia>
          <HugeiconsIcon icon={TextIcon} strokeWidth={2} />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Pasted text</AttachmentTitle>
          <AttachmentDescription>
            4,812 lines · 212 KB · log
          </AttachmentDescription>
        </AttachmentContent>
        <HugeiconsIcon
          icon={ArrowExpand01Icon}
          strokeWidth={2}
          aria-hidden="true"
        />
        <AttachmentTrigger
          aria-label="Open Pasted text"
          onClick={() => onOpen("pasted")}
        />
      </Attachment>
      <UserMessageText>
        This is the full CI log. Find where the registry build first goes wrong.
      </UserMessageText>
    </UserMessage>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Open Pasted text" })
    )
    await expect(onOpen).toHaveBeenCalledWith("pasted")
    const trigger = canvas.getByRole("button", { name: "Open Pasted text" })
    const chip = trigger.closest<HTMLElement>("[data-slot=attachment]")!
    const title = canvas.getByText("Pasted text")
    const media = chip.querySelector<HTMLElement>(
      "[data-slot=attachment-media]"
    )!
    await expect(chip.getBoundingClientRect().height).toBe(44)
    await expect(media.getBoundingClientRect().width).toBe(32)
    await expect(getComputedStyle(chip).borderTopWidth).toBe("0px")
    await expect(getComputedStyle(chip).borderRadius).toBe("8px")
    // The existing named step is 13px; the theme has no 12.5px token.
    await expect(getComputedStyle(title).fontSize).toBe("13px")
    await expect(getComputedStyle(title).fontWeight).toBe("400")
    await expect(getComputedStyle(chip).backgroundColor).not.toBe(
      getComputedStyle(media).backgroundColor
    )
    // The ring follows :focus-visible, not focus-within: unfocused, none.
    trigger.blur()
    await waitFor(() => expect(getComputedStyle(chip).boxShadow).toBe("none"))
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await waitFor(() =>
      expect(getComputedStyle(chip).boxShadow).not.toBe("none")
    )
  },
}

/** Its words, for other languages. */
export const Labels: Story = {
  render: function Render() {
    const [open, setOpen] = React.useState(false)
    return (
      <UserMessage labels={{ author: "Du" }} headingLevel={2}>
        <UserMessageText
          open={open}
          onOpenChange={setOpen}
          labels={{
            more: "Alles anzeigen",
            less: "Weniger anzeigen",
            lines: (lines) => `${lines} Zeilen insgesamt`,
            title: "Deine Nachricht",
            collapse: "Weniger anzeigen",
            open: "Im Lesemodus öffnen",
          }}
          onOpen={() => onOpen("reader")}
        >
          {long}
        </UserMessageText>
      </UserMessage>
    )
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Du" })
    ).toBeInTheDocument()
    await userEvent.click(
      await canvas.findByRole("button", { name: "Alles anzeigen" })
    )
    await expect(
      canvas.getByRole("button", { name: "Weniger anzeigen" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Im Lesemodus öffnen" })
    ).toBeVisible()
  },
}

const reportFirstLine =
  "Found three callers of registry.mjs that read public/r before the build writes it."
const reportSecondLine =
  "Each caller needs to wait for the registry build to finish."
const report = `\n  ${reportFirstLine}\n${reportSecondLine}`

/** Someone else's message folds to their label and first non-empty line. */
export const From: Story = {
  render: () => (
    <>
      <UserMessage>
        <UserMessageText>
          Find where the registry build first goes wrong.
        </UserMessageText>
      </UserMessage>
      <UserMessage
        from={{
          icon: <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />,
          label: "Subagent",
          summary: report,
        }}
      >
        <UserMessageText>{report}</UserMessageText>
        <UserMessageFooter>
          <span>12:03</span>
          <CopyButton value={report} />
        </UserMessageFooter>
      </UserMessage>
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", { level: 3, name: "Subagent" })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("heading", { level: 3, name: "You" })
    ).toBeInTheDocument()
    const button = canvas.getByRole("button", {
      expanded: false,
      name: /Subagent/,
    })
    await expect(button).toHaveTextContent("Subagent")
    await expect(button).toHaveTextContent(reportFirstLine)
    await expect(button).not.toHaveTextContent(reportSecondLine)
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-slot=user-message-from-content]"
    )!
    const text = canvas.getByText(
      (_, element) =>
        element?.getAttribute("data-slot") === "clamp-content" &&
        !!element.textContent?.includes(reportSecondLine)
    )
    await expect(text).not.toBeVisible()
    await expect(canvas.getByText("12:03")).not.toBeVisible()
    await expect(button).toHaveAttribute("aria-controls", content.id)
    await userEvent.click(button)
    await expect(button).toHaveAttribute("aria-expanded", "true")
    await expect(text).toBeVisible()
    await expect(canvas.getByText("12:03")).toBeInTheDocument()
    await expect(
      content.querySelector("[data-slot=user-message-footer]")
    ).toBeInTheDocument()
    button.focus()
    await userEvent.keyboard("{Enter}")
    await expect(button).toHaveAttribute("aria-expanded", "false")
    await expect(text).not.toBeVisible()
    await userEvent.keyboard(" ")
    await expect(button).toHaveAttribute("aria-expanded", "true")
    await expect(text).toBeVisible()
  },
}

/** The app controls whether the message is open. */
export const FromControlled: Story = {
  args: { onOpenChange: fn() },
  render: function Render(args) {
    const [open, setOpen] = React.useState(false)
    return (
      <UserMessage
        from={{ label: "Subagent", summary: report }}
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          args.onOpenChange?.(next)
        }}
      >
        <UserMessageText>{report}</UserMessageText>
      </UserMessage>
    )
  },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole("button", {
      expanded: false,
      name: /Subagent/,
    })
    await userEvent.click(button)
    await expect(args.onOpenChange).toHaveBeenCalledWith(true)
    await expect(button).toHaveAttribute("aria-expanded", "true")
    await expect(
      canvas.getByText(
        (_, element) =>
          element?.getAttribute("data-slot") === "clamp-content" &&
          !!element.textContent?.includes(reportSecondLine)
      )
    ).toBeVisible()
  },
}
