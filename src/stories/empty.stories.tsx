import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUpRight01Icon,
  BubbleChatIcon,
  Folder01Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent } from "storybook/test"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"

const meta = {
  title: "Components/Empty",
  component: Empty,
  decorators: [
    (Story) => (
      <div className="flex w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Empty>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No agents yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any agents yet. Get started by creating your
          first agent.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <a href="#new" className={buttonVariants()}>
            Create agent
          </a>
          <Button variant="outline">Import agent</Button>
        </div>
        <a
          href="#docs"
          className={buttonVariants({
            variant: "link",
            className: "text-muted-foreground",
          })}
        >
          Learn more <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
        </a>
      </EmptyContent>
    </Empty>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(
      canvas.getByRole("link", { name: "Create agent" })
    ).toHaveFocus()
    await userEvent.tab()
    await expect(
      canvas.getByRole("button", { name: "Import agent" })
    ).toHaveFocus()
  },
}

export const WithIcon: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>Nothing to see here</EmptyTitle>
        <EmptyDescription>
          No runs have been recorded yet. Get started by{" "}
          <a href="#run">starting your first run</a>.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">
          <HugeiconsIcon
            icon={PlusSignIcon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          New run
        </Button>
      </EmptyContent>
    </Empty>
  ),
}

export const MutedBackground: Story = {
  render: () => (
    <Empty className="bg-muted">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />
        </EmptyMedia>
        <EmptyTitle>No chats found</EmptyTitle>
        <EmptyDescription>
          No chats match your search. Try adjusting your search terms.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Try again</Button>
      </EmptyContent>
    </Empty>
  ),
}

export const WithSearch: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>404 - Not Found</EmptyTitle>
        <EmptyDescription>
          The page you&apos;re looking for doesn&apos;t exist. Try searching for
          what you need below.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <InputGroup className="w-3/4">
          <InputGroupInput
            aria-label="Search pages"
            placeholder="Try searching for pages..."
          />
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        <EmptyDescription>
          Need help? <a href="#support">Contact support</a>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  ),
  play: async ({ canvas }) => {
    const search = canvas.getByRole("textbox", { name: "Search pages" })
    await userEvent.tab()
    await expect(search).toHaveFocus()
    await userEvent.keyboard("settings")
    await expect(search).toHaveValue("settings")
  },
}
