import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  File01Icon,
  Folder01Icon,
  FullScreenIcon,
  MinimizeScreenIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons"
import * as React from "react"
import { expect, userEvent, waitFor } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const meta = {
  title: "Components/Collapsible",
  component: Collapsible,
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Collapsible className="flex w-72 flex-col gap-2">
      <div className="flex items-center justify-between gap-4 px-2">
        <span className="text-sm font-semibold">Run #128 used 3 tools</span>
        <CollapsibleTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label="Show tool calls"
        >
          <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} />
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-2 font-mono text-sm">
        read_file
      </div>
      <CollapsibleContent className="flex flex-col gap-2">
        <div className="rounded-md border px-4 py-2 font-mono text-sm">
          web_search
        </div>
        <div className="rounded-md border px-4 py-2 font-mono text-sm">
          run_shell
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Show tool calls" })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.queryByText("web_search")).not.toBeInTheDocument()

    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await waitFor(async () =>
      expect(await canvas.findByText("web_search")).toBeVisible()
    )

    await userEvent.keyboard(" ")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await waitFor(() =>
      expect(canvas.queryByText("web_search")).not.toBeInTheDocument()
    )
  },
}

type FileTreeItem = { name: string } | { name: string; items: FileTreeItem[] }

const fileTree: FileTreeItem[] = [
  {
    name: "agents",
    items: [
      {
        name: "tools",
        items: [{ name: "search.ts" }, { name: "shell.ts" }],
      },
      { name: "planner.ts" },
    ],
  },
  { name: "prompts", items: [{ name: "system.md" }] },
  { name: "package.json" },
  { name: "README.md" },
]

function renderItem(item: FileTreeItem) {
  if ("items" in item) {
    return (
      <Collapsible key={item.name}>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="group w-full justify-start transition-none"
            />
          }
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="transition-transform group-data-panel-open:rotate-90 rtl:rotate-180 rtl:group-data-panel-open:rotate-90"
          />
          <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
          {item.name}
        </CollapsibleTrigger>
        <CollapsibleContent className="ms-5 mt-1">
          <div className="flex flex-col gap-1">
            {item.items.map(renderItem)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }
  return (
    <Button
      key={item.name}
      variant="link"
      size="sm"
      className="w-full justify-start gap-2 text-foreground"
    >
      <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
      <span>{item.name}</span>
    </Button>
  )
}

export const FileTree: Story = {
  render: () => (
    <Card className="w-64 gap-2" size="sm">
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">{fileTree.map(renderItem)}</div>
      </CardContent>
    </Card>
  ),
  play: async ({ canvas }) => {
    const agents = canvas.getByRole("button", { name: "agents" })
    await userEvent.click(agents)
    const tools = await canvas.findByRole("button", { name: "tools" })
    await expect(tools).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(tools)
    await waitFor(async () =>
      expect(
        await canvas.findByRole("button", { name: "shell.ts" })
      ).toBeVisible()
    )
  },
}

function SettingsDemo() {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <Card className="w-80" size="sm">
      <CardHeader>
        <CardTitle>Radius</CardTitle>
        <CardDescription>Set the corner radius of the element.</CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="flex items-start gap-2"
        >
          <FieldGroup className="grid w-full grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor="radius-top-start" className="sr-only">
                Top start
              </FieldLabel>
              <Input id="radius-top-start" placeholder="0" defaultValue={0} />
            </Field>
            <Field>
              <FieldLabel htmlFor="radius-top-end" className="sr-only">
                Top end
              </FieldLabel>
              <Input id="radius-top-end" placeholder="0" defaultValue={0} />
            </Field>
            <CollapsibleContent className="col-span-full grid grid-cols-subgrid gap-2">
              <Field>
                <FieldLabel htmlFor="radius-bottom-start" className="sr-only">
                  Bottom start
                </FieldLabel>
                <Input
                  id="radius-bottom-start"
                  placeholder="0"
                  defaultValue={0}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="radius-bottom-end" className="sr-only">
                  Bottom end
                </FieldLabel>
                <Input
                  id="radius-bottom-end"
                  placeholder="0"
                  defaultValue={0}
                />
              </Field>
            </CollapsibleContent>
          </FieldGroup>
          <CollapsibleTrigger
            render={<Button variant="outline" size="icon" />}
            aria-label="Set each corner"
          >
            {isOpen ? (
              <HugeiconsIcon icon={MinimizeScreenIcon} strokeWidth={2} />
            ) : (
              <HugeiconsIcon icon={FullScreenIcon} strokeWidth={2} />
            )}
          </CollapsibleTrigger>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

export const Settings: Story = {
  render: () => <SettingsDemo />,
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("textbox", { name: "Bottom start" })
    ).not.toBeInTheDocument()
    await userEvent.click(
      canvas.getByRole("button", { name: "Set each corner" })
    )
    const bottomStart = await canvas.findByRole("textbox", {
      name: "Bottom start",
    })
    await userEvent.type(bottomStart, "8")
    await expect(bottomStart).toHaveValue("08")
  },
}

function Growing({
  defaultOpen,
  still,
  controlled,
}: {
  defaultOpen?: boolean
  /** No motion, as where it is reduced. */
  still?: boolean
  /** Its open the app's, flipped open just after it is shown. */
  controlled?: boolean
}) {
  const [rows, setRows] = React.useState(3)
  const [open, setOpen] = React.useState(false)
  // Opened once measured, as an app that sees it has room.
  React.useEffect(() => {
    if (!controlled) return
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [controlled])
  return (
    <Collapsible
      {...(defaultOpen ? { defaultOpen } : {})}
      {...(controlled ? { open, onOpenChange: setOpen } : {})}
      className="flex w-85 flex-col gap-2"
      style={still ? ({ "--motion-size": "0s" } as React.CSSProperties) : {}}
    >
      <CollapsibleTrigger render={<Button variant="outline" />}>
        Sessions
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1 text-sm">
          {Array.from({ length: rows }, (_, index) => (
            <li key={index} className="rounded-md border px-3 py-2">
              Session {index + 1}
            </li>
          ))}
        </ul>
        <Button variant="ghost" onClick={() => setRows(8)}>
          Show all 8
        </Button>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Whether an open panel is as tall as what is in it, nothing clipped. */
async function followsContent(canvasElement: HTMLElement) {
  const panel = canvasElement.querySelector<HTMLElement>(
    "[data-slot=collapsible-content]"
  )!
  await waitFor(() =>
    expect(panel.scrollHeight - panel.clientHeight).toBeLessThanOrEqual(0)
  )
}

/**
 * Open, it follows what is in it: rows added after it opened, or text
 * grown with the page's font size, are not cut off. Clipped only while
 * it opens or closes.
 */
export const GrowsWhenOpen: Story = {
  render: () => <Growing />,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sessions" }))
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Show all 8" })).toBeVisible()
    )
    const panel = canvasElement.querySelector<HTMLElement>(
      "[data-slot=collapsible-content]"
    )!
    // Opened: no longer clipped.
    await waitFor(() =>
      expect(getComputedStyle(panel).overflow).toBe("visible")
    )
    await expect(panel).toHaveAttribute("data-opened")
    await userEvent.click(canvas.getByRole("button", { name: "Show all 8" }))
    await expect(await canvas.findByText("Session 8")).toBeInTheDocument()
    await followsContent(canvasElement)
    // Even with its height pinned as it was when it opened.
    panel.style.setProperty("--collapsible-panel-height", "120px")
    await followsContent(canvasElement)
    panel.style.removeProperty("--collapsible-panel-height")
    const root = canvasElement.ownerDocument.documentElement
    root.style.fontSize = "20.57px"
    try {
      await followsContent(canvasElement)
    } finally {
      root.style.fontSize = ""
    }
    // Closed, it still closes in height, clipped, and goes.
    await userEvent.click(canvas.getByRole("button", { name: "Sessions" }))
    await expect(panel).not.toHaveAttribute("data-opened")
    await waitFor(() => expect(canvas.queryByText("Session 8")).toBeNull())
  },
}

/** Open from the start, too. */
export const GrowsWhenOpenAtFirst: Story = {
  render: () => <Growing defaultOpen />,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show all 8" }))
    await expect(await canvas.findByText("Session 8")).toBeInTheDocument()
    await followsContent(canvasElement)
  },
}

/** Without motion (reduced): open at once, and following its content. */
export const GrowsWhenOpenStill: Story = {
  render: () => <Growing still />,
  play: GrowsWhenOpen.play!,
}

/**
 * Without motion, its open the app's, flipped open as it is shown: open,
 * and following its content.
 */
export const GrowsWhenOpenControlled: Story = {
  render: () => <Growing still controlled />,
  play: async ({ canvas, canvasElement }) => {
    const panel = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        "[data-slot=collapsible-content]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    await waitFor(() => expect(panel).toHaveAttribute("data-opened"))
    await userEvent.click(canvas.getByRole("button", { name: "Show all 8" }))
    await expect(await canvas.findByText("Session 8")).toBeInTheDocument()
    panel.style.setProperty("--collapsible-panel-height", "120px")
    await followsContent(canvasElement)
  },
}
