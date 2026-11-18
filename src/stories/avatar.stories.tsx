import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { expect } from "storybook/test"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/** A local image, so the story never waits on the network. */
function portrait(color: string) {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${color}"/><circle cx="16" cy="13" r="6" fill="#fafafa"/><rect x="6" y="22" width="20" height="12" rx="6" fill="#fafafa"/></svg>`
    )
  )
}

const people = [
  { name: "Ada Lovelace", initials: "AL", src: portrait("#7c3aed") },
  { name: "Grace Hopper", initials: "GH", src: portrait("#0369a1") },
  { name: "Alan Turing", initials: "AT", src: portrait("#047857") },
]

const sizes = ["sm", "default", "lg"] as const

const meta = {
  title: "Components/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src={people[0].src} alt={people[0].name} />
      <AvatarFallback>{people[0].initials}</AvatarFallback>
    </Avatar>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", { name: "Ada Lovelace" })
    ).toBeVisible()
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {sizes.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarImage src={people[0].src} alt={people[0].name} />
            <AvatarFallback>{people[0].initials}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {sizes.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarFallback>{people[1].initials}</AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  ),
}

/** Fallback shows when the image fails to load. */
export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/does-not-exist.png" alt="Grace Hopper" />
      <AvatarFallback>GH</AvatarFallback>
    </Avatar>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("GH")).toBeVisible()
    await expect(canvas.queryByRole("img")).toBeNull()
  },
}

export const WithBadge: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {sizes.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarImage src={people[1].src} alt={people[1].name} />
            <AvatarFallback>{people[1].initials}</AvatarFallback>
            <AvatarBadge variant="success" />
          </Avatar>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {sizes.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarFallback>{people[2].initials}</AvatarFallback>
            <AvatarBadge>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            </AvatarBadge>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {sizes.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarFallback>{people[2].initials}</AvatarFallback>
            <AvatarBadge>
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
            </AvatarBadge>
          </Avatar>
        ))}
      </div>
    </div>
  ),
}

/**
 * Its dot by a state: a reminder on an account (`warning`), online
 * (`success`), news (`info`), an error (`destructive`).
 */
export const BadgeStates: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {(["success", "warning", "info", "destructive"] as const).map(
        (variant) => (
          <Avatar key={variant}>
            <AvatarFallback>{people[2].initials}</AvatarFallback>
            <AvatarBadge variant={variant} data-testid={variant} />
          </Avatar>
        )
      )}
      <span data-testid="ink" className="bg-warning" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      getComputedStyle(canvas.getByTestId("warning")).backgroundColor
    ).toBe(getComputedStyle(canvas.getByTestId("ink")).backgroundColor)
  },
}

export const Group: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {sizes.map((size) => (
        <AvatarGroup key={size}>
          {people.map((person) => (
            <Avatar key={person.name} size={size}>
              <AvatarImage src={person.src} alt={person.name} />
              <AvatarFallback>{person.initials}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      ))}
    </div>
  ),
}

export const GroupWithCount: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {sizes.map((size) => (
        <AvatarGroup key={size}>
          {people.map((person) => (
            <Avatar key={person.name} size={size}>
              <AvatarFallback>{person.initials}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
      ))}
    </div>
  ),
}

/** An icon-only count needs a text alternative. */
export const GroupWithIconCount: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {sizes.map((size) => (
        <AvatarGroup key={size}>
          {people.map((person) => (
            <Avatar key={person.name} size={size}>
              <AvatarImage
                src={person.src}
                alt={person.name}
                className="grayscale"
              />
              <AvatarFallback>{person.initials}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            <span className="sr-only">More people</span>
          </AvatarGroupCount>
        </AvatarGroup>
      ))}
    </div>
  ),
}

export const InEmpty: Story = {
  render: () => (
    <Empty className="w-md border">
      <EmptyHeader>
        <EmptyMedia>
          <AvatarGroup>
            {people.map((person) => (
              <Avatar key={person.name} size="lg">
                <AvatarImage src={person.src} alt={person.name} />
                <AvatarFallback>{person.initials}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        </EmptyMedia>
        <EmptyTitle>No team members</EmptyTitle>
        <EmptyDescription>
          Invite your team to collaborate on this workspace.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <HugeiconsIcon
            icon={PlusSignIcon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Invite members
        </Button>
      </EmptyContent>
    </Empty>
  ),
}
