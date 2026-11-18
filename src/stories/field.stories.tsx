import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent } from "storybook/test"
import { onRows } from "@/stories/grid-lines"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "Components/Field",
  component: Field,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

const themes = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

export const InputFields: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="field-name">Agent name</FieldLabel>
        <Input id="field-name" placeholder="Researcher" />
      </Field>
      <Field>
        <FieldLabel htmlFor="field-handle">Handle</FieldLabel>
        <Input id="field-handle" placeholder="researcher" />
        <FieldDescription>Used to mention the agent in chats.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="field-key">
          API key <span className="text-destructive">*</span>
        </FieldLabel>
        <Input id="field-key" type="password" required />
      </Field>
      <Field>
        <FieldLabel htmlFor="field-badge">
          Base URL
          <Badge variant="secondary" className="ms-auto">
            Recommended
          </Badge>
        </FieldLabel>
        <Input id="field-badge" placeholder="https://api.example.com" />
      </Field>
      <Field data-disabled>
        <FieldLabel htmlFor="field-disabled">Workspace</FieldLabel>
        <Input id="field-disabled" placeholder="Cannot edit" disabled />
        <FieldDescription>Set by your organisation.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
}

/** `FieldError` is an alert, so it is announced when it appears. */
export const WithError: Story = {
  render: () => (
    <Field data-invalid>
      <FieldLabel htmlFor="field-invalid">Max tokens</FieldLabel>
      <Input
        id="field-invalid"
        type="number"
        defaultValue={-1}
        aria-invalid
        aria-describedby="field-invalid-error"
      />
      <FieldError
        id="field-invalid-error"
        errors={[
          { message: "Must be a positive number." },
          { message: "Must be at most 64000." },
        ]}
      />
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("spinbutton", { name: "Max tokens" })
    await expect(input).toBeInvalid()
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Must be a positive number."
    )
    await expect(input).toHaveAccessibleDescription(/Must be at most 64000/)
  },
}

export const TextareaField: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="field-prompt">System prompt</FieldLabel>
      <Textarea id="field-prompt" placeholder="You are a helpful agent." />
      <FieldDescription>Sent before every message.</FieldDescription>
    </Field>
  ),
}

export const SelectFields: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="field-model">Model</FieldLabel>
        <Select
          items={[
            { label: "Select a model", value: null },
            { label: "Claude Opus", value: "opus" },
            { label: "Claude Sonnet", value: "sonnet" },
          ]}
        >
          <SelectTrigger id="field-model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="opus">Claude Opus</SelectItem>
              <SelectItem value="sonnet">Claude Sonnet</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="field-region">Region</FieldLabel>
        <NativeSelect id="field-region">
          <NativeSelectOption value="">Select a region</NativeSelectOption>
          <NativeSelectOption value="us">United States</NativeSelectOption>
          <NativeSelectOption value="eu">Europe</NativeSelectOption>
        </NativeSelect>
      </Field>
    </FieldGroup>
  ),
  // Hovered, the placeholder still reads (the checks run after this).
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole("combobox", { name: "Model" }))
  },
}

export const CheckboxFields: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend variant="label">Tools</FieldLegend>
      <FieldDescription>Choose what the agent may use.</FieldDescription>
      <FieldGroup className="gap-3">
        {[
          ["shell", "Shell", true],
          ["browser", "Web browser", false],
          ["files", "File system", false],
        ].map(([id, label, checked]) => (
          <Field key={String(id)} orientation="horizontal">
            <Checkbox id={`field-tool-${id}`} defaultChecked={!!checked} />
            <FieldLabel htmlFor={`field-tool-${id}`} className="font-normal">
              {label}
            </FieldLabel>
          </Field>
        ))}
      </FieldGroup>
    </FieldSet>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Web browser"))
    await expect(
      canvas.getByRole("checkbox", { name: "Web browser" })
    ).toBeChecked()
  },
}

export const RadioFields: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend variant="label">Run mode</FieldLegend>
      <RadioGroup defaultValue="ask" aria-label="Run mode">
        <FieldLabel htmlFor="field-mode-ask">
          <Field orientation="horizontal">
            <RadioGroupItem value="ask" id="field-mode-ask" />
            <FieldContent>
              <FieldTitle>Ask first</FieldTitle>
              <FieldDescription>Approve every tool call.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor="field-mode-auto">
          <Field orientation="horizontal">
            <RadioGroupItem value="auto" id="field-mode-auto" />
            <FieldContent>
              <FieldTitle>Autonomous</FieldTitle>
              <FieldDescription>Run until done or stopped.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </RadioGroup>
    </FieldSet>
  ),
}

export const SwitchFields: Story = {
  render: () => (
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="field-stream">Stream responses</FieldLabel>
          <FieldDescription>Show tokens as they arrive.</FieldDescription>
        </FieldContent>
        <Switch id="field-stream" defaultChecked />
      </Field>
      <Field orientation="horizontal" data-disabled>
        <FieldContent>
          <FieldLabel htmlFor="field-telemetry">Telemetry</FieldLabel>
          <FieldDescription>Managed by your organisation.</FieldDescription>
        </FieldContent>
        <Switch id="field-telemetry" disabled />
      </Field>
    </FieldGroup>
  ),
}

/** Slider thumbs are named by `aria-labelledby`, not by `htmlFor`. */
export const SliderField: Story = {
  render: () => (
    <Field>
      <FieldLabel id="field-temperature">Temperature</FieldLabel>
      <Slider
        aria-labelledby="field-temperature"
        defaultValue={[0.7]}
        min={0}
        max={1}
        step={0.1}
      />
      <FieldDescription>
        Higher values give more varied answers.
      </FieldDescription>
    </Field>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <FieldGroup className="**:data-[slot=field-content]:min-w-40">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="field-h-name">Display name</FieldLabel>
          <FieldDescription>Shown in chats.</FieldDescription>
        </FieldContent>
        <Input id="field-h-name" placeholder="Researcher" />
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="field-h-notify">Notifications</FieldLabel>
          <FieldDescription>When a run finishes.</FieldDescription>
        </FieldContent>
        <Switch id="field-h-notify" />
      </Field>
    </FieldGroup>
  ),
}

export const Form: Story = {
  render: () => (
    <form onSubmit={(event) => event.preventDefault()}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>New agent</FieldLegend>
          <FieldDescription>
            Agents run in their own workspace.
          </FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="field-form-name">Name</FieldLabel>
              <Input id="field-form-name" placeholder="Researcher" />
            </Field>
            <Field>
              <FieldLabel htmlFor="field-form-prompt">Instructions</FieldLabel>
              <Textarea id="field-form-prompt" />
            </Field>
          </FieldGroup>
        </FieldSet>
        <FieldSeparator>Or</FieldSeparator>
        <Field>
          <Button type="button" variant="outline">
            Import from file
          </Button>
        </Field>
        <Field orientation="horizontal">
          <Button type="submit">Create</Button>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Field>
      </FieldGroup>
    </form>
  ),
}

/**
 * A settings page on the 12-column grid: from a group 448px wide, a
 * label spans 4 columns and its control 8, 24px apart from 768px; a
 * description or an error under the control. A short control (a switch,
 * a select) keeps its size at the row's end, where a wide one ends.
 * Narrower, each field is a column.
 */
export const Responsive: Story = {
  decorators: [
    (Story) => (
      <div className="w-3xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <FieldGroup>
      <Field orientation="responsive">
        <FieldLabel htmlFor="field-r-name">Display name</FieldLabel>
        <Input id="field-r-name" placeholder="Researcher" />
      </Field>
      <Field orientation="responsive" data-invalid>
        <FieldLabel htmlFor="field-r-email">Email</FieldLabel>
        <Input id="field-r-email" aria-invalid defaultValue="sam@" />
        <FieldError>Enter a whole address.</FieldError>
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="field-r-theme">Theme</FieldLabel>
        <Select defaultValue="system" items={themes}>
          <SelectTrigger id="field-r-theme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {themes.map((theme) => (
              <SelectItem key={theme.value} value={theme.value}>
                {theme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field orientation="responsive">
        <FieldContent>
          <FieldLabel htmlFor="field-r-notify">Notifications</FieldLabel>
          <FieldDescription>When a run finishes.</FieldDescription>
        </FieldContent>
        <Switch id="field-r-notify" />
      </Field>
    </FieldGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    // A settings page's rows: labels on one line, controls on another.
    await onRows(
      "fields",
      [...canvasElement.querySelectorAll("[data-slot=field]")],
      {
        label: (row) => row.querySelector("[data-slot=field-label]"),
        // Wide or short, every control ends on the row's end.
        "end:control": (row) =>
          row.querySelector(
            "input, textarea, [data-slot=select-trigger], [data-slot=switch]"
          ),
      }
    )
    const group = canvasElement.querySelector("[data-slot=field-group]")!
    const { left, width } = group.getBoundingClientRect()
    // 768px: 12 columns of (768 - 11 × 24) / 12 = 42px.
    await expect(width).toBe(768)
    const column = 42
    const gutter = 24
    const name = canvas.getByLabelText("Display name").getBoundingClientRect()
    const label = canvas.getByText("Display name").getBoundingClientRect()
    await expect(label.left - left).toBe(0)
    await expect(name.left - left).toBe(4 * (column + gutter))
    await expect(name.width).toBe(8 * column + 7 * gutter)
    const error = canvas.getByText("Enter a whole address.")
    await expect(error.getBoundingClientRect().left - left).toBe(
      4 * (column + gutter)
    )
    const notify = canvas.getByRole("switch", { name: "Notifications" })
    await expect(notify.getBoundingClientRect().right).toBeCloseTo(
      left + width,
      1
    )
    await expect(notify.getBoundingClientRect().width).toBeLessThan(48)
    const theme = canvas
      .getByRole("combobox", { name: "Theme" })
      .getBoundingClientRect()
    await expect(theme.right).toBeCloseTo(left + width, 1)
    await expect(theme.width).toBeLessThan(8 * column + 7 * gutter)
  },
}

/** Narrower than 448px, a responsive field is a column, full width. */
export const ResponsiveNarrow: Story = {
  render: () => (
    <FieldGroup>
      <Field orientation="responsive">
        <FieldLabel htmlFor="field-rn-name">Display name</FieldLabel>
        <Input id="field-rn-name" placeholder="Researcher" />
      </Field>
    </FieldGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    const group = canvasElement
      .querySelector("[data-slot=field-group]")!
      .getBoundingClientRect()
    const label = canvas.getByText("Display name").getBoundingClientRect()
    const name = canvas.getByLabelText("Display name").getBoundingClientRect()
    await expect(name.top).toBeGreaterThan(label.bottom)
    await expect(name.width).toBe(group.width)
  },
}

/**
 * A separator's words on the surface it is on: a card's (as shadcn's
 * login-03 has it), not the page's, without the app's classes.
 */
export const SeparatorInACard: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent>
        <FieldGroup>
          <FieldSeparator>Or continue with</FieldSeparator>
        </FieldGroup>
      </CardContent>
    </Card>
  ),
  play: async ({ canvas, canvasElement }) => {
    const words = canvas.getByText("Or continue with")
    const card = canvasElement.querySelector("[data-slot=card]")!
    await expect(getComputedStyle(words).backgroundColor).toBe(
      getComputedStyle(card).backgroundColor
    )
  },
}
