import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon } from "@hugeicons/core-free-icons"
import type * as React from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

const meta = {
  title: "Components/Navigation Menu",
  component: NavigationMenu,
  parameters: { layout: "padded" },
} satisfies Meta<typeof NavigationMenu>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

const components = [
  {
    title: "Chats",
    href: "#chats",
    description: "Conversations with an agent, with tool calls inline.",
  },
  {
    title: "Runs",
    href: "#runs",
    description: "Every step an agent took, with inputs and outputs.",
  },
  {
    title: "Tools",
    href: "#tools",
    description: "Functions an agent may call, and who may approve them.",
  },
  {
    title: "Models",
    href: "#models",
    description: "Which model each agent uses, and its limits.",
  },
]

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentProps<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink href={href}>
        <div className="flex flex-col gap-1 text-sm">
          <div className="leading-none font-medium">{title}</div>
          <div className="line-clamp-2 text-muted-foreground">{children}</div>
        </div>
      </NavigationMenuLink>
    </li>
  )
}

export const Basic: Story = {
  render: () => (
    // Base UI renders both the root and the open popup as <nav>; naming the
    // root keeps the landmarks distinguishable.
    <NavigationMenu aria-label="Docs">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="w-96">
              <ListItem href="#introduction" title="Introduction">
                What agents are and how a run works.
              </ListItem>
              <ListItem href="#installation" title="Installation">
                Install the CLI and connect a workspace.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Concepts</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Status</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px]">
              {["Queued", "Running", "Done"].map((status) => (
                <li key={status}>
                  <NavigationMenuLink
                    href={`#${status.toLowerCase()}`}
                    className="flex-row items-center gap-2"
                  >
                    <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
                    {status}
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#docs"
            className={navigationMenuTriggerStyle()}
          >
            Documentation
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
  play: async ({ canvas }) => {
    const nav = canvas.getByRole("navigation", { name: "Docs" })
    const started = within(nav).getByRole("button", {
      name: "Getting started",
    })
    const concepts = within(nav).getByRole("button", { name: "Concepts" })

    await userEvent.tab()
    await waitFor(() => expect(started).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    const intro = await body.findByRole("link", { name: /Introduction/ })
    await waitFor(() => expect(intro).toBeVisible())
    await expect(started).toHaveAttribute("aria-expanded", "true")

    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByRole("link", { name: /Introduction/ })).toBeNull()
    )
    await waitFor(() => expect(started).toHaveFocus())
    await expect(started).toHaveAttribute("aria-expanded", "false")

    // Open the second menu and leave it open for the a11y check.
    await userEvent.keyboard("{ArrowRight}")
    await expect(concepts).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    const runs = await body.findByRole("link", { name: /Runs/ })
    await waitFor(() => expect(runs).toBeVisible())
  },
}
