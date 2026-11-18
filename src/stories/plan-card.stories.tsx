import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, mocked, spyOn, userEvent, waitFor } from "storybook/test"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"

import { PlanCard, type PlanCardStatus } from "@/components/plan-card"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const shortPlan =
  "# Update the helpers\n\nReplace the shared helpers and verify their callers."
const longPlan = `# Update the shared helpers

Keep the public interface stable while simplifying the implementation.
Review each caller before changing the shared utilities.

1. Inspect the existing helpers and record their inputs.
   Identify callers that depend on missing values.
   Keep those cases visible during the migration.

2. Replace the duplicate formatting functions.
   Use the shared implementation in each caller.
   Preserve the current output for empty values.

3. Update the types at the module boundary.
   Prefer explicit return types for exported functions.
   Keep internal details private to the module.

4. Verify the affected screens and their empty states.
   Check keyboard navigation through the actions.
   Confirm that the copy still describes the result.

5. Run the type checks and review the changes.
   Document any caller that needs a separate migration.
   Keep the change focused on the shared helpers.

A small helper keeps the fallback explicit:

\`\`\`ts
export function displayName(value: string | null): string {
  return value?.trim() || "Untitled"
}
\`\`\`

The result preserves the existing interface with fewer duplicate paths.
`

const meta = {
  title: "Components/Plan Card",
  component: PlanCard,
  decorators: [
    (Story) => (
      <div className="w-165 max-w-full">
        <Story />
      </div>
    ),
  ],
  args: { children: longPlan, onAccept: fn(), onRevise: fn() },
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText").mockResolvedValue(
      undefined
    )
    return () => writeText.mockRestore()
  },
} satisfies Meta<typeof PlanCard>
export default meta
type Story = StoryObj<typeof meta>

function DecisionPlan(args: React.ComponentProps<typeof PlanCard>) {
  const [status, setStatus] = React.useState<PlanCardStatus>("proposed")
  return (
    <PlanCard
      {...args}
      status={status}
      onAccept={() => {
        args.onAccept?.()
        setStatus("accepted")
      }}
      onRevise={() => {
        args.onRevise?.()
        setStatus("revising")
      }}
    />
  )
}

/** A long proposal folds its Markdown above the reader's choices. */
export const Proposed: Story = {
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("region", { name: "Proposed plan" })
      ).toBeVisible()
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("heading", {
          level: 4,
          name: "Update the shared helpers",
        })
      ).toBeVisible()
    )
    const more = await canvas.findByRole("button", { name: "Show all" })
    await expect(more).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(more)
    await expect(
      await canvas.findByRole("button", { name: "Show less" })
    ).toHaveAttribute("aria-expanded", "true")
    const revise = canvas.getByRole("button", { name: "Revise" })
    const accept = canvas.getByRole("button", { name: "Implement" })
    await expect(
      Boolean(
        revise.compareDocumentPosition(accept) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true)
    await expect(canvas.getAllByRole("button").at(-1)).toBe(accept)
  },
}

/** Implementing leaves a focused row that opens the original plan. */
export const Accept: Story = {
  args: { children: shortPlan, meta: "12:04", onAccept: fn() },
  render: (args) => <DecisionPlan {...args} />,
  play: async ({ args, canvas }) => {
    const accept = canvas.getByRole("button", { name: "Implement" })
    accept.focus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onAccept).toHaveBeenCalledTimes(1)
    await expect(canvas.queryByRole("region")).not.toBeInTheDocument()
    const row = await canvas.findByRole("button", { name: /Proposed plan/ })
    await expect(row).toHaveTextContent("Implemented · 12:04")
    await expect(row).toHaveFocus()
    await userEvent.click(row)
    await waitFor(() => expect(row).toHaveAttribute("aria-expanded", "true"))
    await waitFor(async () =>
      expect(
        await canvas.findByText(
          "Replace the shared helpers and verify their callers."
        )
      ).toBeVisible()
    )
    await expect(
      canvas.queryByRole("button", { name: "Implement" })
    ).not.toBeInTheDocument()
  },
}

/** Revising records the reader's request for changes. */
export const Revise: Story = {
  args: { children: shortPlan, onRevise: fn() },
  render: (args) => <DecisionPlan {...args} />,
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Revise" }))
    await expect(args.onRevise).toHaveBeenCalledTimes(1)
    await expect(
      await canvas.findByRole("button", { name: /Proposed plan/ })
    ).toHaveTextContent("Revised")
  },
}

/** Copy preserves the plan's original Markdown. */
export const Copy: Story = {
  play: async ({ args, canvas }) => {
    const copy = canvas.getByRole("button", { name: "Copy plan" })
    await userEvent.click(copy)
    await waitFor(() =>
      expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith(
        args.children
      )
    )
    await waitFor(() => expect(copy).toHaveAccessibleName("Copied"))
  },
}

const save = fn()
/** The app can place its own action after copy. */
export const Actions: Story = {
  args: {
    children: shortPlan,
    actions: (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Save to file"
              onClick={save}
            />
          }
        >
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
        </TooltipTrigger>
        <TooltipContent>Save to file</TooltipContent>
      </Tooltip>
    ),
  },
  play: async ({ canvas }) => {
    save.mockClear()
    const copy = canvas.getByRole("button", { name: "Copy plan" })
    const action = canvas.getByRole("button", { name: "Save to file" })
    await expect(
      Boolean(
        copy.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true)
    await userEvent.click(action)
    await expect(save).toHaveBeenCalledTimes(1)
  },
}

/** Labels translate the title, choices, decisions and fold. */
export const Labels: Story = {
  args: {
    labels: {
      title: "Vorgeschlagener Plan",
      accept: "Ausführen",
      revise: "Überarbeiten",
      status: {
        accepted: "Ausgeführt",
        revising: "Wird überarbeitet",
        rejected: "Abgelehnt",
      },
      copy: {
        copy: "Plan kopieren",
        copied: "Kopiert",
        failed: "Kopieren fehlgeschlagen",
      },
      clamp: {
        more: "Alles anzeigen",
        less: "Weniger anzeigen",
        collapse: "Einklappen",
        lines: (lines, words) => `${lines} Zeilen · ${words} Wörter`,
      },
    },
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByRole("region", { name: "Vorgeschlagener Plan" })
      ).toBeVisible()
    )
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Ausführen" })).toBeVisible()
    )
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Überarbeiten" })).toBeVisible()
    )
    await waitFor(async () =>
      expect(
        await canvas.findByRole("button", { name: "Alles anzeigen" })
      ).toBeVisible()
    )
  },
}

/** Narrow cards put the full-width default above the other choice. */
export const Phone: Story = {
  args: { children: shortPlan },
  render: (args) => (
    <div className="w-[358px]">
      <PlanCard {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const accept = canvas.getByRole("button", { name: "Implement" })
    const revise = canvas.getByRole("button", { name: "Revise" })
    await waitFor(() => {
      expect(accept.offsetWidth).toBeGreaterThan(300)
      expect(accept.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        revise.getBoundingClientRect().top
      )
      expect(accept.offsetHeight).toBe(44)
      expect(revise.offsetHeight).toBe(44)
    })
  },
}

/** The footer remains distinct from the card in dark mode. */
export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: "Proposed plan" })
    await waitFor(() => expect(card).toBeVisible())
    const footer = card.querySelector<HTMLElement>(
      "[data-slot=plan-card-footer]"
    )!
    await waitFor(() =>
      expect(getComputedStyle(footer).backgroundColor).not.toBe(
        getComputedStyle(card).backgroundColor
      )
    )
  },
}

/** A rejected proposal is one quiet decided row. */
export const Decided: Story = {
  args: { status: "rejected", children: shortPlan },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /Proposed plan/ })
    ).toHaveTextContent("Rejected")
  },
}
