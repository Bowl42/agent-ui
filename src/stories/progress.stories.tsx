import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  File01Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"

const meta = {
  title: "Components/Progress",
  component: Progress,
  args: { value: 60, "aria-label": "Indexing" },
  decorators: [
    (Story) => (
      <div className="w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

/** Without a ProgressLabel the bar needs an aria-label. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("progressbar", { name: "Indexing" })
    await expect(bar).toHaveAttribute("aria-valuenow", "60")
  },
}

export const Values: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {[0, 25, 50, 75, 100].map((value) => (
        <Progress key={value} value={value} aria-label={`Step ${value}`} />
      ))}
    </div>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <Progress value={56}>
      <ProgressLabel>Upload progress</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("progressbar", { name: "Upload progress" })
    await expect(bar).toHaveAttribute("aria-valuenow", "56")
    await expect(canvas.getByText("56%")).toBeVisible()
  },
}

export const Indeterminate: Story = {
  args: { value: null, "aria-label": "Connecting" },
}

function ControlledProgress() {
  const [value, setValue] = useState(50)
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Decrease"
        onClick={() => setValue((v) => Math.max(0, v - 10))}
      >
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />
      </Button>
      <Progress value={value} className="flex-1">
        <ProgressLabel>Context used</ProgressLabel>
        <ProgressValue />
      </Progress>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Increase"
        onClick={() => setValue((v) => Math.min(100, v + 10))}
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
      </Button>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledProgress />,
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("progressbar", { name: "Context used" })
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Decrease" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(bar).toHaveAttribute("aria-valuenow", "40")
    await userEvent.tab()
    await userEvent.keyboard("{Enter}{Enter}")
    await expect(bar).toHaveAttribute("aria-valuenow", "60")
  },
}

const files = [
  { name: "transcript.md", progress: 45, remaining: "2m 30s" },
  { name: "embeddings.parquet", progress: 78, remaining: "45s" },
  { name: "tools.json", progress: 100, remaining: "Complete" },
]

export const FileUploadList: Story = {
  render: () => (
    <ItemGroup>
      {files.map((file) => (
        <Item key={file.name} role="listitem" size="xs" className="px-0">
          <ItemMedia variant="icon">
            <HugeiconsIcon
              icon={File01Icon}
              strokeWidth={2}
              className="size-5"
            />
          </ItemMedia>
          <ItemContent className="inline-block truncate">
            <ItemTitle className="inline">{file.name}</ItemTitle>
          </ItemContent>
          <ItemContent>
            <Progress
              value={file.progress}
              aria-label={file.name}
              className="w-32"
            />
          </ItemContent>
          <ItemActions className="w-16 justify-end">
            <span className="text-sm text-muted-foreground">
              {file.remaining}
            </span>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  ),
}
