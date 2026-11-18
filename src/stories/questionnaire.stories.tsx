import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNavigation,
  QuestionnaireProgress,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import { timersRun } from "@/stories/wait"

// Receives the submitted answers; the form itself never navigates.
const answers = fn()

function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const data = new FormData(event.currentTarget)
  answers({
    direction: data.get("direction"),
    signals: data.getAll("signals"),
    timing: data.get("timing"),
  })
}

const meta = {
  title: "Components/Questionnaire",
  component: Questionnaire,
  args: { onSubmit: handleSubmit },
  beforeEach: () => {
    answers.mockClear()
  },
  decorators: [
    (Story) => (
      <div className="w-lg max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Questionnaire>

export default meta
type Story = StoryObj<typeof meta>

const items = [
  {
    name: "direction",
    required: true,
    choices: [
      { value: "delegation" },
      { value: "questions" },
      { value: "both" },
    ],
  },
  {
    name: "signals",
    choices: [
      { value: "progress" },
      { value: "decisions" },
      { value: "risks" },
    ],
  },
  {
    name: "timing",
    required: true,
    choices: [{ value: "week" }, { value: "cycle" }, { value: "later" }],
  },
] as const

function Navigation() {
  return (
    <QuestionnaireActions>
      <QuestionnaireNavigation labels={{ submit: "Save answers" }} />
    </QuestionnaireActions>
  )
}

function Questions() {
  return (
    <>
      <QuestionnaireItem name="direction" required>
        <QuestionnaireTitle>What should we prototype next?</QuestionnaireTitle>
        <QuestionnaireDescription>
          Choose one direction or write another answer.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="delegation">
            <span className="font-medium">Sub-agent delegation</span>
            <QuestionnaireChoiceDescription>
              Show when work is delegated and what comes back.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="questions">
            <span className="font-medium">Question prompts</span>
            <QuestionnaireChoiceDescription>
              Show choices while the agent waits for input.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="both">
            <span className="font-medium">Both together</span>
            <QuestionnaireChoiceDescription>
              Explore one unified interaction pattern.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireInput
            aria-label="Another direction"
            placeholder="Type another direction…"
          />
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="signals" multiple>
        <QuestionnaireTitle>
          What should every progress update include?
        </QuestionnaireTitle>
        <QuestionnaireDescription>
          Select all that apply, or skip this question.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="progress">Progress</QuestionnaireChoice>
          <QuestionnaireChoice value="decisions">Decisions</QuestionnaireChoice>
          <QuestionnaireChoice value="risks">Risks</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="timing" required>
        <QuestionnaireTitle>When should this be revisited?</QuestionnaireTitle>
        <QuestionnaireDescription>
          Pick a time to look at it again.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="week">This week</QuestionnaireChoice>
          <QuestionnaireChoice value="cycle">Next cycle</QuestionnaireChoice>
          <QuestionnaireChoice value="later">Revisit later</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
    </>
  )
}

export const Default: Story = {
  args: { defaultItem: "direction", items, shortcuts: "letters" },
  render: (args) => (
    <Questionnaire {...args}>
      <QuestionnaireProgress />
      <Questions />
      <Navigation />
    </Questionnaire>
  ),
  play: async ({ canvas }) => {
    // Question 1: a radio group, chosen with the arrow keys, which do not
    // go on to the next question.
    const first = canvas.getByRole("group", {
      name: "What should we prototype next?",
    })
    const delegation = within(first).getByRole("radio", {
      name: /Sub-agent delegation/,
    })
    delegation.focus()
    // Once what it set going has run.
    await timersRun(() => userEvent.keyboard("{ArrowDown}"))
    await expect(
      within(first).getByRole("radio", { name: /Question prompts/ })
    ).toBeChecked()
    await expect(first).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Next" }))

    // Question 2: checkboxes, several at once.
    const second = await canvas.findByRole("group", {
      name: "What should every progress update include?",
    })
    await userEvent.click(
      within(second).getByRole("checkbox", { name: "Progress" })
    )
    await userEvent.click(
      within(second).getByRole("checkbox", { name: "Risks" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Next" }))

    // Question 3: the last one submits.
    const third = await canvas.findByRole("group", {
      name: "When should this be revisited?",
    })
    await userEvent.click(
      within(third).getByRole("radio", { name: "Next cycle" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Save answers" }))
    await waitFor(() =>
      expect(answers).toHaveBeenCalledWith({
        direction: "questions",
        signals: ["progress", "risks"],
        timing: "cycle",
      })
    )
  },
}

/** A required question cannot be passed unanswered; an optional one can be skipped. */
export const Validation: Story = {
  args: { defaultItem: "direction", items },
  render: (args) => (
    <Questionnaire {...args}>
      <QuestionnaireProgress />
      <Questions />
      <Navigation />
    </Questionnaire>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Next" }))
    await expect(
      canvas.getByRole("group", { name: "What should we prototype next?" })
    ).toBeVisible()
    // The error is a line, an icon and red words; the choices and the
    // "Other" field stay grey.
    const error = await canvas.findByRole("alert")
    await expect(error.querySelector("svg")).toBeInTheDocument()
    const other = canvas.getByRole("textbox", { name: "Another direction" })
    const choice = other
      .closest("[data-slot=questionnaire]")!
      .querySelector("[data-slot=questionnaire-choice]")!
    const grey = (color: string) => {
      const [a, b, c] = color.match(/[\d.]+/g)!.map(Number)
      return Math.max(a!, b!, c!) - Math.min(a!, b!, c!) < 3
    }
    await expect(grey(getComputedStyle(other).borderTopColor)).toBe(true)
    await expect(grey(getComputedStyle(choice).borderTopColor)).toBe(true)
    await expect(getComputedStyle(other).boxShadow).toBe("none")
    await userEvent.type(other, "Tool approvals")
    await userEvent.click(canvas.getByRole("button", { name: "Next" }))
    await canvas.findByRole("group", {
      name: "What should every progress update include?",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Skip" }))
    await canvas.findByRole("group", { name: "When should this be revisited?" })
    await userEvent.click(canvas.getByRole("button", { name: "Previous" }))
    await expect(
      await canvas.findByRole("group", {
        name: "What should every progress update include?",
      })
    ).toBeVisible()
  },
}

const declined = fn()

/**
 * The way out of the whole questionnaire, not one question: with
 * `onDecline`, a quiet Decline at the row's start on every question,
 * required ones too, the navigation at its end.
 */
export const Decline: Story = {
  args: { defaultItem: "direction", items },
  beforeEach: () => {
    declined.mockClear()
  },
  render: (args) => (
    <Questionnaire {...args}>
      <QuestionnaireProgress />
      <Questions />
      <QuestionnaireActions>
        <QuestionnaireNavigation
          onDecline={declined}
          labels={{ decline: "Don't answer", submit: "Save answers" }}
        />
      </QuestionnaireActions>
    </Questionnaire>
  ),
  play: async ({ canvas }) => {
    // A required question: no Skip, but a way out.
    await expect(canvas.queryByRole("button", { name: "Skip" })).toBeNull()
    const decline = canvas.getByRole("button", { name: "Don't answer" })
    const next = canvas.getByRole("button", { name: "Next" })
    // One row: Decline at its start, Next at its end, their centres level.
    const row = decline.parentElement!.getBoundingClientRect()
    const a = decline.getBoundingClientRect()
    const b = next.getBoundingClientRect()
    await expect(Math.round(a.left)).toBe(Math.round(row.left))
    await expect(Math.round(b.right)).toBe(Math.round(row.right))
    await expect(Math.round(a.top + a.height / 2)).toBe(
      Math.round(b.top + b.height / 2)
    )
    await expect(decline).toHaveAttribute("data-variant", "ghost")
    await expect(decline).toHaveAttribute("type", "button")

    // On the next question too, Previous with the rest at the end.
    await userEvent.click(canvas.getByRole("radio", { name: /Both together/ }))
    const second = await canvas.findByRole("group", {
      name: "What should every progress update include?",
    })
    await waitFor(() => expect(second).toBeVisible())
    const previous = canvas.getByRole("button", { name: "Previous" })
    await expect(previous.getBoundingClientRect().left).toBeGreaterThan(
      decline.getBoundingClientRect().right + 16
    )
    await userEvent.click(canvas.getByRole("button", { name: "Don't answer" }))
    await expect(declined).toHaveBeenCalledOnce()
    // It submits nothing.
    await expect(answers).not.toHaveBeenCalled()
  },
}

/**
 * A single choice goes on as it is chosen, by a click or its key; a
 * choice of several, or the last question, waits for Next or Submit.
 */
export const Advance: Story = {
  args: { defaultItem: "direction", items, shortcuts: "numbers" },
  render: (args) => (
    <Questionnaire {...args}>
      <QuestionnaireProgress />
      <Questions />
      <Navigation />
    </Questionnaire>
  ),
  play: async ({ canvas }) => {
    // A click on a single choice: on to the next question.
    await userEvent.click(
      canvas.getByRole("radio", { name: /Question prompts/ })
    )
    const second = await canvas.findByRole("group", {
      name: "What should every progress update include?",
    })
    await waitFor(() => expect(second).toBeVisible())
    // Several choices: they stay until Next.
    await timersRun(() => userEvent.keyboard("1"))
    await expect(second).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Next" }))
    // The last: its number key chooses it, and it waits for Submit.
    const third = await canvas.findByRole("group", {
      name: "When should this be revisited?",
    })
    await waitFor(() => expect(third).toBeVisible())
    await timersRun(() => userEvent.keyboard("2"))
    await expect(
      within(third).getByRole("radio", { name: "Next cycle" })
    ).toBeChecked()
    await expect(third).toBeVisible()
    await expect(answers).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Save answers" }))
    await waitFor(() =>
      expect(answers).toHaveBeenCalledWith({
        direction: "questions",
        signals: ["progress"],
        timing: "cycle",
      })
    )
  },
}

function CardQuestions() {
  const directionId = React.useId()
  const timingId = React.useId()
  return (
    <>
      <QuestionnaireItem
        aria-labelledby={directionId}
        name="direction"
        required
      >
        <Card>
          <CardHeader>
            <QuestionnaireTitle id={directionId} render={<CardTitle />}>
              Which model should run the evals?
            </QuestionnaireTitle>
            <QuestionnaireDescription render={<CardDescription />}>
              The choice applies to every run in this batch.
            </QuestionnaireDescription>
            <CardAction>
              <QuestionnaireProgress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="fast">Fast model</QuestionnaireChoice>
              <QuestionnaireChoice value="large">
                Large model
              </QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </CardContent>
          <CardFooter>
            <Navigation />
          </CardFooter>
        </Card>
      </QuestionnaireItem>
      <QuestionnaireItem aria-labelledby={timingId} name="timing" required>
        <Card>
          <CardHeader>
            <QuestionnaireTitle id={timingId} render={<CardTitle />}>
              When should the batch start?
            </QuestionnaireTitle>
            <QuestionnaireDescription render={<CardDescription />}>
              Runs queue behind any that are in progress.
            </QuestionnaireDescription>
            <CardAction>
              <QuestionnaireProgress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="now">Now</QuestionnaireChoice>
              <QuestionnaireChoice value="tonight">Tonight</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </CardContent>
          <CardFooter>
            <Navigation />
          </CardFooter>
        </Card>
      </QuestionnaireItem>
    </>
  )
}

export const InCard: Story = {
  args: {
    defaultItem: "direction",
    shortcuts: "numbers",
    items: [
      {
        name: "direction",
        required: true,
        choices: [{ value: "fast" }, { value: "large" }],
      },
      {
        name: "timing",
        required: true,
        choices: [{ value: "now" }, { value: "tonight" }],
      },
    ],
  },
  render: (args) => (
    <Questionnaire {...args}>
      <CardQuestions />
    </Questionnaire>
  ),
}

export const InDialog: Story = {
  args: { defaultItem: "direction", items },
  render: (args) => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open questionnaire
      </DialogTrigger>
      <DialogContent>
        <Questionnaire {...args}>
          <DialogHeader>
            <DialogTitle className="sr-only">
              Plan an agent interface
            </DialogTitle>
            <DialogDescription className="sr-only">
              Answer three questions to shape the next prototype.
            </DialogDescription>
            <QuestionnaireProgress
              className="font-medium text-foreground"
              render={(props, state) => (
                <span {...props}>
                  Question {state.current} of {state.total}
                </span>
              )}
            />
          </DialogHeader>
          <Questions />
          <DialogFooter>
            <Navigation />
          </DialogFooter>
        </Questionnaire>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas }) => {
    const body = within(document.body)
    await userEvent.click(
      canvas.getByRole("button", { name: "Open questionnaire" })
    )
    const dialog = await body.findByRole("dialog", {
      name: "Plan an agent interface",
    })
    await waitFor(() =>
      expect(within(dialog).getByText("Question 1 of 3")).toBeVisible()
    )
  },
}

export const NoDescription: Story = {
  args: {
    defaultItem: "task",
    shortcuts: "letters",
    items: [
      {
        name: "task",
        required: true,
        choices: [
          { value: "inspect" },
          { value: "implement" },
          { value: "review" },
        ],
      },
    ],
  },
  render: (args) => (
    <Questionnaire {...args}>
      <QuestionnaireProgress />
      <QuestionnaireItem name="task" required>
        <QuestionnaireTitle>What should the agent do next?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="inspect">
            Inspect the codebase
          </QuestionnaireChoice>
          <QuestionnaireChoice value="implement">
            Implement the change
          </QuestionnaireChoice>
          <QuestionnaireChoice value="review">
            Review the result
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <Navigation />
    </Questionnaire>
  ),
}

export const DisabledChoice: Story = {
  args: {
    defaultItem: "plan",
    items: [
      {
        name: "plan",
        required: true,
        choices: [
          { value: "plus" },
          { value: "pro" },
          { value: "enterprise", disabled: true },
        ],
      },
    ],
  },
  render: (args) => (
    <Questionnaire {...args}>
      <QuestionnaireItem name="plan" required>
        <QuestionnaireTitle>Choose a plan</QuestionnaireTitle>
        <QuestionnaireDescription>
          Enterprise is not available on your account.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="plus">Plus</QuestionnaireChoice>
          <QuestionnaireChoice value="pro">Pro</QuestionnaireChoice>
          <QuestionnaireChoice value="enterprise" disabled>
            Enterprise
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <Navigation />
    </Questionnaire>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("radio", { name: "Enterprise" })
    ).toBeDisabled()
  },
}
