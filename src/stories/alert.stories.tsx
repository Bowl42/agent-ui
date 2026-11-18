import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent } from "storybook/test"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const meta = {
  title: "Components/Alert",
  component: Alert,
  decorators: [
    (Story) => (
      <div className="flex w-lg flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <>
      <Alert>
        <AlertTitle>Your changes have been saved.</AlertTitle>
      </Alert>
      <Alert>
        <AlertTitle>Your changes have been saved.</AlertTitle>
        <AlertDescription>
          This is an alert with a title and a description.
        </AlertDescription>
      </Alert>
      <Alert>
        <AlertDescription>
          This one has a description only. No title. No icon.
        </AlertDescription>
      </Alert>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("alert")).toHaveLength(3)
  },
}

export const WithIcon: Story = {
  render: () => (
    <>
      <Alert>
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>
          Model switched to a smaller context. <a href="#models">Details</a>
        </AlertTitle>
      </Alert>
      <Alert>
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertDescription>
          This one has an icon and a description only.{" "}
          <a href="#docs">But it has a link</a>.
        </AlertDescription>
      </Alert>
      <Alert>
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>Run finished</AlertTitle>
        <AlertDescription>
          The agent completed 12 tool calls in 48 seconds.
        </AlertDescription>
      </Alert>
      <Alert>
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>
          This is a very long alert title that demonstrates how the component
          handles extended text content and wraps across multiple lines
        </AlertTitle>
        <AlertDescription>
          This is an equally long description with detailed information about
          the alert. It shows how the component keeps spacing, alignment and
          readability when the content runs long.
        </AlertDescription>
      </Alert>
    </>
  ),
}

export const Destructive: Story = {
  render: () => (
    <>
      <Alert variant="destructive">
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription>
          Your session has expired. Please log in again.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>The tool call failed.</AlertTitle>
        <AlertDescription>
          <p>
            Check the <a href="#logs">run logs</a> and try again.
          </p>
          <ul className="list-inside list-disc">
            <li>Check the tool&apos;s credentials</li>
            <li>Ensure the sandbox is running</li>
            <li>Verify the input schema</li>
          </ul>
        </AlertDescription>
      </Alert>
    </>
  ),
}

/**
 * A state beside the page's words by name (`success`, `warning`,
 * `info`): its icon in the state's colour, its words the card's.
 */
export const Status: Story = {
  render: () => (
    <>
      <Alert variant="success">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
        <AlertTitle>Deployed</AlertTitle>
        <AlertDescription>The agent is live on production.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>Rate limited</AlertTitle>
        <AlertDescription>Requests are retried in 30 seconds.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
        <AlertTitle>New model available</AlertTitle>
        <AlertDescription>Switch in the chat settings.</AlertDescription>
      </Alert>
    </>
  ),
}

/**
 * Unsaved changes: a warning's icon, the words the page's, the way out
 * at its end.
 */
export const UnsavedChanges: Story = {
  render: () => (
    <>
      <Alert variant="warning" role="status">
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>Unsaved changes</AlertTitle>
        <AlertDescription>
          Your edits to this agent are not saved.
        </AlertDescription>
        <AlertAction>
          <Button size="xs">Save</Button>
        </AlertAction>
      </Alert>
      <span data-testid="ink" className="text-warning" />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    const icon = canvasElement.querySelector("[data-slot=alert] > svg")!
    await expect(getComputedStyle(icon).color).toBe(
      getComputedStyle(canvas.getByTestId("ink")).color
    )
    await expect(
      getComputedStyle(canvas.getByText("Unsaved changes")).color
    ).not.toBe(getComputedStyle(canvas.getByTestId("ink")).color)
  },
}

const onUndo = fn()

export const WithActions: Story = {
  render: () => (
    <>
      <Alert>
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>The chat has been archived.</AlertTitle>
        <AlertAction>
          <Button size="xs" onClick={onUndo}>
            Undo
          </Button>
        </AlertAction>
      </Alert>
      <Alert>
        <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
        <AlertTitle>The selected runs have been cancelled.</AlertTitle>
        <AlertDescription>
          Cancelled runs keep their logs for seven days.
        </AlertDescription>
        <AlertAction>
          <Badge variant="secondary">Badge</Badge>
        </AlertAction>
      </Alert>
    </>
  ),
  play: async ({ canvas }) => {
    onUndo.mockClear()
    const undo = canvas.getByRole("button", { name: "Undo" })
    await userEvent.tab()
    await expect(undo).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(onUndo).toHaveBeenCalledOnce()
  },
}

const savingBar = (width: string) => (
  <div className={width}>
    <Alert variant="warning" role="status">
      <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
      <AlertTitle>Unsaved changes</AlertTitle>
      <AlertDescription>
        Your edits to this agent&apos;s instructions are not saved yet.
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="sm">
          Discard
        </Button>
        <Button size="sm" disabled>
          <Spinner data-icon="inline-start" />
          Save changes
        </Button>
      </AlertAction>
    </Alert>
  </div>
)

const clear = (alert: HTMLElement) => {
  const action = alert
    .querySelector("[data-slot=alert-action]")!
    .getBoundingClientRect()
  return ["alert-title", "alert-description"].map((slot) => {
    const text = alert
      .querySelector(`[data-slot=${slot}]`)!
      .getBoundingClientRect()
    return text.right <= action.left || text.bottom <= action.top
  })
}

/**
 * Two buttons at its end, one saving: a column as wide as they are, the
 * words not under them.
 */
export const TwoActions: Story = {
  render: () => savingBar("w-lg"),
  play: async ({ canvasElement }) => {
    const alert = canvasElement.querySelector<HTMLElement>("[data-slot=alert]")!
    await expect(clear(alert)).toEqual([true, true])
    // Beside the words, on their first line.
    const action = alert.querySelector("[data-slot=alert-action]")!
    const title = alert.querySelector("[data-slot=alert-title]")!
    await expect(action.getBoundingClientRect().top).toBeLessThan(
      title.getBoundingClientRect().bottom
    )
  },
}

/** Narrow: the buttons under the words, at its end. */
export const TwoActionsNarrow: Story = {
  render: () => savingBar("w-80"),
  play: async ({ canvasElement }) => {
    const alert = canvasElement.querySelector<HTMLElement>("[data-slot=alert]")!
    await expect(clear(alert)).toEqual([true, true])
    const action = alert
      .querySelector("[data-slot=alert-action]")!
      .getBoundingClientRect()
    const description = alert
      .querySelector("[data-slot=alert-description]")!
      .getBoundingClientRect()
    await expect(action.top).toBeGreaterThanOrEqual(description.bottom)
    // The words one under the other, as wide as they are.
    const title = alert
      .querySelector("[data-slot=alert-title]")!
      .getBoundingClientRect()
    await expect(description.top).toBeGreaterThanOrEqual(title.bottom)
    await expect(
      Math.round(alert.getBoundingClientRect().right - action.right)
    ).toBe(13)
  },
}
