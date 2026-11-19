import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { HelpCircleIcon, Shield01Icon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import {
  AgentRequest,
  AgentRequestAnswer,
  AgentRequestContent,
  AgentRequestDescription,
  AgentRequestError,
  AgentRequestFooter,
  AgentRequestOption,
  AgentRequestOptions,
  AgentRequestStatus,
  AgentRequestTitle,
  type AgentRequestDecision,
} from "@/components/agent-request"
import { AgentTurnTarget } from "@/components/agent-turn"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireNavigation,
} from "@/components/ui/questionnaire"
import { asCoarse } from "@/stories/touch"

const decide = fn()

const meta = {
  title: "Blocks/Agent Request",
  component: AgentRequest,
  parameters: { layout: "padded" },
  beforeEach: () => {
    decide.mockClear()
  },
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AgentRequest>

export default meta
type Story = StoryObj<typeof meta>

const command = "git push origin main --follow-tags"

/**
 * The app's request to run a command, and its decision once made. Its
 * keys, in the card: Escape denies, Enter allows once.
 */
function Approval({
  decision,
  onDecide,
}: {
  decision?: AgentRequestDecision | undefined
  onDecide?: (choice: string) => void
}) {
  return (
    <AgentRequest
      icon={<HugeiconsIcon icon={Shield01Icon} strokeWidth={2} />}
      decision={decision}
      onKeyDown={(event) => {
        if (event.key === "Escape") onDecide?.("deny")
        // Not a button's own Enter, which presses it.
        if (event.key === "Enter" && event.target === event.currentTarget)
          onDecide?.("once")
      }}
    >
      <AgentRequestTitle>Allow the agent to push?</AgentRequestTitle>
      <AgentRequestDescription>
        It pushes main and the v0.1.9 tag to github.com/Bowl42/agentui. This
        can't be undone from here.
      </AgentRequestDescription>
      <AgentRequestContent>
        <CodeBlock size="sm">
          <CodeBlockContent wrap>{command}</CodeBlockContent>
        </CodeBlock>
      </AgentRequestContent>
      <AgentRequestFooter>
        <AgentRequestStatus>Asked 4s ago</AgentRequestStatus>
        <Button
          variant="outline"
          size="sm"
          aria-keyshortcuts="Escape"
          onClick={() => onDecide?.("deny")}
        >
          Deny <Kbd aria-hidden="true">Esc</Kbd>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDecide?.("always")}
        >
          Always allow
        </Button>
        <Button
          size="sm"
          aria-keyshortcuts="Enter"
          onClick={() => onDecide?.("once")}
        >
          Allow once <Kbd aria-hidden="true">↵</Kbd>
        </Button>
      </AgentRequestFooter>
    </AgentRequest>
  )
}

/** The agent asks to run a command: what, why, and the reader's choices. */
export const Approve: Story = {
  render: () => <Approval onDecide={decide} />,
  play: async ({ canvas }) => {
    const card = canvas.getByRole("group", {
      name: "Allow the agent to push?",
    })
    await expect(card).toHaveAccessibleDescription(/can't be undone/)
    // Why at 13px; the command a grey well, the sidebar's, a line 38px.
    await expect(
      getComputedStyle(
        card.querySelector("[data-slot=agent-request-description]")!
      ).fontSize
    ).toBe("13px")
    const command = card.querySelector<HTMLElement>("[data-slot=code-block]")!
    await expect(command.getBoundingClientRect().height).toBe(38)
    const side = document.createElement("div")
    side.style.backgroundColor = "var(--sidebar)"
    card.append(side)
    await expect(getComputedStyle(command).backgroundColor).toBe(
      getComputedStyle(side).backgroundColor
    )
    side.remove()
    // In dark, a 1px edge and a footer well darker than the card.
    if (document.documentElement.classList.contains("dark")) {
      await expect(getComputedStyle(card).boxShadow).toContain(
        "0px 0px 0px 1px"
      )
      const footer = card.querySelector("[data-slot=agent-request-footer]")!
      const lightness = (c: string) => Number(/\(([\d.]+)/.exec(c)?.[1])
      await expect(
        lightness(getComputedStyle(footer).backgroundColor)
      ).toBeLessThan(lightness(getComputedStyle(card).backgroundColor))
    }
    // Under a finger, its buttons 44px tall.
    const allow = canvas.getByRole("button", { name: /Allow once/ })
    await expect(
      asCoarse(card, () => allow.getBoundingClientRect().height)
    ).toBe(44)
    await userEvent.click(allow)
    await expect(decide).toHaveBeenCalledWith("once")
    // Its keys, shown in its buttons.
    await userEvent.keyboard("{Escape}")
    await expect(decide).toHaveBeenLastCalledWith("deny")
  },
}

const allowed: AgentRequestDecision = {
  summary: (
    <>
      Allowed <AgentTurnTarget code>git push origin main</AgentTurnTarget>
    </>
  ),
  meta: "Once · by you",
}

/**
 * Decided: one quiet row, what was asked and what came of it; opened, the
 * card as it was, without its choices.
 */
export const Decided: Story = {
  render: () => <Approval decision={allowed} onDecide={decide} />,
  play: async ({ canvas }) => {
    const row = canvas.getByRole("button", {
      name: "Allowed git push origin main Once · by you",
    })
    await expect(row).toHaveAttribute("aria-expanded", "false")
    await expect(row.offsetHeight).toBe(28)
    await expect(canvas.queryByRole("group")).toBeNull()
    await userEvent.click(row)
    const card = await canvas.findByRole("group", {
      name: "Allow the agent to push?",
    })
    await waitFor(() => expect(card).toBeVisible())
    await waitFor(() => expect(canvas.getByText(command)).toBeVisible())
    // To read: the choices are gone.
    await expect(
      canvas.queryByRole("button", { name: /Allow once/ })
    ).toBeNull()
  },
}

/** Allowed and denied look the same; only the words differ. */
export const Denied: Story = {
  render: () => (
    <AgentRequest
      icon={<HugeiconsIcon icon={Shield01Icon} strokeWidth={2} />}
      decision={{
        summary: (
          <>
            Denied <AgentTurnTarget code>rm -rf dist</AgentTurnTarget>
          </>
        ),
        meta: "By you",
      }}
    >
      <AgentRequestTitle>Allow the agent to delete dist?</AgentRequestTitle>
      <AgentRequestContent>
        <CodeBlock size="sm">
          <CodeBlockContent wrap>rm -rf dist</CodeBlockContent>
        </CodeBlock>
      </AgentRequestContent>
    </AgentRequest>
  ),
}

const choices = [
  {
    value: "pr",
    label: "Open a PR against main",
    description: "Recommended · CI runs before merge",
  },
  {
    value: "branch",
    label: "Push to a release branch",
    description: "release/v0.1.9",
  },
]

/**
 * The app's question: a `Questionnaire` around the card while it asks;
 * answered, the row, and the choices as they were to read.
 */
function Question({
  answer,
  onAnswer,
}: {
  answer?: string | undefined
  onAnswer?: (answer: string) => void
}) {
  const titleId = React.useId()
  const words = (
    <>
      <AgentRequestTitle id={titleId}>
        Where should the release go?
      </AgentRequestTitle>
      <AgentRequestDescription>
        main is protected; a PR needs one review.
      </AgentRequestDescription>
    </>
  )
  if (answer !== undefined)
    return (
      <AgentRequest
        icon={<HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />}
        decision={{
          summary: (
            <>
              Where should the release go?{" "}
              <AgentRequestAnswer>
                {choices.find((choice) => choice.value === answer)?.label ??
                  answer}
              </AgentRequestAnswer>
            </>
          ),
          meta: "Answered",
        }}
      >
        {words}
        <AgentRequestContent>
          <AgentRequestOptions>
            {choices.map((choice) => (
              <AgentRequestOption
                key={choice.value}
                chosen={choice.value === answer}
                description={choice.description}
              >
                {choice.label}
              </AgentRequestOption>
            ))}
          </AgentRequestOptions>
        </AgentRequestContent>
      </AgentRequest>
    )
  return (
    <Questionnaire
      defaultItem="target"
      shortcuts="numbers"
      items={[
        {
          name: "target",
          required: true,
          choices: choices.map(({ value }) => ({ value })),
        },
      ]}
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        onAnswer?.(String(data.get("target")))
      }}
    >
      <AgentRequest
        icon={<HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />}
      >
        {words}
        <AgentRequestContent>
          <QuestionnaireItem name="target" required aria-labelledby={titleId}>
            <QuestionnaireChoices>
              {choices.map((choice) => (
                <QuestionnaireChoice key={choice.value} value={choice.value}>
                  {choice.label}
                  <QuestionnaireChoiceDescription>
                    {choice.description}
                  </QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
          </QuestionnaireItem>
        </AgentRequestContent>
        <AgentRequestFooter>
          <QuestionnaireNavigation size="sm" labels={{ submit: "Answer" }} />
        </AgentRequestFooter>
      </AgentRequest>
    </Questionnaire>
  )
}

/**
 * A question from the agent: the same floating card, its choices a
 * `Questionnaire` (number keys choose); answered, a row with the answer.
 */
export const Ask: Story = {
  render: function Render() {
    const [answer, setAnswer] = React.useState<string>()
    return (
      <Question
        answer={answer}
        onAnswer={(value) => {
          decide(value)
          setAnswer(value)
        }}
      />
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("radio", { name: /Open a PR against main/ })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Answer" }))
    await expect(decide).toHaveBeenCalledWith("pr")
    const row = await canvas.findByRole("button", {
      name: "Where should the release go? Open a PR against main Answered",
    })
    await userEvent.click(row)
    const chosen = await canvas.findByRole("listitem", { current: true })
    await expect(chosen).toHaveTextContent(/^Open a PR against main/)
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2)
    await expect(canvas.queryByRole("radio")).toBeNull()
    await expect(canvas.queryByRole("button", { name: "Answer" })).toBeNull()
  },
}

/** A question while it asks: the choices numbered, the default last. */
export const Asking: Story = {
  render: () => <Question onAnswer={decide} />,
  play: async ({ canvas }) => {
    // The card, and the choices' fieldset in it.
    const [card] = canvas.getAllByRole("group", {
      name: "Where should the release go?",
    })
    await expect(card).toHaveAccessibleDescription(
      "main is protected; a PR needs one review."
    )
    await expect(canvas.getAllByRole("radio")).toHaveLength(2)
    // One answer: its number alone leads each choice, no radio.
    for (const dot of document.querySelectorAll(
      "[data-slot=questionnaire-choice-indicator]"
    ))
      await expect(dot).not.toBeVisible()
  },
}

const checks = [
  { value: "lint", label: "Lint", description: "ESLint and Prettier" },
  { value: "types", label: "Type-check", description: "tsc -b" },
  { value: "tests", label: "Story tests", description: "Three browsers" },
  { value: "build", label: "Build", description: "Storybook" },
]

/**
 * A question of several answers while it asks: each choice a checkbox
 * after its number, those chosen checked.
 */
export const AskingSeveral: Story = {
  render: function Render() {
    const titleId = React.useId()
    return (
      <Questionnaire
        defaultItem="checks"
        shortcuts="numbers"
        items={[{ name: "checks", choices: checks }]}
      >
        <AgentRequest
          icon={<HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />}
        >
          <AgentRequestTitle id={titleId}>
            Which checks should run before the push?
          </AgentRequestTitle>
          <AgentRequestDescription>Choose any.</AgentRequestDescription>
          <AgentRequestContent>
            <QuestionnaireItem name="checks" multiple aria-labelledby={titleId}>
              <QuestionnaireChoices>
                {checks.map((check) => (
                  <QuestionnaireChoice key={check.value} value={check.value}>
                    {check.label}
                    <QuestionnaireChoiceDescription>
                      {check.description}
                    </QuestionnaireChoiceDescription>
                  </QuestionnaireChoice>
                ))}
              </QuestionnaireChoices>
            </QuestionnaireItem>
          </AgentRequestContent>
          <AgentRequestFooter>
            <QuestionnaireNavigation size="sm" labels={{ submit: "Answer" }} />
          </AgentRequestFooter>
        </AgentRequest>
      </Questionnaire>
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: /Lint/ }))
    await userEvent.click(canvas.getByRole("checkbox", { name: /Story tests/ }))
    await expect(canvas.getByRole("checkbox", { name: /Lint/ })).toBeChecked()
    // Each choice shows its checkbox, those chosen filled as the
    // primary button is.
    const boxes = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-slot=questionnaire-choice-indicator]"
      ),
    ]
    await expect(boxes).toHaveLength(4)
    for (const box of boxes) await waitFor(() => expect(box).toBeVisible())
    const answer = canvas.getByRole("button", { name: "Answer" })
    const fill = getComputedStyle(answer).backgroundColor
    await expect(getComputedStyle(boxes[0]!).backgroundColor).toBe(fill)
    await expect(getComputedStyle(boxes[1]!).backgroundColor).not.toBe(fill)
  },
}

/** On a phone: the row and the choices take a finger. */
export const Phone: Story = {
  render: () => (
    <div className="flex w-[358px] flex-col gap-4">
      <Approval onDecide={decide} />
      <Approval decision={allowed} />
    </div>
  ),
  play: async ({ canvas }) => {
    // The default first, across; the other choices sharing the line
    // under it, each a finger's height; the status a line under them.
    const once = canvas.getByRole("button", { name: /Allow once/ })
    const deny = canvas.getByRole("button", { name: "Deny" })
    const always = canvas.getByRole("button", { name: "Always allow" })
    // Once its container is measured.
    await waitFor(() => expect(deny.offsetWidth).toBeGreaterThan(120))
    await expect(always.offsetTop).toBe(deny.offsetTop)
    await expect(once.offsetTop).toBeLessThan(deny.offsetTop)
    await expect(once.offsetWidth).toBeGreaterThan(300)
    // Once grown to it.
    for (const button of [once, deny, always])
      await waitFor(() => expect(button.offsetHeight).toBe(44))
    const status = canvas.getByText("Asked 4s ago")
    await expect(status).toBeVisible()
    await expect(status.offsetTop).toBeGreaterThan(deny.offsetTop)
    await expect(
      canvas.getByRole("button", { name: /Allowed git push/ }).offsetWidth
      // With its focus ring's room either side.
    ).toBeLessThanOrEqual(358 + 16)
  },
}

/**
 * A notice of one action in the composer's place (`collapsible={false}`:
 * no chevron), and why the action did not go through, over its footer.
 */
export const Notice: Story = {
  render: () => (
    <AgentRequest collapsible={false}>
      <AgentRequestTitle>Sign in to go on</AgentRequestTitle>
      <AgentRequestDescription>
        The session expired while the agent was working.
      </AgentRequestDescription>
      <AgentRequestError>Could not reach the server.</AgentRequestError>
      <AgentRequestFooter>
        <Button size="sm">Sign in</Button>
      </AgentRequestFooter>
    </AgentRequest>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvasElement.querySelector("[data-slot=agent-request-toggle]")
    ).toBeNull()
    const error = canvas.getByRole("alert")
    await expect(error).toHaveTextContent("Could not reach the server.")
    const footer = canvasElement.querySelector(
      "[data-slot=agent-request-footer]"
    )!
    await expect(error.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      footer.getBoundingClientRect().top
    )
  },
}

/**
 * Of its title and one choice alone: one row, 44px, the choice at its
 * end on the card, no band under it and nothing to fold; narrow too.
 */
export const OneRow: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <AgentRequest icon={<Spinner />}>
        <AgentRequestTitle>Working in another app</AgentRequestTitle>
        <AgentRequestFooter>
          <Button size="sm">Take over</Button>
        </AgentRequestFooter>
      </AgentRequest>
      <div className="w-80">
        <AgentRequest icon={<Spinner />}>
          <AgentRequestTitle>Working in another app</AgentRequestTitle>
          <AgentRequestFooter>
            <Button size="sm">Take over</Button>
          </AgentRequestFooter>
        </AgentRequest>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const cards = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=agent-request-card]"
      ),
    ]
    await expect(cards).toHaveLength(2)
    for (const card of cards) {
      await waitFor(() => expect(card.getBoundingClientRect().height).toBe(44))
      if (matchMedia("(pointer: fine)").matches)
        await expect(
          within(card)
            .getByRole("button", { name: "Take over" })
            .getBoundingClientRect().height
        ).toBe(28)
      const title = within(card).getByText("Working in another app")
      const button = within(card).getByRole("button", { name: "Take over" })
      const middle = (box: DOMRect) => box.top + box.height / 2
      await expect(
        Math.abs(
          middle(title.getBoundingClientRect()) -
            middle(button.getBoundingClientRect())
        )
      ).toBeLessThanOrEqual(1)
      await expect(
        card.getBoundingClientRect().right -
          button.getBoundingClientRect().right
      ).toBeCloseTo(16, 0)
      const footer = card.querySelector<HTMLElement>(
        "[data-slot=agent-request-footer]"
      )!
      await expect(getComputedStyle(footer).borderTopWidth).toBe("0px")
      await expect(getComputedStyle(footer).backgroundColor).toBe(
        "rgba(0, 0, 0, 0)"
      )
      await expect(
        card.querySelector("[data-slot=agent-request-toggle]")
      ).not.toBeVisible()
    }
  },
}

/**
 * While it asks, its chevron folds it to its title, so the conversation
 * over it can be read; its title or the chevron opens it again, as it
 * was left, the choice made still made.
 */
export const Collapse: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Approval onDecide={decide} />
      <Question onAnswer={decide} />
    </div>
  ),
  play: async ({ canvas }) => {
    const card = canvas.getByRole("group", {
      name: "Allow the agent to push?",
    })
    const open = card.getBoundingClientRect().height
    const toggle = within(card).getByRole("button", { name: "Collapse" })
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    // Its title clear of the chevron.
    const title = card.querySelector("[data-slot=agent-request-title]")!
    const words = document.createRange()
    words.selectNodeContents(title)
    await expect(words.getBoundingClientRect().right).toBeLessThanOrEqual(
      toggle.getBoundingClientRect().left
    )

    await userEvent.click(toggle)
    await expect(toggle).toHaveAccessibleName("Expand")
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(title).toBeVisible()
    await expect(
      card.querySelector("[data-slot=agent-request-description]")
    ).not.toBeVisible()
    await expect(
      within(card).queryByRole("button", { name: /Allow once/ })
    ).toBeNull()
    // One line: its title in the card's padding.
    await expect(card.getBoundingClientRect().height).toBe(48)
    await expect(card.getBoundingClientRect().height).toBeLessThan(open)
    await expect(decide).not.toHaveBeenCalled()

    // Its title opens it.
    await userEvent.click(title)
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await expect(
      within(card).getByRole("button", { name: /Allow once/ })
    ).toBeVisible()
    await expect(card.getBoundingClientRect().height).toBe(open)

    // A question folded and opened keeps the choice made.
    const [question] = canvas.getAllByRole("group", {
      name: "Where should the release go?",
    })
    await userEvent.click(
      canvas.getByRole("radio", { name: /Open a PR against main/ })
    )
    const fold = within(question!).getByRole("button", { name: "Collapse" })
    await userEvent.click(fold)
    await expect(canvas.queryByRole("radio")).toBeNull()
    await userEvent.click(fold)
    await expect(
      canvas.getByRole("radio", { name: /Open a PR against main/ })
    ).toBeChecked()
  },
}

/** Its words, from the app. */
export const CollapseLabels: Story = {
  render: () => (
    <AgentRequest labels={{ collapse: "Einklappen", expand: "Ausklappen" }}>
      <AgentRequestTitle>Push erlauben?</AgentRequestTitle>
    </AgentRequest>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Einklappen" })
    await userEvent.click(toggle)
    await expect(toggle).toHaveAccessibleName("Ausklappen")
  },
}
