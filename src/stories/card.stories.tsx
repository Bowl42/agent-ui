import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { ClosedCaptionIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { expect, userEvent } from "storybook/test"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const meta = {
  title: "Components/Card",
  component: Card,
  args: { className: "w-sm" },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Default Card</CardTitle>
        <CardDescription>This card uses the default size.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          The card supports a size prop that defaults to &quot;default&quot; for
          standard spacing.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          Action
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const Small: Story = {
  args: { size: "sm" },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Small Card</CardTitle>
        <CardDescription>This card uses the small size.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Set size to &quot;sm&quot; for a more compact card.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full">
          Action
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const HeaderAndFooterBorders: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader className="border-b">
        <CardTitle>Header with Border</CardTitle>
        <CardDescription>Both the header and footer have one.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          border-b on the header and border-t on the footer separate them from
          the content.
        </p>
      </CardContent>
      <CardFooter className="border-t">
        <Button variant="outline" className="w-full">
          Footer with Border
        </Button>
      </CardFooter>
    </Card>
  ),
}

/** A scrolling region must be reachable by keyboard, so it takes focus. */
export const ContentEdgeToEdge: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Terms of Service</CardTitle>
        <CardDescription>
          Review the terms before accepting the agreement.
        </CardDescription>
      </CardHeader>
      <CardContent className="-mb-(--card-spacing) px-0">
        <div
          role="region"
          aria-label="Terms"
          tabIndex={0}
          className="max-h-48 space-y-4 overflow-y-scroll border-t bg-muted/50 px-(--card-spacing) py-4 text-sm leading-relaxed outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <p>
            These terms govern your use of the workspace, including access to
            shared chats, agents, and tools.
          </p>
          <p>
            You are responsible for the content you upload and for ensuring that
            your team has the right permissions to view or edit it.
          </p>
          <p>
            We may update features or limits as the service evolves. When those
            changes affect your workflow, we will notify your administrators.
          </p>
          <p>
            By continuing, you agree to keep your credentials secure and to
            follow your organization&apos;s acceptable use policies.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Decline</Button>
        <Button>Accept</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole("region", { name: "Terms" })).toHaveFocus()
  },
}

const spacingOptions = [
  { className: "[--card-spacing:--spacing(4)]", label: "16px", value: "4" },
  { className: "[--card-spacing:--spacing(6)]", label: "24px", value: "6" },
  { className: "[--card-spacing:--spacing(8)]", label: "32px", value: "8" },
]

function CustomSpacingCard() {
  const [spacing, setSpacing] = useState("4")
  const selected = spacingOptions.find((option) => option.value === spacing)
  return (
    <div className="grid w-sm gap-4">
      <ToggleGroup
        aria-label="Card spacing"
        value={[spacing]}
        onValueChange={(value) => {
          if (value[0]) setSpacing(value[0])
        }}
        variant="outline"
        size="sm"
        className="justify-self-center"
      >
        {spacingOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Card className={selected?.className}>
        <CardHeader>
          <CardTitle>Release Health</CardTitle>
          <CardDescription>
            Track readiness across launch signals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Checks passed</span>
              <span className="font-medium">24 / 26</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Open blockers</span>
              <span className="font-medium">2</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** The spacing scale is one variable, `--card-spacing`. */
export const CustomSpacing: Story = {
  render: () => <CustomSpacingCard />,
  play: async ({ canvas }) => {
    const first = canvas.getByRole("button", { name: "16px" })
    const second = canvas.getByRole("button", { name: "24px" })
    await expect(first).toHaveAttribute("aria-pressed", "true")
    await userEvent.tab()
    await expect(first).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(second).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(second).toHaveAttribute("aria-pressed", "true")
    await expect(first).toHaveAttribute("aria-pressed", "false")
  },
}

export const Login: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="login" onSubmit={(event) => event.preventDefault()}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a
                  href="#forgot"
                  className="ms-auto inline-block underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input id="password" type="password" required />
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" form="login" className="w-full">
          Login
        </Button>
        <Button variant="outline" className="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    const email = canvas.getByRole("textbox", { name: "Email" })
    await userEvent.tab()
    await expect(email).toHaveFocus()
    await userEvent.keyboard("ada@example.com")
    await expect(email).toHaveValue("ada@example.com")
  },
}

export const WithAction: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Meeting Notes</CardTitle>
        <CardDescription>Transcript from the planning call.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            <HugeiconsIcon
              icon={ClosedCaptionIcon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Transcribe
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="flex list-decimal flex-col gap-2 ps-6">
          <li>New analytics widgets for daily runs</li>
          <li>Simplified model picker</li>
          <li>Timeline: 6 weeks</li>
        </ol>
      </CardContent>
      <CardFooter>
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+8</AvatarGroupCount>
        </AvatarGroup>
      </CardFooter>
    </Card>
  ),
}

const cover =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#52525b"/><stop offset="1" stop-color="#18181b"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>'
  )

export const WithImage: Story = {
  render: (args) => (
    <Card {...args}>
      <img
        src={cover}
        alt="Abstract gradient"
        className="aspect-video w-full object-cover"
      />
      <CardHeader>
        <CardTitle>Research agent</CardTitle>
        <CardDescription>
          Searches the web and summarises what it finds.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full">
          <HugeiconsIcon
            icon={PlusSignIcon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Add to workspace
        </Button>
      </CardFooter>
    </Card>
  ),
}

/**
 * A card whose content may be long (a request's, a questionnaire's)
 * scrolls in itself past a share of the window: `max-h-dvh-60` (60% of
 * its height, the theme's `max-h-dvh-*`) and `overflow-y-auto`, with
 * tabIndex={0} so the keyboard reaches it to scroll.
 */
export const ScrollsPastTheWindow: Story = {
  render: () => (
    // A stop of the keyboard's, to scroll it.
    <Card tabIndex={0} className="max-h-dvh-60 w-80 overflow-y-auto">
      <CardContent>
        <p className="text-sm">{"A long request. ".repeat(200)}</p>
      </CardContent>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>("[data-slot=card]")!
    await expect(parseFloat(getComputedStyle(card).maxHeight)).toBeCloseTo(
      window.innerHeight * 0.6,
      0
    )
    await expect(card.scrollHeight).toBeGreaterThan(card.clientHeight)
  },
}
