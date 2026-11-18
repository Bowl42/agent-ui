import type { Meta, StoryObj } from "@storybook/react-vite"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Avatar: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-37.5" />
        <Skeleton className="h-4 w-25" />
      </div>
    </div>
  ),
}

export const CardShape: Story = {
  name: "Card",
  render: () => (
    <Card className="w-xs">
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-square w-full" />
      </CardContent>
    </Card>
  ),
}

export const Text: Story = {
  render: () => (
    <div className="flex w-xs flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
}

export const Form: Story = {
  render: () => (
    <div className="flex w-xs flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  ),
}

/** Skeletons are silent; name the region that is loading. */
export const Table: Story = {
  render: () => (
    <div
      role="status"
      aria-label="Loading runs"
      className="flex w-md flex-col gap-2"
    >
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  ),
}
