import { useId, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

/**
 * The thumbs are the controls, and Base UI names them from the root's
 * `aria-labelledby`; `aria-label` on `Slider` names only the group, and
 * `<Label htmlFor>` cannot reach them. Point `aria-labelledby` at a label.
 */
function Labelled({
  label,
  ...props
}: React.ComponentProps<typeof Slider> & { label: string }) {
  const id = useId()
  return (
    <div className="grid w-72 gap-3">
      <Label id={id}>{label}</Label>
      <Slider aria-labelledby={id} {...props} />
    </div>
  )
}

const meta = {
  title: "Components/Slider",
  component: Slider,
  render: (args) => <Labelled label="Volume" {...args} />,
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { defaultValue: [50], max: 100, step: 1 },
  play: async ({ canvas }) => {
    const thumb = canvas.getByRole("slider", { name: "Volume" })
    await userEvent.tab()
    await expect(thumb).toHaveFocus()
    await expect(thumb).toHaveAttribute("aria-valuenow", "50")
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")
    await expect(thumb).toHaveAttribute("aria-valuenow", "52")
    await userEvent.keyboard("{End}")
    await expect(thumb).toHaveAttribute("aria-valuenow", "100")
    await userEvent.keyboard("{Home}")
    await expect(thumb).toHaveAttribute("aria-valuenow", "0")
  },
}

export const Range: Story = {
  args: { defaultValue: [25, 50], max: 100, step: 5 },
  render: (args) => <Labelled label="Price range" {...args} />,
  play: async ({ canvas }) => {
    const [start, end] = canvas.getAllByRole("slider", { name: "Price range" })
    await userEvent.tab()
    await expect(start).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(start).toHaveAttribute("aria-valuenow", "30")
    await userEvent.tab()
    await expect(end).toHaveFocus()
    await userEvent.keyboard("{ArrowLeft}")
    await expect(end).toHaveAttribute("aria-valuenow", "45")
  },
}

export const MultipleThumbs: Story = {
  args: { defaultValue: [10, 20, 70], max: 100, step: 10 },
  render: (args) => <Labelled label="Colour balance" {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("slider")).toHaveLength(3)
  },
}

export const Vertical: Story = {
  args: { max: 100, step: 1, orientation: "vertical", className: "h-40" },
  render: (args) => (
    <div className="flex items-center gap-6">
      <Slider {...args} aria-labelledby="slider-bass" defaultValue={[50]} />
      <Slider {...args} aria-labelledby="slider-treble" defaultValue={[25]} />
      <div className="grid gap-2 text-sm">
        <Label id="slider-bass">Bass</Label>
        <Label id="slider-treble">Treble</Label>
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const bass = canvas.getByRole("slider", { name: "Bass" })
    await userEvent.tab()
    await expect(bass).toHaveFocus()
    await userEvent.keyboard("{ArrowUp}")
    await expect(bass).toHaveAttribute("aria-valuenow", "51")
  },
}

function TemperatureSlider() {
  const [value, setValue] = useState([0.3, 0.7])
  return (
    <div className="grid w-72 gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label id="slider-temperature">Temperature</Label>
        <output className="text-sm text-muted-foreground">
          {value.map((v) => v.toFixed(1)).join(", ")}
        </output>
      </div>
      <Slider
        aria-labelledby="slider-temperature"
        value={value}
        onValueChange={(next) => setValue(next as number[])}
        min={0}
        max={1}
        step={0.1}
      />
    </div>
  )
}

export const Controlled: Story = {
  render: () => <TemperatureSlider />,
  play: async ({ canvas }) => {
    await userEvent.tab()
    await userEvent.keyboard("{ArrowRight}")
    await expect(canvas.getByRole("status")).toHaveTextContent("0.4, 0.7")
  },
}

export const Disabled: Story = {
  args: { defaultValue: [50], max: 100, step: 1, disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("slider", { name: "Volume" })).toBeDisabled()
  },
}

const levels = ["Off", "Low", "Medium", "High", "Max"]

/** Named steps: `getAriaValueText` gives each its name. */
export const NamedSteps: Story = {
  args: {
    defaultValue: [2],
    max: levels.length - 1,
    step: 1,
    getAriaValueText: (_formatted: string, value: number) =>
      levels[value] ?? "",
  },
  render: (args) => <Labelled label="Thinking" {...args} />,
  play: async ({ canvas }) => {
    const thumb = canvas.getByRole("slider", { name: "Thinking" })
    await expect(thumb).toHaveAttribute("aria-valuetext", "Medium")
    await userEvent.tab()
    await userEvent.keyboard("{ArrowRight}")
    await expect(thumb).toHaveAttribute("aria-valuetext", "High")
  },
}
