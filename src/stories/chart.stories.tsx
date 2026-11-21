import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { expect, userEvent, waitFor, within } from "storybook/test"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const meta = {
  title: "Components/Chart",
  component: ChartContainer,
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

const data = [
  { month: "January", runs: 186, failures: 80 },
  { month: "February", runs: 305, failures: 200 },
  { month: "March", runs: 237, failures: 120 },
  { month: "April", runs: 73, failures: 190 },
  { month: "May", runs: 209, failures: 130 },
  { month: "June", runs: 214, failures: 140 },
]

const config = {
  runs: { label: "Runs", color: "var(--chart-2)" },
  failures: { label: "Failures", color: "var(--chart-4)" },
} satisfies ChartConfig

export const Bars: Story = {
  args: { config, children: <></> },
  render: () => (
    <ChartContainer
      config={config}
      className="min-h-50 w-md"
      role="img"
      aria-label="Runs and failures per month, January to June"
    >
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="runs" fill="var(--color-runs)" radius={4} />
        <Bar dataKey="failures" fill="var(--color-failures)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("img", { name: /Runs and failures per month/ })
    ).toBeVisible()
  },
}

export const Lines: Story = {
  args: { config, children: <></> },
  render: () => (
    <ChartContainer
      config={config}
      className="min-h-50 w-md"
      role="img"
      aria-label="Runs per month, January to June"
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line
          dataKey="runs"
          type="natural"
          stroke="var(--color-runs)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  ),
}

/** A time's use: its calls and the tokens in and out. The app's own. */
type UsageBucket = {
  startedAt: number
  calls: number
  inputTokens: number
  outputTokens: number
}
type UsageRange = "24h" | "7d" | "30d"

const hour = 60 * 60 * 1000
const now = Date.UTC(2026, 10, 7, 12)
/** As the app would have them: by the hour for a day, by the day else. */
function usage(range: UsageRange): UsageBucket[] {
  const [count, width] =
    range === "24h"
      ? [24, hour]
      : range === "7d"
        ? [7, 24 * hour]
        : [30, 24 * hour]
  return Array.from({ length: count }, (_, index) => {
    const calls = index % 5 === 3 ? 0 : 2 + ((index * 7) % 11)
    return {
      startedAt: now - (count - index) * width,
      calls,
      inputTokens: calls * (900 + ((index * 131) % 700)),
      outputTokens: calls * (300 + ((index * 97) % 400)),
    }
  })
}

type UsageLabels = {
  title: string
  description: string
  range: string
  ranges: Record<UsageRange, string>
  input: string
  output: string
  total: string
  calls: (count: number) => string
  noCalls: string
  empty: string
  emptyHint: string
  /** The table's headings: when, and how many calls. */
  time: string
  callCount: string
}

const usageLabels: UsageLabels = {
  title: "Usage",
  description: "Tokens in and out",
  range: "Range",
  ranges: { "24h": "24h", "7d": "7d", "30d": "30d" },
  input: "Input",
  output: "Output",
  total: "Total",
  calls: (count) => `${count} ${count === 1 ? "call" : "calls"}`,
  noCalls: "No calls",
  empty: "No usage yet",
  emptyHint: "Calls in this range show here.",
  time: "Time",
  callCount: "Calls",
}

const usageConfig = {
  inputTokens: { label: "Input", color: "var(--chart-1)" },
  outputTokens: { label: "Output", color: "var(--chart-2)" },
} satisfies ChartConfig

/**
 * The app's use over time, from shadcn's own pieces: a card, its range
 * a toggle group, a stacked bar chart of tokens in and out, its tooltip
 * with the calls and the total. Dates and numbers in the reader's
 * language, by `Intl`; with no calls, an empty state; for a screen
 * reader, a table of the same.
 */
function UsageCard({
  buckets,
  range,
  onRangeChange,
  locale = "en",
  labels = usageLabels,
}: {
  buckets: UsageBucket[]
  range: UsageRange
  onRangeChange: (range: UsageRange) => void
  locale?: string
  labels?: UsageLabels
}) {
  const config = {
    inputTokens: { ...usageConfig.inputTokens, label: labels.input },
    outputTokens: { ...usageConfig.outputTokens, label: labels.output },
  } satisfies ChartConfig
  const when = new Intl.DateTimeFormat(
    locale,
    range === "24h"
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric" }
  )
  const number = new Intl.NumberFormat(locale)
  const short = new Intl.NumberFormat(locale, { notation: "compact" })
  const used = buckets.some((bucket) => bucket.calls > 0)
  // Four ticks, the first, the last and two between: not one a bar.
  const ticks = [
    ...new Set(
      [0, 1, 2, 3].map(
        (index) =>
          buckets[Math.round((index * (buckets.length - 1)) / 3)]?.startedAt
      )
    ),
  ].filter((tick) => tick !== undefined)

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
        <CardAction>
          <ToggleGroup
            variant="outline"
            size="sm"
            aria-label={labels.range}
            value={[range]}
            onValueChange={(value) => {
              // One always chosen: pressing it again keeps it.
              const next = value.find((each) => each !== range)
              if (next) onRangeChange(next as UsageRange)
            }}
          >
            {(["24h", "7d", "30d"] as const).map((each) => (
              <ToggleGroupItem key={each} value={each}>
                {labels.ranges[each]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!used ? (
          <Empty className="h-50 border">
            <EmptyHeader>
              <EmptyTitle>{labels.empty}</EmptyTitle>
              <EmptyDescription>{labels.emptyHint}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ChartContainer
              config={config}
              // Reached by Tab (accessibilityLayer), the arrow keys moving
              // its tooltip from bar to bar: the chart's own focus ring.
              className="aspect-auto h-50 w-full"
              role="img"
              aria-label={`${labels.title} · ${labels.ranges[range]}`}
            >
              <BarChart
                accessibilityLayer
                data={buckets}
                margin={{ left: 0, right: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="startedAt"
                  ticks={ticks}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: number) => when.format(value)}
                />
                <YAxis
                  // As wide as its longest label, in the reader's language
                  // and text size: "200万" (ja-JP) at a larger root font size.
                  width="auto"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => short.format(value)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="min-w-44"
                      labelFormatter={(_, payload) => {
                        const bucket = payload[0]?.payload as UsageBucket
                        return `${when.format(bucket.startedAt)} · ${
                          bucket.calls === 0
                            ? labels.noCalls
                            : labels.calls(bucket.calls)
                        }`
                      }}
                      formatter={(value, name, item, index) => (
                        <>
                          <div
                            className="size-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
                            style={
                              {
                                "--color-bg": `var(--color-${name})`,
                              } as React.CSSProperties
                            }
                          />
                          <span className="text-muted-foreground">
                            {config[name as keyof typeof config].label}
                          </span>
                          <span className="ms-auto font-mono font-medium text-foreground tabular-nums">
                            {number.format(value as number)}
                          </span>
                          {/* After the last, the total. */}
                          {index === 1 && (
                            <div className="flex basis-full items-center border-t pt-1.5 font-medium text-foreground">
                              {labels.total}
                              <span className="ms-auto font-mono tabular-nums">
                                {number.format(
                                  (item.payload as UsageBucket).inputTokens +
                                    (item.payload as UsageBucket).outputTokens
                                )}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="inputTokens"
                  stackId="tokens"
                  fill="var(--color-inputTokens)"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="outputTokens"
                  stackId="tokens"
                  fill="var(--color-outputTokens)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            {/* The same, read out: the chart is for the eye. */}
            <table className="sr-only">
              <caption>
                {labels.title} · {labels.ranges[range]}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{labels.time}</th>
                  <th scope="col">{labels.callCount}</th>
                  <th scope="col">{labels.input}</th>
                  <th scope="col">{labels.output}</th>
                  <th scope="col">{labels.total}</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((bucket) => (
                  <tr key={bucket.startedAt}>
                    <th scope="row">{when.format(bucket.startedAt)}</th>
                    <td>{number.format(bucket.calls)}</td>
                    <td>{number.format(bucket.inputTokens)}</td>
                    <td>{number.format(bucket.outputTokens)}</td>
                    <td>
                      {number.format(bucket.inputTokens + bucket.outputTokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Usage({
  locale,
  labels,
  none = false,
  scale = 1,
}: {
  locale?: string
  labels?: UsageLabels
  none?: boolean
  /** Its tokens times this: millions, for long labels. */
  scale?: number
}) {
  const [range, setRange] = React.useState<UsageRange>("24h")
  const buckets = none
    ? usage(range).map((bucket) => ({
        ...bucket,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
      }))
    : usage(range).map((bucket) => ({
        ...bucket,
        inputTokens: bucket.inputTokens * scale,
        outputTokens: bucket.outputTokens * scale,
      }))
  return (
    <UsageCard
      buckets={buckets}
      range={range}
      onRangeChange={setRange}
      {...(locale ? { locale } : {})}
      {...(labels ? { labels } : {})}
    />
  )
}

/**
 * Use over time: its range chosen, the bars by the hour or the day, the
 * tooltip a bar's calls, tokens and total; a table of the same for a
 * screen reader.
 */
export const UsageOverTime: Story = {
  args: { config, children: <></> },
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
  render: () => <Usage />,
  play: async ({ canvas, canvasElement }) => {
    const table = within(canvas.getByRole("table", { name: /^Usage/ }))
    await expect(table.getAllByRole("row")).toHaveLength(25)
    const first = usage("24h")[0]!
    await expect(table.getAllByRole("row")[1]!.textContent).toContain(
      new Intl.NumberFormat("en").format(first.inputTokens + first.outputTokens)
    )
    // Four ticks, not one a bar.
    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll(
          ".recharts-xAxis .recharts-cartesian-axis-tick"
        )
      ).toHaveLength(4)
    )

    // The first bar's tooltip: when, its calls, and the total.
    const bars = await waitFor(() => {
      const found = canvasElement.querySelectorAll(".recharts-rectangle")
      expect(found.length).toBeGreaterThan(0)
      return found
    })
    // Where the pointer is: the chart finds the bar under it.
    const box = bars[0]!.getBoundingClientRect()
    const at = {
      bubbles: true,
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    }
    bars[0]!.dispatchEvent(new MouseEvent("mouseover", at))
    bars[0]!.dispatchEvent(new MouseEvent("mousemove", at))
    const tooltip = await waitFor(() => {
      const element = canvasElement.querySelector(
        ".recharts-tooltip-wrapper div"
      )
      expect(element?.textContent).toMatch(/Total/)
      return element!
    })
    const hovered = usage("24h")[0]!
    await expect(tooltip.textContent).toContain(`${hovered.calls} calls`)
    await expect(tooltip.textContent).toContain(
      new Intl.NumberFormat("en").format(
        hovered.inputTokens + hovered.outputTokens
      )
    )

    // Seven days: by the day.
    await userEvent.click(canvas.getByRole("button", { name: "7d" }))
    await waitFor(() =>
      expect(
        within(canvas.getByRole("table", { name: /^Usage/ })).getAllByRole(
          "row"
        )
      ).toHaveLength(8)
    )
    await expect(canvas.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    // Pressed again, it stays chosen.
    await userEvent.click(canvas.getByRole("button", { name: "7d" }))
    await expect(canvas.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  },
}

/**
 * From the keyboard: Tab reaches the chart (Recharts' `accessibilityLayer`),
 * a focus ring round it, and the arrow keys move the tooltip from bar to
 * bar.
 */
export const UsageKeyboard: Story = {
  args: { config, children: <></> },
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
  render: () => <Usage />,
  play: async ({ canvas, canvasElement }) => {
    const surface = await waitFor(() => {
      const found = canvasElement.querySelector<SVGElement>(
        ".recharts-surface[tabindex]"
      )
      expect(found).toBeTruthy()
      return found!
    })
    await userEvent.click(canvas.getByRole("button", { name: "24h" }))
    while (document.activeElement !== surface) await userEvent.tab()
    await waitFor(() =>
      expect(
        getComputedStyle(surface.closest("[data-slot=chart]")!).boxShadow
      ).not.toBe("none")
    )
    const tip = () =>
      canvasElement.querySelector(".recharts-tooltip-wrapper div")
        ?.textContent ?? ""
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(tip()).toMatch(/Total/))
    const before = tip()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(tip()).not.toBe(before))
    await expect(tip()).toMatch(/calls?.*Total/)
  },
}

/** With no calls in its range: an empty state, not empty bars. */
export const UsageEmpty: Story = {
  args: { config, children: <></> },
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
  render: () => <Usage none />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No usage yet")).toBeVisible()
    await expect(canvas.queryByRole("table")).toBeNull()
  },
}

/** In the reader's language, and narrow: it fits, the range still there. */
export const UsageLocalized: Story = {
  args: { config, children: <></> },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Usage
      locale="ja-JP"
      scale={100}
      labels={{
        title: "使用量",
        description: "入力と出力のトークン",
        range: "期間",
        ranges: { "24h": "24 時間", "7d": "7 日", "30d": "30 日" },
        input: "入力",
        output: "出力",
        total: "合計",
        calls: (count) => `${count} 回の呼び出し`,
        noCalls: "呼び出しなし",
        empty: "まだ使用量はありません",
        emptyHint: "この期間の呼び出しがここに表示されます。",
        time: "時刻",
        callCount: "呼び出し",
      }}
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("group", { name: "期間" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "30 日" }))
    const table = within(canvas.getByRole("table", { name: /^使用量/ }))
    await waitFor(() => expect(table.getAllByRole("row")).toHaveLength(31))
    await expect(
      table.getByRole("columnheader", { name: "合計" })
    ).toBeInTheDocument()
    // Dates as the reader writes them.
    await expect(table.getAllByRole("rowheader")[0]!.textContent).toBe(
      new Intl.DateTimeFormat("ja-JP", {
        month: "short",
        day: "numeric",
      }).format(usage("30d")[0]!.startedAt)
    )
    // As wide as its place, and nothing wider in it.
    const card = canvasElement.querySelector("[data-slot=card]")!
    await expect(card.getBoundingClientRect().width).toBeCloseTo(320, 0)
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth)

    // Its axis's labels whole, "220万" too, at the reader's text size.
    const root = document.documentElement
    const size = root.style.fontSize
    try {
      for (const fontSize of ["16px", "20.5714px"]) {
        root.style.fontSize = fontSize
        await waitFor(() => {
          const chart = canvasElement
            .querySelector("[data-slot=chart]")!
            .getBoundingClientRect()
          const ticks = [
            ...canvasElement.querySelectorAll(
              ".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value"
            ),
          ]
          expect(ticks.map((tick) => tick.textContent)).toContain("220万")
          for (const tick of ticks)
            expect(
              tick.getBoundingClientRect().left,
              `${tick.textContent} at ${fontSize}`
            ).toBeGreaterThanOrEqual(chart.left - 0.5)
        })
      }
    } finally {
      root.style.fontSize = size
    }
  },
}
