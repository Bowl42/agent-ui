import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { AgentEvent } from "@/components/agent-event"
import { AgentTurn, type AgentTurnPart } from "@/components/agent-turn"
import { UserMessage, UserMessageText } from "@/components/user-message"
import { FoldProvider } from "@/hooks/use-fold"

const meta = {
  title: "Blocks/Agent Event",
  component: AgentEvent,
  parameters: { layout: "padded" },
  args: { title: "" },
  decorators: [
    (Story) => (
      <FoldProvider>
        <div className="flex w-165 max-w-full flex-col gap-1">
          <Story />
        </div>
      </FoldProvider>
    ),
  ],
} satisfies Meta<typeof AgentEvent>

export default meta
type Story = StoryObj<typeof meta>

const report = (
  <div className="flex flex-col gap-2">
    <p>Migration checks for 41 tables, each run against staging.</p>
    <table className="w-full text-start text-2sm">
      <thead className="text-muted-foreground">
        <tr>
          <th className="py-1 text-start font-normal">Table</th>
          <th className="py-1 text-start font-normal">Rows</th>
          <th className="py-1 text-start font-normal">Errors</th>
        </tr>
      </thead>
      <tbody>
        {["contacts", "profiles", "orders", "invoices"].map((name, at) => (
          <tr key={name} className="border-t">
            <td className="py-1">{name}</td>
            <td className="py-1 tabular-nums">{(at + 1) * 1204}</td>
            <td className="py-1 tabular-nums">{at === 2 ? 3 : 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const line = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>("[data-slot=agent-event-line]")!

/**
 * A line of a stream the agent watches: one light grey pill, its icon,
 * its source, the line, when; at the start edge, as wide as it needs,
 * 28px high (36px on a phone). Nothing to open: not a button.
 */
export const Monitor: Story = {
  args: {
    kind: "monitor",
    title: "staging migration: per-table completion and errors",
    time: "14:32",
  },
  play: async ({ canvasElement }) => {
    const pill = line(canvasElement)
    await expect(pill).toHaveTextContent(
      "Monitorstaging migration: per-table completion and errors14:32"
    )
    await expect(pill.tagName).toBe("DIV")
    await expect(
      canvasElement.querySelector("button, [aria-expanded]")
    ).toBeNull()
    const box = pill.getBoundingClientRect()
    await expect(Math.round(box.height)).toBe(
      matchMedia("(width < 40rem)").matches ? 36 : 28
    )
    // Its own width, not the column's; its icon on the column's start
    // (a step's icon column), the pill out past it by its padding.
    const column = canvasElement
      .querySelector<HTMLElement>("[data-slot=agent-event]")!
      .getBoundingClientRect()
    const iconBox = canvasElement
      .querySelector("[data-slot=agent-event-icon]")!
      .getBoundingClientRect()
    await expect(Math.abs(iconBox.left - column.left)).toBeLessThan(1)
    await expect(Math.round(column.left - box.left)).toBe(12)
    await expect(box.width).toBeLessThanOrEqual(column.width + 12.5)
    const style = getComputedStyle(pill)
    await expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
    await expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(10)
    // Its source darker than what it said, on one line with its icon.
    const source = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-event-source]"
    )!
    await expect(getComputedStyle(source).color).not.toBe(
      getComputedStyle(
        canvasElement.querySelector("[data-slot=agent-event-title]")!
      ).color
    )
    // Its icon, source and time on one line, centred in the pill.
    const middle = (element: Element | null) => {
      const box = element!.getBoundingClientRect()
      return box.top + box.height / 2
    }
    const centre = box.top + box.height / 2
    const phone = matchMedia("(width < 40rem)").matches
    // On a phone its source is for a screen reader alone.
    await expect(source.getBoundingClientRect().width > 1).toBe(!phone)
    for (const part of [
      canvasElement.querySelector("[data-slot=agent-event-icon] svg"),
      ...(phone ? [] : [source]),
      canvasElement.querySelector("[data-slot=agent-event-time]"),
    ])
      await expect(Math.abs(middle(part) - centre)).toBeLessThan(1)
  },
}

/** On a phone: a finger's height, the words a size larger. */
export const MonitorPhone: Story = {
  ...Monitor,
  globals: { viewport: { value: "mobile1", isRotated: false } },
}

/** A long line: cut short in its pill, its whole line on hover. */
export const LongLine: Story = {
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    kind: "monitor",
    title:
      "deploy api-7f9c: rolling 12 of 40 pods, 3 waiting on the readiness probe, p95 latency 412ms",
    time: "14:33",
  },
  play: async ({ canvasElement }) => {
    const pill = line(canvasElement)
    const box = canvasElement
      .querySelector<HTMLElement>("[data-slot=agent-event]")!
      .getBoundingClientRect()
    await expect(pill.getBoundingClientRect().right).toBeLessThanOrEqual(
      box.right + 0.5
    )
    await expect(pill.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      box.left - 12.5
    )
    const title = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-event-title]"
    )!
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth)
    // The time still there, after the words cut short.
    await expect(
      canvasElement.querySelector("[data-slot=agent-event-time]")
    ).toBeVisible()
    await userEvent.hover(pill)
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=agent-event]")
      ).toHaveAttribute("title", expect.stringContaining("p95 latency 412ms"))
    )
  },
}

/**
 * A background task's end with its report: its summary alone, closed; a
 * click opens the report under it, what it cost at its foot.
 */
export const TaskReport: Story = {
  args: {
    kind: "task",
    title: 'Agent "Audit tables" finished',
    time: "14:40",
    meta: "38 tool uses · 4m 12s",
    details: report,
  },
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole("button", {
      name: /Background task.*Audit tables/,
    })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(
      canvasElement.querySelector("[data-slot=agent-event-details]")
    ).toBeNull()
    // What it cost is with its report, not on its line.
    await expect(trigger).not.toHaveTextContent("38 tool uses")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    const details = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        "[data-slot=agent-event-details]"
      )
      expect(found).toBeVisible()
      return found!
    })
    await expect(within(details).getByRole("table")).toBeVisible()
    await expect(details).toHaveTextContent("38 tool uses · 4m 12s")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  },
}

/**
 * A task that failed: "Failed" after its words, an alert before it, by
 * weight and shade as a failed step's, not a colour.
 */
export const TaskFailed: Story = {
  args: {
    kind: "task",
    status: "failed",
    title: 'Agent "Migrate profiles" stopped on an error',
    time: "14:41",
    meta: "12 tool uses · 1m 03s",
    details: <p>relation &quot;profiles_v2&quot; does not exist</p>,
  },
  play: async ({ canvas, canvasElement }) => {
    const status = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-event-status]"
    )!
    await expect(status).toHaveTextContent("Failed")
    await expect(status.querySelector("svg")).not.toBeNull()
    await expect(
      canvasElement.querySelector("[data-slot=agent-event]")
    ).toHaveAttribute("data-status", "failed")
    await expect(
      canvas.getByRole("button", { name: /Failed/ })
    ).toBeInTheDocument()
    // The text's own colour, no red.
    const title = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-event-source]"
    )!
    await expect(getComputedStyle(status).color).toBe(
      getComputedStyle(title).color
    )
  },
}

/** A task the reader or the agent stopped (killed). */
export const TaskStopped: Story = {
  args: {
    kind: "task",
    status: "stopped",
    title: 'Agent "Reindex search" was stopped',
    time: "14:44",
    meta: "4 tool uses · 22s",
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector("[data-slot=agent-event-status]")
    ).toHaveTextContent("Stopped")
    // With nothing to open, what it cost on its line.
    await expect(line(canvasElement)).toHaveTextContent("4 tool uses · 22s")
  },
}

/** A wake-up the agent had set, come. */
export const WakeUp: Story = {
  args: {
    kind: "wake",
    title: "Check the CI run for #482",
    time: "15:00",
  },
  play: async ({ canvasElement }) => {
    await expect(line(canvasElement)).toHaveTextContent(
      "Wake-upCheck the CI run for #482"
    )
  },
}

/** The app's own source and icon, and its words. */
export const Labels: Story = {
  args: {
    kind: "task",
    status: "failed",
    source: "Tâche de fond",
    title: "Migration des contacts",
    time: "14:41",
    labels: { failed: "Échec" },
  },
  play: async ({ canvasElement }) => {
    await expect(line(canvasElement)).toHaveTextContent(
      "Tâche de fondMigration des contactsÉchec14:41"
    )
  },
}

const turnParts: AgentTurnPart[] = [
  {
    type: "tool",
    id: "turn:watch",
    kind: "command",
    command: "kubectl logs -f deploy/migration",
    status: "done",
    duration: "2m",
  },
  {
    type: "event",
    id: "turn:event-1",
    kind: "monitor",
    title: "contacts: 1204 rows, 0 errors",
    time: "14:31",
  },
  {
    type: "event",
    id: "turn:event-2",
    kind: "monitor",
    title: "staging migration: per-table completion and errors",
    time: "14:32",
  },
  {
    type: "content",
    id: "turn:said",
    content: (
      <p>contacts is done: 1,204 rows, no errors. Running profiles now.</p>
    ),
  },
  {
    type: "tool",
    id: "turn:read",
    kind: "read",
    path: "logs/profiles.log",
    status: "done",
    duration: "0.2s",
  },
  {
    type: "event",
    id: "turn:task",
    kind: "task",
    status: "failed",
    title: 'Agent "Migrate profiles" stopped on an error',
    time: "14:41",
    meta: "12 tool uses · 1m 03s",
    details: <p>relation &quot;profiles_v2&quot; does not exist</p>,
  },
  {
    type: "content",
    id: "turn:answer",
    content: (
      <p>
        The profiles migration failed: table profiles_v2 doesn&apos;t exist yet.
        I&apos;ll create it and run it again.
      </p>
    ),
  },
]

/**
 * In a turn, where they came: among its steps while it runs, apart from
 * what it says; consecutive ones closer. Done, one after its last step
 * is with its answer, not folded away.
 */
export const InATurn: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <UserMessage>
        <UserMessageText>
          Watch the migration deploy and tell me when the tables finish
        </UserMessageText>
      </UserMessage>
      <AgentTurn id="events-running" status="running" parts={turnParts} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const events = [
      ...canvasElement.querySelectorAll<HTMLElement>("[data-slot=agent-event]"),
    ]
    await expect(events.map((event) => event.dataset.partId)).toEqual([
      "turn:event-1",
      "turn:event-2",
      "turn:task",
    ])
    // Not what the agent said: no answer's or content's slot holds them.
    for (const event of events)
      await expect(
        event.closest(
          "[data-slot=agent-turn-content], [data-slot=agent-turn-answer]"
        )
      ).toBeNull()
    // Consecutive ones closer than one apart from the steps.
    const [first, second, third] = events.map((event) =>
      event.getBoundingClientRect()
    )
    const close = second!.top - first!.bottom
    await expect(close).toBeLessThanOrEqual(4)
    const said = canvasElement
      .querySelector("[data-slot=agent-turn-content]")!
      .getBoundingClientRect()
    await expect(said.top - second!.bottom).toBeGreaterThanOrEqual(12)
    await expect(third!.top).toBeGreaterThan(said.bottom)
  },
}

/** Done: the event after its last step stays with the answer, in sight. */
export const InADoneTurn: Story = {
  render: () => (
    <AgentTurn
      id="events-done"
      status="done"
      duration="12m"
      parts={turnParts}
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    const work = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-turn-work-trigger]"
    )!
    await expect(work).toHaveAttribute("aria-expanded", "false")
    const shown = [
      ...canvasElement.querySelectorAll<HTMLElement>("[data-slot=agent-event]"),
    ].filter((event) => event.checkVisibility())
    await expect(shown.map((event) => event.dataset.partId)).toEqual([
      "turn:task",
    ])
    await expect(
      canvas.getByText(/profiles migration failed/).getBoundingClientRect().top
    ).toBeGreaterThan(shown[0]!.getBoundingClientRect().bottom)
    // Its report opens where it is.
    await userEvent.click(
      canvas.getByRole("button", { name: /Migrate profiles/ })
    )
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[data-slot=agent-event-details]")
      ).toBeVisible()
    )
    await expect(
      canvasElement.querySelector("[data-slot=agent-event-details]")
    ).toHaveTextContent('relation "profiles_v2" does not exist')
  },
}

/** Between turns: a wake-up that starts the next one. */
export const BetweenTurns: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <AgentTurn
        id="before-wake"
        status="done"
        duration="3s"
        parts={[
          {
            type: "content",
            id: "before-wake:said",
            content: <p>OK, I&apos;ll check CI again in ten minutes.</p>,
          },
        ]}
      />
      <AgentEvent kind="wake" title="Check the CI run for #482" time="15:00" />
      <AgentTurn
        id="after-wake"
        status="done"
        duration="20s"
        parts={[
          {
            type: "content",
            id: "after-wake:said",
            content: <p>CI passed; #482 is ready to merge.</p>,
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll("[data-slot=agent-event]")
    ).toHaveLength(1)
  },
}

/**
 * In a turn, its words: the turn's for all its events (`labels.event`),
 * an event's own over them.
 */
export const InATurnLabels: Story = {
  render: () => (
    <AgentTurn
      id="events-labels"
      status="done"
      duration="2m"
      labels={{ event: { failed: "Échec", task: "Tâche de fond" } }}
      parts={[
        {
          type: "event",
          id: "labels:failed",
          kind: "task",
          status: "failed",
          title: "Migration des contacts",
          time: "14:41",
        },
        {
          type: "event",
          id: "labels:stopped",
          kind: "task",
          status: "stopped",
          title: "Réindexation",
          time: "14:44",
          labels: { stopped: "Arrêtée" },
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const lines = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        "[data-slot=agent-event-line]"
      ),
    ]
    await expect(lines.map((line) => line.textContent)).toEqual([
      "Tâche de fondMigration des contactsÉchec14:41",
      "Tâche de fondRéindexationArrêtée14:44",
    ])
  },
}
