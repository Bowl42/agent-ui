import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { HelpCircleIcon, Shield01Icon } from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import {
  AgentRequest,
  AgentRequestAnswer,
  AgentRequestContent,
  AgentRequestDescription,
  AgentRequestFooter,
  AgentRequestHeader,
  AgentRequestOption,
  AgentRequestOptions,
  AgentRequestQuestion,
  AgentRequestStatus,
  AgentRequestTitle,
  type AgentRequestDecision,
} from "@/components/agent-request"
import { AgentTurnTarget } from "@/components/agent-turn"
import {
  Composer,
  ComposerEditor,
  ComposerSubmit,
  ComposerToolbar,
  ComposerTakeover,
} from "@/components/composer"
import { Button } from "@/components/ui/button"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import { Kbd } from "@/components/ui/kbd"
import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNavigation,
  QuestionnaireProgress,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import { rendered, timersRun } from "@/stories/wait"

const stop = fn()
const decideArrival = fn()

const meta = {
  title: "Components/Composer Takeover",
  component: ComposerTakeover,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    stop.mockClear()
    decideArrival.mockClear()
  },
} satisfies Meta<typeof ComposerTakeover>

export default meta
type Story = StoryObj<typeof meta>

/** What the app has waiting: commands to allow, and questions. */
type Pending =
  | { kind: "approval"; id: string; command: string; why: string }
  | { kind: "question"; id: string }
  | { kind: "questions"; id: string }

const shield = <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} />
const help = <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />

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

const push = {
  kind: "approval",
  id: "push",
  command: "git push origin main --follow-tags",
  why: "It pushes main and the v0.1.9 tag. This can't be undone from here.",
} satisfies Pending
const question = { kind: "question", id: "target" } satisfies Pending
const questions = { kind: "questions", id: "release" } satisfies Pending

/** The card for an approval; Escape denies, Enter on the card allows. */
function ApprovalCard({
  request,
  onDecide,
}: {
  request: Extract<Pending, { kind: "approval" }>
  onDecide: (choice: string) => void
}) {
  return (
    <AgentRequest
      icon={shield}
      onKeyDown={(event) => {
        if (event.key === "Escape") onDecide("Denied")
        if (event.key === "Enter" && event.target === event.currentTarget)
          onDecide("Allowed")
      }}
    >
      <AgentRequestTitle>Allow the agent to run this?</AgentRequestTitle>
      <AgentRequestDescription>{request.why}</AgentRequestDescription>
      <AgentRequestContent>
        <CodeBlock size="sm">
          <CodeBlockContent wrap>{request.command}</CodeBlockContent>
        </CodeBlock>
      </AgentRequestContent>
      <AgentRequestFooter>
        <AgentRequestStatus>Asked 4s ago</AgentRequestStatus>
        <Button
          variant="outline"
          size="sm"
          aria-keyshortcuts="Escape"
          onClick={() => onDecide("Denied")}
        >
          Deny <Kbd aria-hidden="true">Esc</Kbd>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDecide("Always allowed")}
        >
          Always allow
        </Button>
        <Button
          size="sm"
          aria-keyshortcuts="Enter"
          onClick={() => onDecide("Allowed")}
        >
          Allow once <Kbd aria-hidden="true">↵</Kbd>
        </Button>
      </AgentRequestFooter>
    </AgentRequest>
  )
}

function Question({ onAnswer }: { onAnswer: (answer: string) => void }) {
  const titleId = React.useId()
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
        onAnswer(String(data.get("target")))
      }}
    >
      <AgentRequest icon={help}>
        <AgentRequestTitle id={titleId}>
          Where should the release go?
        </AgentRequestTitle>
        <AgentRequestDescription>
          main is protected; a PR needs one review.
        </AgentRequestDescription>
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

/** Several questions in one request: single, multiple, text, single. */
const several: {
  name: string
  title: string
  required?: boolean
  multiple?: boolean
  choices?: { value: string; label: string; description?: string }[]
}[] = [
  {
    name: "target",
    title: "Where should the release go?",
    required: true,
    choices,
  },
  {
    name: "checks",
    title: "Which checks should run before it?",
    multiple: true,
    choices: [
      { value: "lint", label: "Lint and types", description: "About a minute" },
      { value: "unit", label: "Unit tests", description: "About 4 minutes" },
      {
        value: "e2e",
        label: "End-to-end tests",
        description: "About 20 minutes",
      },
    ],
  },
  { name: "notes", title: "Anything to add to the release notes?" },
  {
    name: "announce",
    title: "When should it be announced?",
    required: true,
    choices: [
      { value: "now", label: "As soon as it is out" },
      { value: "monday", label: "On Monday morning" },
    ],
  },
]

type Answers = Record<string, string[]>

/**
 * The agent's questions, one at a time in the card: its progress and the
 * way through in the footer (Previous, Skip, Next, Submit, each where it
 * applies), and the app's own way out of the whole request.
 */
function Questions({
  onAnswer,
  onDismiss,
  onStatusChange,
}: {
  onAnswer: (answers: Answers) => void
  onDismiss: () => void
  onStatusChange: (name: string, status: string) => void
}) {
  return (
    <Questionnaire
      defaultItem="target"
      shortcuts="numbers"
      items={several.map(({ name, required, choices }) => ({
        name,
        required: required ?? false,
        ...(choices && { choices: choices.map(({ value }) => ({ value })) }),
      }))}
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        onAnswer(
          Object.fromEntries(
            several.map(({ name }) => [
              name,
              data.getAll(name).map(String).filter(Boolean),
            ])
          )
        )
      }}
    >
      <AgentRequest>
        <AgentRequestHeader icon={help}>
          The agent has 4 questions
        </AgentRequestHeader>
        <AgentRequestContent>
          {several.map((question) => (
            <QuestionnaireItem
              key={question.name}
              name={question.name}
              required={question.required ?? false}
              multiple={question.multiple ?? false}
              onStatusChange={(status) => onStatusChange(question.name, status)}
            >
              <QuestionnaireTitle>{question.title}</QuestionnaireTitle>
              {question.choices ? (
                <QuestionnaireChoices>
                  {question.choices.map((choice) => (
                    <QuestionnaireChoice
                      key={choice.value}
                      value={choice.value}
                    >
                      {choice.label}
                      {choice.description && (
                        <QuestionnaireChoiceDescription>
                          {choice.description}
                        </QuestionnaireChoiceDescription>
                      )}
                    </QuestionnaireChoice>
                  ))}
                </QuestionnaireChoices>
              ) : (
                <QuestionnaireInput
                  aria-label={question.title}
                  placeholder="Type an answer, or skip"
                />
              )}
              <QuestionnaireError />
            </QuestionnaireItem>
          ))}
        </AgentRequestContent>
        <AgentRequestFooter>
          <QuestionnaireProgress />
          <QuestionnaireNavigation
            size="sm"
            onDecline={onDismiss}
            labels={{
              decline: "Dismiss",
              next: (
                <>
                  Next <Kbd aria-hidden="true">↵</Kbd>
                </>
              ),
              submit: (
                <>
                  Answer <Kbd aria-hidden="true">↵</Kbd>
                </>
              ),
            }}
          />
        </AgentRequestFooter>
      </AgentRequest>
    </Questionnaire>
  )
}

/** The questions as they were answered, to read once decided. */
function SeveralAnswered({ answers }: { answers: Answers }) {
  return (
    <>
      <AgentRequestTitle>The agent had 4 questions</AgentRequestTitle>
      <AgentRequestContent>
        {several.map((question) => {
          const answer = answers[question.name] ?? []
          return (
            <AgentRequestQuestion
              key={question.name}
              title={question.title}
              {...(!answer.length && { meta: "Skipped" })}
            >
              <AgentRequestOptions>
                {question.choices
                  ? question.choices.map((choice) => (
                      <AgentRequestOption
                        key={choice.value}
                        chosen={answer.includes(choice.value)}
                      >
                        {choice.label}
                      </AgentRequestOption>
                    ))
                  : answer.map((text) => (
                      <AgentRequestOption key={text} chosen>
                        {text}
                      </AgentRequestOption>
                    ))}
              </AgentRequestOptions>
            </AgentRequestQuestion>
          )
        })}
      </AgentRequestContent>
    </>
  )
}

/** "3 answered, 1 skipped": what came of several questions. */
const tally = (answers: Answers) => {
  const answered = Object.values(answers).filter((a) => a.length).length
  const skipped = several.length - answered
  return skipped ? `${answered} answered, ${skipped} skipped` : "All answered"
}

const summaryOf = (request: Pending): React.ReactNode =>
  request.kind === "approval" ? (
    <AgentTurnTarget code>{request.command}</AgentTurnTarget>
  ) : request.kind === "questions" ? (
    `${several.length} questions`
  ) : (
    "Where should the release go?"
  )

/**
 * The app's conversation: the decided rows and a quiet row for what
 * waits in the transcript, and at its foot the takeover, approvals
 * before questions (the app's order), one at a time.
 */
function Conversation({ initial }: { initial: Pending[] }) {
  const [pending, setPending] = React.useState(initial)
  const [decided, setDecided] = React.useState<
    {
      id: string
      icon: React.ReactNode
      decision: AgentRequestDecision
      card?: React.ReactNode
    }[]
  >([])
  // The question set aside, by its id: a new one shows.
  const [aside, setAside] = React.useState<string | null>(null)
  // Several questions' statuses, for the waiting row's progress.
  const [statuses, setStatuses] = React.useState<Record<string, string>>({})
  const answered = Object.values(statuses).filter(
    (status) => status === "answered"
  ).length

  const approvals = pending.filter((request) => request.kind === "approval")
  const current =
    approvals.at(0) ?? pending.find((request) => request.kind !== "approval")
  const decide = (
    request: Pending,
    decision: AgentRequestDecision,
    card?: React.ReactNode
  ) => {
    setPending((all) => all.filter((other) => other.id !== request.id))
    setDecided((all) => [
      ...all,
      {
        id: request.id,
        icon: request.kind === "approval" ? shield : help,
        decision,
        card,
      },
    ])
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-column flex-col justify-end gap-6 p-4">
      <div className="flex flex-col gap-1">
        <p className="mb-2 text-sm">
          The release is ready: the changelog is written and the tag is set.
        </p>
        {decided.map((row) => (
          <AgentRequest key={row.id} icon={row.icon} decision={row.decision}>
            {row.card}
          </AgentRequest>
        ))}
        {current && (
          <AgentRequest
            icon={current.kind === "approval" ? shield : help}
            waiting={{
              summary: summaryOf(current),
              meta:
                current.kind === "questions" && answered
                  ? `${answered} of ${several.length} answered · Waiting below`
                  : "Waiting for you below",
            }}
          />
        )}
      </div>
      <ComposerTakeover
        request={
          current?.kind === "approval" ? (
            <ApprovalCard
              key={current.id}
              request={current}
              onDecide={(choice) =>
                decide(current, {
                  summary: (
                    <>
                      {choice} {summaryOf(current)}
                    </>
                  ),
                  meta: "By you",
                })
              }
            />
          ) : current?.kind === "questions" ? (
            <Questions
              key={current.id}
              onStatusChange={(name, status) =>
                setStatuses((all) => ({ ...all, [name]: status }))
              }
              onAnswer={(answers) =>
                decide(
                  current,
                  {
                    summary: (
                      <>
                        {summaryOf(current)}{" "}
                        <AgentRequestAnswer>
                          {tally(answers)}
                        </AgentRequestAnswer>
                      </>
                    ),
                    meta: "By you",
                  },
                  <SeveralAnswered answers={answers} />
                )
              }
              onDismiss={() =>
                decide(current, {
                  summary: summaryOf(current),
                  meta: "Dismissed",
                })
              }
            />
          ) : current ? (
            <Question
              key={current.id}
              onAnswer={(answer) =>
                decide(current, {
                  summary: (
                    <>
                      {summaryOf(current)}{" "}
                      <AgentRequestAnswer>
                        {choices.find((choice) => choice.value === answer)
                          ?.label ?? answer}
                      </AgentRequestAnswer>
                    </>
                  ),
                  meta: "Answered",
                })
              }
            />
          ) : undefined
        }
        status={
          approvals.length > 1
            ? `${approvals.length} waiting`
            : approvals.length
              ? "Needs your approval"
              : current?.kind === "questions"
                ? "Questions for you"
                : "A question for you"
        }
        onStop={stop}
        {...(current &&
          current.kind !== "approval" && {
            aside: aside === current.id,
            onAsideChange: (next: boolean) =>
              setAside(next ? current.id : null),
          })}
      >
        <Composer defaultValue={["Then bump the version"]}>
          <ComposerEditor aria-label="Message" />
          <ComposerToolbar>
            <ComposerSubmit className="ms-auto" />
          </ComposerToolbar>
        </Composer>
      </ComposerTakeover>
    </div>
  )
}

/**
 * An approval in the composer's place, in its frame; the composer is
 * hidden, not gone. Decided, the transcript keeps its row, the composer
 * comes back with its draft and focus goes to it.
 */
export const Approval: Story = {
  render: () => <Conversation initial={[push]} />,
  play: async ({ canvas }) => {
    const card = canvas.getByRole("group", {
      name: "Allow the agent to run this?",
    })
    await waitFor(() => expect(card).toHaveFocus())
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Needs your approval"
    )
    await expect(canvas.getByText("Waiting for you below")).toBeVisible()
    // The composer stays mounted, hidden and inert.
    const editor = canvas.getByRole("textbox", { hidden: true })
    await expect(editor).not.toBeVisible()
    await expect(editor.closest("[inert]")).not.toBeNull()
    // The same width as the composer it stands in for.
    const takeover = card.closest<HTMLElement>(
      '[data-slot="composer-takeover"]'
    )
    await expect(card.offsetWidth).toBe(takeover?.offsetWidth)

    await userEvent.click(canvas.getByRole("button", { name: "Stop" }))
    await expect(stop).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole("button", { name: /Allow once/ }))

    await expect(
      await canvas.findByRole("button", {
        name: "Allowed git push origin main --follow-tags By you",
      })
    ).toBeVisible()
    await expect(canvas.queryByText("Waiting for you below")).toBeNull()
    const message = canvas.getByRole("textbox", { name: "Message" })
    await expect(message).toBeVisible()
    await expect(message).toHaveTextContent("Then bump the version")
    await waitFor(() => expect(message).toHaveFocus())
    await expect(canvas.getByRole("status")).toBeEmptyDOMElement()
  },
}

/**
 * A question can be set aside to chat: the composer shows with what was
 * typed, and the question comes back as it was left.
 */
export const SetAside: Story = {
  render: () => <Conversation initial={[question]} />,
  play: async ({ canvas }) => {
    const [card] = canvas.getAllByRole("group", {
      name: "Where should the release go?",
    })
    await waitFor(() => expect(card).toHaveFocus())
    await userEvent.click(
      canvas.getByRole("radio", { name: /Push to a release branch/ })
    )

    await userEvent.click(canvas.getByRole("button", { name: "Chat instead" }))
    const message = canvas.getByRole("textbox", { name: "Message" })
    await waitFor(() => expect(message).toHaveFocus())
    await expect(card).not.toBeVisible()
    await userEvent.keyboard(", and tag it")
    await expect(message).toHaveTextContent("Then bump the version, and tag it")

    await userEvent.click(
      canvas.getByRole("button", { name: "Back to question" })
    )
    await waitFor(() => expect(card).toHaveFocus())
    await expect(message).not.toBeVisible()
    // The choice made before is still made.
    await expect(
      canvas.getByRole("radio", { name: /Push to a release branch/ })
    ).toBeChecked()

    await userEvent.click(canvas.getByRole("button", { name: "Chat instead" }))
    await expect(message).toHaveTextContent("Then bump the version, and tag it")
    await userEvent.click(
      canvas.getByRole("button", { name: "Back to question" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Answer" }))
    await expect(
      await canvas.findByRole("button", {
        name: "Where should the release go? Push to a release branch Answered",
      })
    ).toBeVisible()
    await waitFor(() => expect(message).toHaveFocus())
  },
}

const waiting: Pending[] = [
  push,
  question,
  {
    kind: "approval",
    id: "publish",
    command: "pnpm publish --tag next",
    why: "It publishes 0.1.9 to the npm registry.",
  },
  {
    kind: "approval",
    id: "release",
    command: "gh release create v0.1.9 --generate-notes",
    why: "It creates the GitHub release for the tag.",
  },
]

/**
 * Several waiting: one at a time, approvals first, the count in the
 * line over it; each decision brings the next, with focus.
 */
export const SeveralWaiting: Story = {
  render: () => <Conversation initial={waiting} />,
  play: async ({ canvas }) => {
    const status = canvas.getByRole("status")
    await expect(status).toHaveTextContent("3 waiting")
    await expect(canvas.getAllByRole("group")).toHaveLength(1)
    await expect(canvas.queryByRole("button", { name: "Chat instead" })).toBe(
      null
    )
    await userEvent.click(canvas.getByRole("button", { name: /Allow once/ }))
    await waitFor(() => expect(status).toHaveTextContent("2 waiting"))
    const card = canvas.getByRole("group", {
      name: "Allow the agent to run this?",
    })
    await expect(card).toHaveTextContent("pnpm publish --tag next")
    await waitFor(() => expect(card).toHaveFocus())
    // Its keys work where focus is.
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(status).toHaveTextContent("Needs your approval"))
    await userEvent.keyboard("{Enter}")
    // Approvals done, the question.
    await waitFor(() => expect(status).toHaveTextContent("A question for you"))
    await expect(
      canvas.getByRole("button", { name: "Chat instead" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", {
        name: "Denied pnpm publish --tag next By you",
      })
    ).toBeVisible()
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
 * On a phone it sits at the foot, in the thumb's reach: the request's
 * phone footer, the default across, the others under it at a finger's
 * size.
 */
export const Phone: Story = {
  ...phoneWidth,
  render: () => <Conversation initial={[push]} />,
  play: async ({ canvas, canvasElement }) => {
    const once = canvas.getByRole("button", { name: /Allow once/ })
    const deny = canvas.getByRole("button", { name: "Deny" })
    await waitFor(() => expect(once.offsetWidth).toBeGreaterThan(300))
    await waitFor(() =>
      expect(once.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        deny.getBoundingClientRect().top
      )
    )
    await waitFor(() => expect(deny.offsetHeight).toBe(44))
    const takeover = canvasElement.querySelector<HTMLElement>(
      '[data-slot="composer-takeover"]'
    )
    // At the foot of the screen, its padding under it.
    const bottom = takeover?.getBoundingClientRect().bottom ?? 0
    await expect(window.innerHeight - bottom).toBeLessThanOrEqual(16.5)
  },
}

/** Tabs forward to the button named so; the keyboard's own way there. */
async function tabTo(name: string) {
  for (let step = 0; step < 8; step++) {
    if (document.activeElement?.textContent === name) return
    await userEvent.tab()
  }
}

/**
 * Several questions in one request, one at a time: the progress first
 * in the footer, then the app's Dismiss and the way through, each where
 * it applies (Previous but on the first, Skip on an optional one, Next,
 * Submit on the last). Choosing a single choice goes on; a multiple
 * choice or a text goes on with Enter. All by the keyboard here.
 */
export const SeveralQuestions: Story = {
  render: () => <Conversation initial={[questions]} />,
  play: async ({ canvas }) => {
    const card = canvas.getByRole("group", {
      name: "The agent has 4 questions",
    })
    await waitFor(() => expect(card).toHaveFocus())
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Questions for you"
    )
    const progress = canvas.getByRole("progressbar")
    const at = (n: number) =>
      waitFor(() => expect(progress).toHaveTextContent(`Question ${n} of 4`))
    await at(1)
    // The first, required: no Previous, no Skip; Next goes on.
    await expect(canvas.queryByRole("button", { name: "Previous" })).toBeNull()
    await expect(canvas.queryByRole("button", { name: "Skip" })).toBeNull()
    await expect(canvas.getByRole("button", { name: "Next" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Dismiss" })).toBeVisible()

    // A single choice: its number key chooses it and goes on.
    await userEvent.keyboard("1")
    await at(2)
    await expect(
      canvas.getByText("1 of 4 answered · Waiting below")
    ).toBeVisible()
    // Several choices: number keys toggle them, Enter goes on.
    await userEvent.keyboard("13")
    await expect(
      canvas.getByRole("checkbox", { name: /End-to-end tests/ })
    ).toBeChecked()
    await userEvent.keyboard("{Enter}")
    await at(3)
    // A text: typed in where it comes; Enter goes on.
    const notes = canvas.getByRole("textbox", {
      name: "Anything to add to the release notes?",
    })
    await waitFor(() => expect(notes).toHaveFocus())
    await userEvent.keyboard("Thanks to everyone{Enter}")
    await at(4)
    // The last: Previous back, and this one skipped after all.
    await expect(canvas.queryByRole("button", { name: "Next" })).toBeNull()
    await userEvent.keyboard("{ArrowLeft}")
    await at(3)
    await waitFor(() => expect(notes).toHaveFocus())
    await tabTo("Skip")
    await expect(canvas.getByRole("button", { name: "Skip" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await at(4)
    // A single choice on the last waits for Submit.
    await timersRun(() => userEvent.keyboard("2"))
    await expect(
      canvas.getByRole("radio", { name: "On Monday morning" })
    ).toBeChecked()
    await at(4)
    await expect(canvas.getByRole("button", { name: "Answer" })).toBeVisible()
    await userEvent.keyboard("{Enter}")

    const row = await canvas.findByRole("button", {
      name: "4 questions 3 answered, 1 skipped By you",
    })
    const message = canvas.getByRole("textbox", { name: "Message" })
    await waitFor(() => expect(message).toHaveFocus())
    // Opened, each question as it was answered.
    await userEvent.click(row)
    await expect(row).toHaveAttribute("aria-expanded", "true")
    const notesRead = canvas.getByRole("region", {
      name: "Anything to add to the release notes?",
    })
    await expect(notesRead).toHaveTextContent("Skipped")
    const checks = canvas.getByRole("region", {
      name: "Which checks should run before it?",
    })
    await expect(
      Array.from(checks.querySelectorAll("[aria-current]"), (option) =>
        option.textContent?.trim()
      )
    ).toEqual(["Lint and types", "End-to-end tests"])
  },
}

/** The way through by pointer: a choice goes on, Previous comes back. */
export const SeveralQuestionsByPointer: Story = {
  render: () => <Conversation initial={[questions]} />,
  play: async ({ canvas }) => {
    const progress = canvas.getByRole("progressbar")
    await userEvent.click(
      canvas.getByRole("radio", { name: /Push to a release branch/ })
    )
    await waitFor(() => expect(progress).toHaveTextContent("Question 2 of 4"))
    await userEvent.click(canvas.getByRole("button", { name: "Previous" }))
    await waitFor(() => expect(progress).toHaveTextContent("Question 1 of 4"))
    await expect(
      canvas.getByRole("radio", { name: /Push to a release branch/ })
    ).toBeChecked()
    // The arrow keys move between the options, and do not go on.
    await timersRun(() => userEvent.keyboard("{ArrowUp}"))
    await expect(progress).toHaveTextContent("Question 1 of 4")
    await userEvent.click(canvas.getByRole("button", { name: "Next" }))
    await waitFor(() => expect(progress).toHaveTextContent("Question 2 of 4"))
    // The app's way out of the whole request.
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss" }))
    await expect(
      await canvas.findByRole("button", { name: "4 questions Dismissed" })
    ).toBeVisible()
  },
}

/**
 * On a phone: Next (or Submit) across, first; the progress, Dismiss and
 * the others on the line under it, a finger's size.
 */
export const SeveralQuestionsPhone: Story = {
  ...phoneWidth,
  render: () => <Conversation initial={[questions]} />,
  play: async ({ canvas }) => {
    const progress = canvas.getByRole("progressbar")
    await userEvent.click(canvas.getByRole("radio", { name: /Open a PR/ }))
    await waitFor(() => expect(progress).toHaveTextContent("Question 2 of 4"))
    const next = canvas.getByRole("button", { name: "Next" })
    const previous = canvas.getByRole("button", { name: "Previous" })
    const skip = canvas.getByRole("button", { name: "Skip" })
    const dismiss = canvas.getByRole("button", { name: "Dismiss" })
    await waitFor(() => expect(next.offsetWidth).toBeGreaterThan(300))
    await expect(next.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      skip.getBoundingClientRect().top
    )
    for (const button of [next, previous, skip, dismiss])
      await waitFor(() => expect(button.offsetHeight).toBe(44))
    // The line under it: its centres line up.
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect()
      return box.top + box.height / 2
    }
    for (const element of [previous, skip, dismiss])
      await expect(middle(element)).toBeCloseTo(middle(progress), 0)
  },
}

/**
 * Several questions, as they first show: a header bar over the first,
 * its progress and Next. The question at the card's 16px padding, the
 * numbers a pixel past it (a choice's transparent edge), a choice's
 * words after its number, and a choice with a description 46px, its
 * description 12px.
 */
export const SeveralQuestionsAsking: Story = {
  render: () => <Conversation initial={[questions]} />,
  play: async ({ canvas }) => {
    const card = canvas.getByRole("group", {
      name: "The agent has 4 questions",
    })
    await waitFor(() => expect(card).toHaveFocus())
    const header = card.querySelector("[data-slot=agent-request-header]")!
    await expect(header.getBoundingClientRect().height).toBe(40)
    const left = card.getBoundingClientRect().left
    const x = (element: Element) => element.getBoundingClientRect().left - left
    const choice = canvas
      .getByRole("radio", { name: /Open a PR/ })
      .closest("[data-slot=questionnaire-choice]")!
    const item = choice.closest("[data-slot=questionnaire-item]")!
    await expect(
      x(item.querySelector("[data-slot=questionnaire-title]")!)
    ).toBe(16)
    await expect(
      x(choice.querySelector("[data-slot=questionnaire-choice-shortcut]")!)
    ).toBe(17)
    await expect(
      x(choice.querySelector("[data-slot=questionnaire-choice-label]")!)
    ).toBe(37)
    await expect(choice.getBoundingClientRect().height).toBe(46)
    const description = choice.querySelector(
      "[data-slot=questionnaire-choice-description]"
    )!
    await expect(getComputedStyle(description).fontSize).toBe("12px")
    // The row waiting in the conversation, 13px as a step.
    await expect(
      getComputedStyle(canvas.getByText("4 questions")).fontSize
    ).toBe("13px")
  },
}

/** In the dark theme: the card on the composer's own surface. */
export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => <Conversation initial={[question]} />,
  play: async ({ canvas }) => {
    const [card] = canvas.getAllByRole("group", {
      name: "Where should the release go?",
    })
    await waitFor(() => expect(card).toHaveFocus())
  },
}

/** A request arrives on the app's signal, while the draft is being written. */
function Arriving() {
  const root = React.useRef<HTMLDivElement>(null)
  const [arrived, setArrived] = React.useState(false)
  React.useEffect(() => {
    const element = root.current
    const arrive = () => setArrived(true)
    element?.addEventListener("agent-asks", arrive)
    return () => element?.removeEventListener("agent-asks", arrive)
  }, [])
  return (
    <div
      ref={root}
      className="mx-auto flex w-full max-w-column flex-col gap-6 p-4"
    >
      <Button variant="outline">Outside the composer</Button>
      <ComposerTakeover
        request={
          arrived ? (
            <ApprovalCard request={push} onDecide={decideArrival} />
          ) : undefined
        }
        status="Needs your approval"
        onStop={stop}
      >
        <Composer defaultValue={["Then bump the version"]}>
          <ComposerEditor aria-label="Message" />
          <ComposerToolbar>
            <ComposerSubmit className="ms-auto" />
          </ComposerToolbar>
        </Composer>
      </ComposerTakeover>
    </div>
  )
}

const heldHint = "A request is waiting · it shows when you pause"

/**
 * A request that comes while the reader types waits for a pause: the
 * editor keeps focus and keystrokes, a quiet hint says it waits.
 */
export const ArrivesWhileTyping: Story = {
  render: () => <Arriving />,
  play: async ({ canvas, canvasElement }) => {
    const editor = canvas.getByRole("textbox", { name: "Message" })
    await userEvent.click(editor)
    await userEvent.keyboard(" and tag it")
    editor.dispatchEvent(new CustomEvent("agent-asks", { bubbles: true }))
    await rendered()
    const card = canvasElement.querySelector<HTMLElement>(
      '[data-slot="agent-request-card"]'
    )!
    await expect(editor).toHaveFocus()
    await expect(editor).toHaveTextContent("Then bump the version and tag it")
    await expect(card).not.toBeVisible()
    await expect(
      canvas.getByText(heldHint, { selector: "span[aria-hidden]" })
    ).toBeVisible()
    await expect(canvas.getByRole("status")).toHaveTextContent(heldHint)
    await userEvent.keyboard("2")
    await expect(editor).toHaveTextContent("Then bump the version and tag it2")
    await expect(card).not.toBeVisible()
    await expect(decideArrival).not.toHaveBeenCalled()
    await waitFor(() => expect(card).toBeVisible(), { timeout: 4000 })
    await waitFor(() => expect(card).toHaveFocus())
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Needs your approval"
    )
    await expect(editor).not.toBeVisible()
  },
}

/** Leaving the editor shows the waiting request at once. */
export const BlurReleases: Story = {
  render: () => <Arriving />,
  play: async ({ canvas, canvasElement }) => {
    const editor = canvas.getByRole("textbox", { name: "Message" })
    await userEvent.click(editor)
    await userEvent.keyboard(" and tag it")
    editor.dispatchEvent(new CustomEvent("agent-asks", { bubbles: true }))
    await rendered()
    const card = canvasElement.querySelector<HTMLElement>(
      '[data-slot="agent-request-card"]'
    )!
    await expect(card).not.toBeVisible()
    await expect(
      canvas.getByText(heldHint, { selector: "span[aria-hidden]" })
    ).toBeVisible()
    const outside = canvas.getByRole("button", { name: "Outside the composer" })
    await userEvent.click(outside)
    await waitFor(() => expect(card).toBeVisible())
    await expect(outside).toHaveFocus()
    await expect(decideArrival).not.toHaveBeenCalled()
  },
}

/** Not typing, the request shows at once and takes focus. */
export const ArrivesWhileIdle: Story = {
  render: () => <Arriving />,
  play: async ({ canvas, canvasElement }) => {
    canvas
      .getByRole("textbox", { name: "Message" })
      .dispatchEvent(new CustomEvent("agent-asks", { bubbles: true }))
    await rendered()
    const card = canvas.getByRole("group", {
      name: "Allow the agent to run this?",
    })
    await expect(card).toBeVisible()
    await waitFor(() => expect(card).toHaveFocus())
    await expect(canvasElement.querySelector('[data-state="held"]')).toBeNull()
  },
}

/** Sending the message shows the waiting request at once. */
export const SendReleases: Story = {
  render: () => <Arriving />,
  play: async ({ canvas, canvasElement }) => {
    const editor = canvas.getByRole("textbox", { name: "Message" })
    await userEvent.click(editor)
    await userEvent.keyboard(" and tag it")
    editor.dispatchEvent(new CustomEvent("agent-asks", { bubbles: true }))
    await rendered()
    const card = canvasElement.querySelector<HTMLElement>(
      '[data-slot="agent-request-card"]'
    )!
    await expect(card).not.toBeVisible()
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(card).toBeVisible())
    await expect(decideArrival).not.toHaveBeenCalled()
  },
}
