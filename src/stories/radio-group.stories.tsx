import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent } from "storybook/test"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const meta = {
  title: "Components/Radio Group",
  component: RadioGroup,
  args: { onValueChange: fn() },
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <RadioGroup defaultValue="comfortable" aria-label="Density" {...args}>
      {[
        ["default", "Default"],
        ["comfortable", "Comfortable"],
        ["compact", "Compact"],
      ].map(([value, label]) => (
        <Field key={value} orientation="horizontal">
          <RadioGroupItem value={value} id={`radio-density-${value}`} />
          <FieldLabel
            htmlFor={`radio-density-${value}`}
            className="font-normal"
          >
            {label}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  ),
  play: async ({ args, canvas }) => {
    const comfortable = canvas.getByRole("radio", { name: "Comfortable" })
    await expect(comfortable).toBeChecked()
    await userEvent.tab()
    await expect(comfortable).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    const compact = canvas.getByRole("radio", { name: "Compact" })
    await expect(compact).toHaveFocus()
    await expect(compact).toBeChecked()
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      "compact",
      expect.anything()
    )
    await userEvent.keyboard("{ArrowUp}{ArrowUp}")
    await expect(canvas.getByRole("radio", { name: "Default" })).toBeChecked()
  },
}

/** Each option is a card; the whole card is the label. */
export const WithDescriptions: Story = {
  render: (args) => (
    <RadioGroup
      defaultValue="sonnet"
      aria-label="Model"
      className="w-80"
      {...args}
    >
      {[
        ["haiku", "Haiku", "Fast and light, for quick edits"],
        ["sonnet", "Sonnet", "Balanced, for everyday work"],
        ["opus", "Opus", "Most capable, for long runs"],
      ].map(([value, title, description]) => (
        <FieldLabel key={value} htmlFor={`radio-model-${value}`}>
          <Field orientation="horizontal">
            <FieldContent>
              <div className="font-medium">{title}</div>
              <FieldDescription>{description}</FieldDescription>
            </FieldContent>
            <RadioGroupItem value={value} id={`radio-model-${value}`} />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Most capable, for long runs"))
    await expect(canvas.getByRole("radio", { name: /Opus/ })).toBeChecked()
  },
}

export const WithFieldSet: Story = {
  render: (args) => (
    <FieldSet className="w-72">
      <FieldLegend>Reasoning effort</FieldLegend>
      <FieldDescription>
        How long the model may think before answering.
      </FieldDescription>
      <RadioGroup defaultValue="medium" aria-label="Reasoning effort" {...args}>
        {[
          ["high", "High"],
          ["medium", "Medium"],
          ["low", "Low"],
        ].map(([value, label]) => (
          <Field key={value} orientation="horizontal">
            <RadioGroupItem value={value} id={`radio-effort-${value}`} />
            <FieldLabel
              htmlFor={`radio-effort-${value}`}
              className="font-normal"
            >
              {label}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  ),
}

export const Grid: Story = {
  render: (args) => (
    <RadioGroup
      defaultValue="medium"
      aria-label="Context window"
      className="grid w-80 grid-cols-2 gap-2"
      {...args}
    >
      {[
        ["small", "32K"],
        ["medium", "128K"],
        ["large", "200K"],
        ["xlarge", "1M"],
      ].map(([value, label]) => (
        <FieldLabel key={value} htmlFor={`radio-context-${value}`}>
          <Field orientation="horizontal">
            <RadioGroupItem value={value} id={`radio-context-${value}`} />
            <div className="font-medium">{label}</div>
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  ),
}

/**
 * Radio cards (shadcn's Field "choice card"): each choice a `FieldLabel`
 * card round a horizontal `Field`, its title and description, the radio
 * at its end. The whole card picks it; the arrow keys move between them.
 */
export const ChoiceCards: Story = {
  render: (args) => (
    <FieldSet className="w-80">
      <FieldLegend variant="label">Plan</FieldLegend>
      <RadioGroup defaultValue="team" {...args}>
        {[
          ["solo", "Solo", "One seat, for one person's work."],
          ["team", "Team", "Shared projects, for up to ten people."],
          ["company", "Company", "Single sign-on and audit logs."],
        ].map(([value, title, description]) => (
          <FieldLabel key={value} htmlFor={`radio-plan-${value}`}>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>{title}</FieldTitle>
                <FieldDescription>{description}</FieldDescription>
              </FieldContent>
              <RadioGroupItem value={value!} id={`radio-plan-${value}`} />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  ),
  play: async ({ args, canvas }) => {
    const team = canvas.getByRole("radio", { name: /^Team/ })
    await expect(team).toHaveAttribute("aria-checked", "true")
    // Anywhere on the card picks it.
    await userEvent.click(canvas.getByText("Single sign-on and audit logs."))
    await expect(
      canvas.getByRole("radio", { name: /^Company/ })
    ).toHaveAttribute("aria-checked", "true")
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      "company",
      expect.anything()
    )
    await userEvent.keyboard("{ArrowUp}")
    await expect(team).toHaveAttribute("aria-checked", "true")
  },
}

export const Disabled: Story = {
  render: (args) => (
    <RadioGroup defaultValue="option2" aria-label="Options" disabled {...args}>
      {["1", "2", "3"].map((n) => (
        <Field key={n} orientation="horizontal">
          <RadioGroupItem value={`option${n}`} id={`radio-disabled-${n}`} />
          <FieldLabel htmlFor={`radio-disabled-${n}`} className="font-normal">
            Option {n}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Option 1" }))
    await expect(canvas.getByRole("radio", { name: "Option 2" })).toBeChecked()
    await expect(args.onValueChange).not.toHaveBeenCalled()
  },
}

export const Invalid: Story = {
  render: (args) => (
    <FieldSet className="w-72">
      <FieldLegend>Notify me</FieldLegend>
      <FieldDescription>
        Choose how you hear about finished runs.
      </FieldDescription>
      <RadioGroup defaultValue="email" aria-label="Notify me" {...args}>
        {[
          ["email", "Email only"],
          ["push", "Push only"],
          ["both", "Email and push"],
        ].map(([value, label]) => (
          <Field key={value} orientation="horizontal" data-invalid>
            <RadioGroupItem
              value={value}
              id={`radio-invalid-${value}`}
              aria-invalid
            />
            <FieldLabel
              htmlFor={`radio-invalid-${value}`}
              className="font-normal"
            >
              {label}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  ),
}
