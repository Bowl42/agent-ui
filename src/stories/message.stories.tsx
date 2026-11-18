import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  Download01Icon,
  File01Icon,
  RefreshIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent } from "storybook/test"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message"
import { Spinner } from "@/components/ui/spinner"

// Records clicks on the controls the stories exercise.
const onAction = fn()

const meta = {
  title: "Components/Message",
  component: Message,
  beforeEach: () => {
    onAction.mockClear()
  },
  decorators: [
    (Story) => (
      <div className="flex w-md max-w-full flex-col gap-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Message>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <>
      <Message align="end">
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>
              Run the eval suite against the new model.
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>It takes about forty minutes. Now?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>Yes, it&apos;s a one-line change.</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageContent>
          <BubbleGroup>
            <Bubble variant="muted">
              <BubbleContent>
                It&apos;s always a one-line change. Starting the run.
              </BubbleContent>
            </Bubble>
            <Bubble variant="muted">
              <BubbleContent>I&apos;ll post the results here.</BubbleContent>
            </Bubble>
          </BubbleGroup>
        </MessageContent>
      </Message>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Run the eval suite against the new model.")
    ).toBeVisible()
  },
}

export const WithAvatar: Story = {
  render: () => (
    <>
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>AG</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>
              The build failed during dependency installation.
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>Something went wrong. Any idea?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>AG</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="destructive">
            <BubbleContent>The run was cancelled.</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </>
  ),
}

/** Consecutive messages from one sender; an empty avatar keeps alignment. */
export const Group: Story = {
  render: () => (
    <>
      <MessageGroup>
        <Message>
          <MessageAvatar />
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>I checked the tool registry.</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message>
          <MessageAvatar>
            <Avatar>
              <AvatarFallback>AG</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>
                Every tool now declares its input schema.
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </MessageGroup>
      <MessageGroup>
        <Message align="end">
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>Great.</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message align="end">
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>Ship it.</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </MessageGroup>
    </>
  ),
}

export const GroupChat: Story = {
  render: () => (
    <>
      <Message align="end">
        <MessageContent>
          <Bubble variant="tinted">
            <BubbleContent>
              <span className="font-medium">@eve</span> why did the run stall?
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <Marker role="status">
          <MarkerIcon>
            <Spinner />
          </MarkerIcon>
          <MarkerContent>Checking the logs...</MarkerContent>
        </Marker>
      </Message>
      <Message>
        <MessageContent>
          <MessageHeader>Eve</MessageHeader>
          <Bubble variant="ghost">
            <BubbleContent>
              <span className="whitespace-pre-wrap">
                {`The search tool timed out after 30s:

- Error: upstream timeout
- at tools/search.ts:123`}
              </span>
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Checking the logs..."
    )
  },
}

export const HeaderAndFooter: Story = {
  render: () => (
    <>
      <Message align="end">
        <MessageContent>
          <MessageHeader className="justify-end">You</MessageHeader>
          <Bubble variant="muted">
            <BubbleContent>Summarise the failing runs for today.</BubbleContent>
          </Bubble>
          <MessageFooter className="gap-2">
            <span>Delivered</span>
            <Button variant="ghost" size="xs" onClick={onAction}>
              Undo
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
      <Message>
        <MessageContent>
          <MessageHeader>
            <span>Claude</span>
            <span className="ms-auto font-normal">1m ago</span>
          </MessageHeader>
          <Bubble variant="muted">
            <BubbleContent>
              Three runs failed, all on the same flaky tool call.
            </BubbleContent>
            <BubbleReactions>
              <Button variant="ghost" size="xs">
                Thanks
              </Button>
            </BubbleReactions>
          </Bubble>
          <MessageFooter className="gap-2">
            <span>From the eval queue</span>
            <Button variant="ghost" size="xs">
              Copy
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <MessageHeader className="justify-end">
            Automation warning
          </MessageHeader>
          <Bubble variant="destructive">
            <BubbleContent>
              The API key expires in 10 minutes. Rotate it before the next run.
            </BubbleContent>
          </Bubble>
          <MessageFooter className="gap-2">
            <span>Needs action</span>
            <Button variant="destructive" size="xs">
              Rotate
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
    </>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    const undo = canvas.getByRole("button", { name: "Undo" })
    await expect(undo).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(onAction).toHaveBeenCalledOnce()
  },
}

export const Actions: Story = {
  render: () => (
    <>
      <Message align="end">
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>What is the status of the deployment?</BubbleContent>
          </Bubble>
          <MessageFooter>
            <Button variant="ghost" size="icon" aria-label="Copy">
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Retry">
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>AG</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>
              The install failure comes from the workspace package. I can open
              the log line or retry the deployment.
            </BubbleContent>
          </Bubble>
          <MessageFooter>
            <Button variant="ghost" size="icon" aria-label="Copy">
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Good response"
              onClick={onAction}
            >
              <HugeiconsIcon icon={ThumbsUpIcon} strokeWidth={2} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Bad response">
              <HugeiconsIcon icon={ThumbsDownIcon} strokeWidth={2} />
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>Okay, drop me a link.</BubbleContent>
          </Bubble>
          <MessageFooter className="gap-2">
            <span className="font-normal text-destructive">Failed to send</span>
            <Button variant="secondary" size="xs">
              Retry
            </Button>
          </MessageFooter>
        </MessageContent>
      </Message>
    </>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Good response" }))
    await expect(onAction).toHaveBeenCalledOnce()
  },
}

export const WithAttachment: Story = {
  render: () => (
    <>
      <Message align="end">
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>Turn this into a PDF report.</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>Done. Here&apos;s the report.</BubbleContent>
          </Bubble>
          <Attachment>
            <AttachmentMedia>
              <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>eval-report.pdf</AttachmentTitle>
              <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                aria-label="Download eval-report.pdf"
                size="icon-sm"
                variant="secondary"
              >
                <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </MessageContent>
      </Message>
    </>
  ),
}
