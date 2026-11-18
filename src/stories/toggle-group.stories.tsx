import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown02Icon,
  ArrowUp02Icon,
  Bookmark02Icon,
  ChartIncreaseIcon,
  FavouriteIcon,
  StarIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@hugeicons/core-free-icons"
import * as React from "react"
import { expect, userEvent } from "storybook/test"

import { Field, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const meta = {
  title: "Components/Toggle Group",
  component: ToggleGroup,
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <ToggleGroup multiple spacing={1} aria-label="Text style">
      <ToggleGroupItem value="bold" aria-label="Bold">
        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <HugeiconsIcon icon={TextUnderlineIcon} strokeWidth={2} />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
  play: async ({ canvas }) => {
    const bold = canvas.getByRole("button", { name: "Bold" })
    const italic = canvas.getByRole("button", { name: "Italic" })
    const underline = canvas.getByRole("button", { name: "Underline" })

    // One tab stop for the whole group; arrows move within it.
    await userEvent.tab()
    await expect(bold).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard("{ArrowRight}")
    await expect(italic).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(bold).toHaveAttribute("aria-pressed", "true")
    await expect(italic).toHaveAttribute("aria-pressed", "true")
    await userEvent.keyboard("{End}")
    await expect(underline).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(bold).toHaveFocus()
  },
}

/** Without `multiple`, pressing one item releases the other. */
export const Outline: Story = {
  render: () => (
    <ToggleGroup variant="outline" defaultValue={["all"]} aria-label="Filter">
      <ToggleGroupItem value="all">All runs</ToggleGroupItem>
      <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
    </ToggleGroup>
  ),
  play: async ({ canvas }) => {
    const all = canvas.getByRole("button", { name: "All runs" })
    const failed = canvas.getByRole("button", { name: "Failed" })
    await expect(all).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(failed)
    await expect(failed).toHaveAttribute("aria-pressed", "true")
    await expect(all).toHaveAttribute("aria-pressed", "false")

    // In dark, the pressed item is a step lighter than a hovered one.
    if (document.documentElement.classList.contains("dark")) {
      await userEvent.hover(all)
      const background = (element: HTMLElement) =>
        getComputedStyle(element).backgroundColor
      await expect(background(failed)).not.toBe(background(all))
    }
  },
}

export const OutlineWithIcons: Story = {
  render: () => (
    <ToggleGroup variant="outline" multiple size="sm" aria-label="Text style">
      <ToggleGroupItem value="bold" aria-label="Bold">
        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <HugeiconsIcon icon={TextUnderlineIcon} strokeWidth={2} />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

const positions = ["Top", "Bottom", "Left", "Right"]

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "default", "lg"] as const).map((size) => (
        <ToggleGroup
          key={size}
          size={size}
          variant="outline"
          defaultValue={["top"]}
          aria-label={`Position, ${size}`}
        >
          {positions.map((position) => (
            <ToggleGroupItem key={position} value={position.toLowerCase()}>
              {position}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ))}
    </div>
  ),
}

export const WithSpacing: Story = {
  render: () => (
    <ToggleGroup
      size="sm"
      variant="outline"
      spacing={2}
      defaultValue={["today"]}
      aria-label="Date range"
    >
      <ToggleGroupItem value="today">Today</ToggleGroupItem>
      <ToggleGroupItem value="week">This week</ToggleGroupItem>
      <ToggleGroupItem value="month">This month</ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <ToggleGroup
      multiple
      variant="outline"
      spacing={2}
      size="sm"
      aria-label="Reactions"
    >
      {[
        { value: "star", label: "Star", Icon: StarIcon },
        { value: "heart", label: "Heart", Icon: FavouriteIcon },
        { value: "bookmark", label: "Bookmark", Icon: Bookmark02Icon },
      ].map(({ value, label, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          className="aria-pressed:bg-transparent aria-pressed:*:[svg]:fill-foreground aria-pressed:*:[svg]:stroke-foreground"
        >
          <HugeiconsIcon icon={Icon} strokeWidth={2} />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  ),
}

export const Sort: Story = {
  render: () => (
    <ToggleGroup
      defaultValue={["newest"]}
      variant="outline"
      size="sm"
      aria-label="Sort chats"
    >
      <ToggleGroupItem value="newest">
        <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} />
        Newest
      </ToggleGroupItem>
      <ToggleGroupItem value="oldest">
        <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2} />
        Oldest
      </ToggleGroupItem>
      <ToggleGroupItem value="active">
        <HugeiconsIcon icon={ChartIncreaseIcon} strokeWidth={2} />
        Most active
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Vertical: Story = {
  render: () => (
    <ToggleGroup
      multiple
      orientation="vertical"
      spacing={1}
      aria-label="Text style"
    >
      <ToggleGroupItem value="bold" aria-label="Bold">
        <HugeiconsIcon icon={TextBoldIcon} strokeWidth={2} />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <HugeiconsIcon icon={TextItalicIcon} strokeWidth={2} />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <HugeiconsIcon icon={TextUnderlineIcon} strokeWidth={2} />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await userEvent.keyboard("{ArrowDown}")
    await expect(canvas.getByRole("button", { name: "Italic" })).toHaveFocus()
  },
}

export const VerticalOutline: Story = {
  render: () => (
    <ToggleGroup
      variant="outline"
      defaultValue={["all"]}
      orientation="vertical"
      size="sm"
      aria-label="Run status"
    >
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="running">Running</ToggleGroupItem>
      <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
      <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
    </ToggleGroup>
  ),
}

function FontWeightDemo() {
  const [fontWeight, setFontWeight] = React.useState("normal")
  return (
    <Field>
      <FieldLabel id="font-weight-label">Font weight</FieldLabel>
      <ToggleGroup
        value={[fontWeight]}
        onValueChange={(value) => setFontWeight(value[0] ?? fontWeight)}
        variant="outline"
        spacing={2}
        size="lg"
        aria-labelledby="font-weight-label"
      >
        {[
          { value: "light", label: "Light", className: "font-light" },
          { value: "normal", label: "Normal", className: "font-normal" },
          { value: "medium", label: "Medium", className: "font-medium" },
          { value: "bold", label: "Bold", className: "font-bold" },
        ].map((weight) => (
          <ToggleGroupItem
            key={weight.value}
            value={weight.value}
            className="flex size-16 flex-col items-center justify-center rounded-xl"
          >
            <span
              aria-hidden="true"
              className={`text-2xl leading-none ${weight.className}`}
            >
              Aa
            </span>
            <span className="text-xs text-muted-foreground">
              {weight.label}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-sm text-muted-foreground">
        Use{" "}
        <code className="rounded-md bg-muted px-1 py-0.5 font-mono">
          font-{fontWeight}
        </code>{" "}
        to set the font weight.
      </p>
    </Field>
  )
}

export const FontWeightSelector: Story = {
  render: () => <FontWeightDemo />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("group", { name: "Font weight" })
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Bold" }))
    await expect(canvas.getByText("font-bold")).toBeVisible()
    // Pressing the selected item again keeps a weight selected.
    await userEvent.click(canvas.getByRole("button", { name: "Bold" }))
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  },
}
