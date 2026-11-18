import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, fn, userEvent, waitFor } from "storybook/test"

import { MessageError } from "@/components/message-error"
import { Button } from "@/components/ui/button"

const onRetry = fn()
const onContinue = fn()

const meta = {
  title: "Components/Message Error",
  component: MessageError,
  parameters: { layout: "padded" },
  beforeEach: () => {
    onRetry.mockClear()
    onContinue.mockClear()
  },
  decorators: [
    (Story) => (
      <div className="flex w-165 max-w-full flex-col gap-3">
        <Story />
      </div>
    ),
  ],
  args: { title: "" },
} satisfies Meta<typeof MessageError>

export default meta
type Story = StoryObj<typeof meta>

/** Rate limited, the next try `seconds` from when it is shown. */
function RateLimited({
  seconds,
  attempt,
}: {
  seconds: number
  attempt: number
}) {
  const [at] = React.useState(() => Date.now() + seconds * 1000)
  return (
    <MessageError
      title="Rate limited by the provider"
      retry={{ at, attempt, attempts: 5 }}
      onRetry={onRetry}
    />
  )
}

/**
 * A turn that failed: its reason, then, while the app waits to try
 * again, a countdown to it and which attempt that is, "Retry now" at its
 * end; or what it means, with the app's own action ("Continue").
 */
export const Default: Story = {
  render: () => (
    <>
      <RateLimited seconds={8} attempt={2} />
      <MessageError
        title="The connection dropped"
        description="The answer above is incomplete. Nothing was lost from the steps."
        action={
          <Button variant="outline" size="sm" onClick={onContinue}>
            Continue
          </Button>
        }
      />
    </>
  ),
  play: async ({ canvas }) => {
    const [limited, dropped] = canvas.getAllByRole("alert")
    await expect(limited).toHaveTextContent(/Retrying in [78]s/)
    await expect(limited).toHaveTextContent("attempt 2 of 5")
    await userEvent.click(canvas.getByRole("button", { name: "Retry now" }))
    await expect(onRetry).toHaveBeenCalledOnce()
    await expect(dropped).toHaveTextContent("The answer above is incomplete.")
    const proceed = canvas.getByRole("button", { name: "Continue" })
    // The button level with the title, not centred on the card.
    const title = dropped!.querySelector("[data-slot=message-error-title]")!
    await expect(
      Math.abs(
        proceed.getBoundingClientRect().top - title.getBoundingClientRect().top
      )
    ).toBeLessThan(1)
    await userEvent.click(proceed)
    await expect(onContinue).toHaveBeenCalledOnce()
  },
}

/**
 * The wait over, it says it is retrying until the app has an answer or
 * another error to show.
 */
export const Retrying: Story = {
  render: () => <RateLimited seconds={1.2} attempt={3} />,
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert")
    await expect(alert).toHaveTextContent(/Retrying in [12]s/)
    await waitFor(() => expect(alert).not.toHaveTextContent(/Retrying in/), {
      timeout: 3000,
    })
    await expect(alert).toHaveTextContent("Retrying…")
    await expect(alert).toHaveTextContent("attempt 3 of 5")
  },
}
