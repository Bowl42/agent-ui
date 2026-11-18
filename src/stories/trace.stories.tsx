import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CommandLineIcon,
  File01Icon,
  FileSearchIcon,
  Globe02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { contrast, over, painted, resolved } from "@/stories/paint"
import {
  reducedMotionDuration,
  reducedMotionTransition,
} from "@/stories/motion"

const meta = {
  title: "Components/Trace",
  component: Trace,
  decorators: [
    (Story) => (
      <div className="w-md max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Trace>

export default meta
type Story = StoryObj<typeof meta>

const reasoning = `The user wants to know why the deploy is slow, so I should start from the build log instead of guessing.

Image optimization takes almost four minutes and runs on every deploy because the cache key includes the commit hash.`

/** A line can be plain, a link, or the trigger of a collapsible, sheet or dialog. */
export const Rows: Story = {
  render: () => (
    <Trace>
      <TraceLine status="running">
        <TraceIcon>
          <HugeiconsIcon icon={FileSearchIcon} strokeWidth={2} />
        </TraceIcon>
        <TraceTitle>Scanning 52 files</TraceTitle>
      </TraceLine>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Ran node --version</TraceTitle>
            <TraceDescription>0.2s</TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <CodeBlock size="sm">
            <CodeBlockContent wrap className="max-h-64">
              v24.18.0
            </CodeBlockContent>
          </CodeBlock>
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <a href="#docs">
        <TraceLine>
          <TraceIcon>
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
          </TraceIcon>
          <TraceTitle>Read lib/docs.ts</TraceTitle>
          <TraceIcon>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </TraceIcon>
        </TraceLine>
      </a>
      <Sheet>
        <SheetTrigger>
          <TraceLine>
            <TraceIcon>
              <HugeiconsIcon icon={FileSearchIcon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Explored 3 files</TraceTitle>
            <TraceIcon>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </TraceIcon>
          </TraceLine>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Explored 3 files</SheetTitle>
            <SheetDescription>
              Files read while preparing the response.
            </SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col gap-2 px-4 font-mono text-xs">
            <li>lib/docs.ts</li>
            <li>lib/components.ts</li>
            <li>package.json</li>
          </ul>
        </SheetContent>
      </Sheet>
      <Dialog>
        <DialogTrigger>
          <TraceLine>
            <TraceIcon>
              <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Searched the web for cache keys</TraceTitle>
            <TraceIcon>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </TraceIcon>
          </TraceLine>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Searched the web for cache keys</DialogTitle>
            <DialogDescription>
              Three results were used in the response.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Trace>
  ),
  play: async ({ canvas }) => {
    const body = within(document.body)

    const command = canvas.getByRole("button", { name: /Ran node --version/ })
    // A line's result is at its end, smaller, before the chevron.
    const result = canvas.getByText("0.2s")
    await expect(getComputedStyle(result).fontSize).toBe("12px")
    const trace = command.closest("[data-slot=trace]")!
    await expect(
      trace.getBoundingClientRect().right - result.getBoundingClientRect().right
    ).toBeLessThan(24)
    await userEvent.tab()
    await expect(command).toHaveFocus()
    await expect(command).toHaveAttribute("aria-expanded", "false")
    await userEvent.keyboard("{Enter}")
    await expect(command).toHaveAttribute("aria-expanded", "true")
    await waitFor(async () =>
      expect(await canvas.findByText("v24.18.0")).toBeVisible()
    )

    await userEvent.tab() // the open code block is scrollable, so focusable
    await userEvent.tab()
    await expect(
      canvas.getByRole("link", { name: "Read lib/docs.ts" })
    ).toHaveFocus()

    const search = canvas.getByRole("button", {
      name: "Searched the web for cache keys",
    })
    search.focus()
    await userEvent.keyboard("{Enter}")
    const dialog = await body.findByRole("dialog", {
      name: "Searched the web for cache keys",
    })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(search).toHaveFocus())
  },
}

export const ToolCalls: Story = {
  render: () => (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status="running">
            <TraceIcon>
              <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Running npm --version</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <CodeBlock size="sm">
            <CodeBlockContent wrap>$ npm --version</CodeBlockContent>
          </CodeBlock>
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Searched the web for getting started</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">example.com/docs/install</Badge>
          <Badge variant="secondary">example.com/blog/start</Badge>
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <TraceLine status="pending">
        <TraceIcon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </TraceIcon>
        <TraceTitle>Search for minimumReleaseAge</TraceTitle>
      </TraceLine>
      <TraceCollapsible defaultOpen>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Ran node --version</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <CodeBlock size="sm">
            <CodeBlockContent
              wrap
            >{`$ node --version\nv24.18.0`}</CodeBlockContent>
          </CodeBlock>
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status="error">
            <TraceIcon>
              <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Failed to run pnpm --version</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <CodeBlock size="sm" variant="destructive">
            <CodeBlockContent wrap>command not found: pnpm</CodeBlockContent>
          </CodeBlock>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  ),
  play: async ({ canvas }) => {
    const failed = canvas.getByRole("button", {
      name: "Failed to run pnpm --version",
    })
    failed.focus()
    await userEvent.keyboard(" ")
    await expect(failed).toHaveAttribute("aria-expanded", "true")
    await waitFor(async () =>
      expect(await canvas.findByText("command not found: pnpm")).toBeVisible()
    )
  },
}

export const Reasoning: Story = {
  render: () => (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceTitle>Thought for 12 seconds</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-wrap">
        {reasoning}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  ),
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole("button", {
      name: "Thought for 12 seconds",
    })
    await userEvent.tab()
    await userEvent.keyboard("{Enter}")
    await waitFor(async () =>
      expect(await canvas.findByText(/build log/)).toBeVisible()
    )
    // Its title and what it opens to are the size of a trace's rows.
    const size = (element: Element) => getComputedStyle(element).fontSize
    await expect(size(trigger)).toBe("14px")
    await expect(
      size(
        canvasElement.querySelector(
          "[data-slot=trace-collapsible-content-inner]"
        )!
      )
    ).toBe("14px")
    // With reduced motion it opens and its chevron turns at once.
    await expect(
      reducedMotionDuration(
        canvasElement.querySelector<HTMLElement>(
          "[data-slot=trace-collapsible-content]"
        )!
      )
    ).toBe("0s")
    await expect(
      reducedMotionTransition(
        trigger.querySelector("[data-slot=trace-icon]:last-child")!
      )
    ).toBe("none")
    await userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  },
}

/**
 * A running line's shimmer sweeps toward stronger contrast in either
 * theme, so its words never fade below the line's own contrast.
 */
export const Shimmer: Story = {
  render: () => (
    <Trace>
      <TraceLine status="running">
        <TraceIcon>
          <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
        </TraceIcon>
        <TraceTitle>Running pnpm test</TraceTitle>
      </TraceLine>
    </Trace>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByText("Running pnpm test")
    const style = getComputedStyle(title)
    await expect(style.backgroundImage).not.toBe("none")
    const background = painted(title)
    const base = contrast(over(style.color, background), background)
    await expect(base).toBeGreaterThanOrEqual(4.5)
    // The sweep's colours: its highlight, and half way to it.
    const highlight = style.getPropertyValue("--_highlight").trim()
    for (const color of [
      highlight,
      `color-mix(in oklch, ${highlight}, currentColor 50%)`,
    ]) {
      const swept = contrast(
        over(resolved(title, color), background),
        background
      )
      await expect(swept, color).toBeGreaterThanOrEqual(base)
    }
  },
}

export const ChainOfThought: Story = {
  render: () => (
    <TraceCollapsible defaultOpen>
      <TraceCollapsibleTrigger>
        <TraceLine status="running">
          <TraceTitle>Looking into the slow deploy</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent keepMounted>
        <Trace>
          <TraceCollapsible defaultOpen>
            <TraceCollapsibleTrigger>
              <TraceLine>
                <TraceIcon>
                  <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
                </TraceIcon>
                <TraceTitle>Read the last twelve deploys</TraceTitle>
              </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
              Image optimization takes almost four minutes on every deploy.
            </TraceCollapsibleContent>
          </TraceCollapsible>
          <TraceLine status="running">
            <TraceIcon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Searching for the cache key</TraceTitle>
          </TraceLine>
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  ),
}

const sources = [
  { title: "Caching build outputs", href: "#caching" },
  { title: "Image optimization reference", href: "#images" },
  { title: "Deploy hooks and cache keys", href: "#deploy-hooks" },
]

export const Sources: Story = {
  render: () => (
    <TraceCollapsible defaultOpen>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceTitle>Used {sources.length} sources</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>
          {sources.map((source) => (
            <a key={source.href} href={source.href}>
              <TraceLine>
                <TraceIcon>
                  <HugeiconsIcon icon={Globe02Icon} strokeWidth={2} />
                </TraceIcon>
                <TraceTitle>{source.title}</TraceTitle>
                <TraceIcon>
                  <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
                </TraceIcon>
              </TraceLine>
            </a>
          ))}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("link")).toHaveLength(3)
  },
}

export const WholeTurn: Story = {
  render: () => (
    <TraceCollapsible defaultOpen>
      <TraceCollapsibleTrigger>
        <TraceLine status="error">
          <TraceTitle>Worked for 2m 4s, 1 command failed</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent keepMounted className="flex flex-col gap-2">
        <Trace>
          <TraceCollapsible>
            <TraceCollapsibleTrigger>
              <TraceLine>
                <TraceIcon>
                  <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />
                </TraceIcon>
                <TraceTitle>Thought for 12 seconds</TraceTitle>
              </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent className="whitespace-pre-wrap">
              {reasoning}
            </TraceCollapsibleContent>
          </TraceCollapsible>
          <TraceLine>
            <TraceIcon>
              <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Ran mkdir -p dist</TraceTitle>
          </TraceLine>
          <TraceLine status="error">
            <TraceIcon>
              <HugeiconsIcon icon={CommandLineIcon} strokeWidth={2} />
            </TraceIcon>
            <TraceTitle>Failed to run pnpm --version</TraceTitle>
          </TraceLine>
        </Trace>
        <p>Node is installed and pnpm is not. Reading the docs config.</p>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  ),
}

/** Running lines pause outside the scrolling box and resume as they come into view. */
export const OutOfView: Story = {
  render: function Render() {
    const [running, setRunning] = React.useState(true)
    return (
      <>
        <Button variant="outline" onClick={() => setRunning(false)}>
          Stop running
        </Button>
        <div
          className="max-h-48 overflow-y-auto"
          role="region"
          aria-label="Running steps"
          tabIndex={0}
        >
          <Trace>
            {Array.from({ length: 30 }, (_, index) => (
              <TraceLine key={index} status={running ? "running" : "pending"}>
                <TraceTitle>Running step {index + 1}</TraceTitle>
              </TraceLine>
            ))}
          </Trace>
        </div>
      </>
    )
  },
  play: async ({ canvas }) => {
    const first = canvas.getByText("Running step 1")
    const last = canvas.getByText("Running step 30")
    const box = canvas.getByRole("region", { name: "Running steps" })
    await waitFor(() => {
      expect(first).not.toHaveAttribute("data-shimmer-paused")
      expect(getComputedStyle(first).animationPlayState).toBe("running")
    })
    await waitFor(() => {
      expect(last).toHaveAttribute("data-shimmer-paused")
      expect(getComputedStyle(last).animationPlayState).toBe("paused")
    })
    box.scrollTop = box.scrollHeight
    await waitFor(() => {
      expect(last).not.toHaveAttribute("data-shimmer-paused")
      expect(getComputedStyle(last).animationPlayState).toBe("running")
      expect(first).toHaveAttribute("data-shimmer-paused")
      expect(getComputedStyle(first).animationPlayState).toBe("paused")
    })
    await userEvent.click(canvas.getByRole("button", { name: "Stop running" }))
    await waitFor(() => {
      expect(first).not.toHaveAttribute("data-shimmer-paused")
      expect(last).not.toHaveAttribute("data-shimmer-paused")
      expect(getComputedStyle(first).animationName).toBe("none")
      expect(getComputedStyle(last).animationName).toBe("none")
    })
  },
}
