import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent } from "storybook/test"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: { onCheckedChange: fn() },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Field orientation="horizontal">
      <Checkbox id="checkbox-terms" {...args} />
      <FieldLabel htmlFor="checkbox-terms">
        Accept terms and conditions
      </FieldLabel>
    </Field>
  ),
  play: async ({ args, canvas }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: "Accept terms and conditions",
    })
    await userEvent.tab()
    await expect(checkbox).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(checkbox).toBeChecked()
    await expect(args.onCheckedChange).toHaveBeenCalledOnce()
    await userEvent.keyboard(" ")
    await expect(checkbox).not.toBeChecked()
  },
}

export const WithDescription: Story = {
  render: (args) => (
    <Field orientation="horizontal" className="w-80">
      <Checkbox id="checkbox-approve" defaultChecked {...args} />
      <FieldContent>
        <FieldLabel htmlFor="checkbox-approve">
          Ask before running tools
        </FieldLabel>
        <FieldDescription>
          The agent pauses for your approval before each tool call.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
}

export const Invalid: Story = {
  render: (args) => (
    <Field orientation="horizontal" data-invalid>
      <Checkbox id="checkbox-invalid" aria-invalid {...args} />
      <FieldLabel htmlFor="checkbox-invalid">
        Accept terms and conditions
      </FieldLabel>
    </Field>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <Field orientation="horizontal">
      <Checkbox id="checkbox-disabled" disabled {...args} />
      <FieldLabel htmlFor="checkbox-disabled">Enable notifications</FieldLabel>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: "Enable notifications" })
    ).toHaveAttribute("aria-disabled", "true")
  },
}

/** The whole card is the label, so clicking anywhere on it toggles. */
export const WithTitle: Story = {
  render: (args) => (
    <FieldGroup className="w-80">
      <FieldLabel htmlFor="checkbox-card">
        <Field orientation="horizontal">
          <Checkbox id="checkbox-card" defaultChecked {...args} />
          <FieldContent>
            <FieldTitle>Enable notifications</FieldTitle>
            <FieldDescription>
              You can enable or disable notifications at any time.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor="checkbox-card-disabled">
        <Field orientation="horizontal" data-disabled>
          <Checkbox id="checkbox-card-disabled" disabled {...args} />
          <FieldContent>
            <FieldTitle>Share usage data</FieldTitle>
            <FieldDescription>Managed by your organisation.</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </FieldGroup>
  ),
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: /Enable notifications/,
    })
    await expect(checkbox).toBeChecked()
    await userEvent.click(canvas.getByText(/You can enable or disable/))
    await expect(checkbox).not.toBeChecked()
  },
}

const runs = [
  { id: "1", name: "Index repository", model: "claude-opus", status: "Done" },
  {
    id: "2",
    name: "Write changelog",
    model: "claude-sonnet",
    status: "Running",
  },
  { id: "3", name: "Triage issues", model: "claude-haiku", status: "Queued" },
]

function RunsTable() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["1"]))
  const all = selected.size === runs.length
  const some = selected.size > 0 && !all

  return (
    <Table className="w-[28rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <Checkbox
              aria-label="Select all runs"
              checked={all}
              indeterminate={some}
              onCheckedChange={(checked) =>
                setSelected(
                  checked ? new Set(runs.map((r) => r.id)) : new Set()
                )
              }
            />
          </TableHead>
          <TableHead>Run</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow
            key={run.id}
            data-state={selected.has(run.id) ? "selected" : undefined}
          >
            <TableCell>
              <Checkbox
                aria-label={`Select ${run.name}`}
                checked={selected.has(run.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected)
                  if (checked) next.add(run.id)
                  else next.delete(run.id)
                  setSelected(next)
                }}
              />
            </TableCell>
            <TableCell className="font-medium">{run.name}</TableCell>
            <TableCell>{run.model}</TableCell>
            <TableCell>{run.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export const InTable: Story = {
  render: () => <RunsTable />,
  play: async ({ canvas }) => {
    const selectAll = canvas.getByRole("checkbox", { name: "Select all runs" })
    await expect(selectAll).toBePartiallyChecked()
    await userEvent.click(selectAll)
    for (const checkbox of canvas.getAllByRole("checkbox")) {
      await expect(checkbox).toBeChecked()
    }
    await userEvent.click(selectAll)
    for (const checkbox of canvas.getAllByRole("checkbox")) {
      await expect(checkbox).not.toBeChecked()
    }
  },
}

export const Group: Story = {
  render: (args) => (
    <Field className="w-72">
      <FieldLabel>Tools this agent may use:</FieldLabel>
      {[
        ["shell", "Shell"],
        ["browser", "Web browser"],
        ["files", "File system"],
        ["mcp", "MCP servers"],
      ].map(([id, label]) => (
        <Field key={id} orientation="horizontal">
          <Checkbox id={`checkbox-tool-${id}`} {...args} />
          <FieldLabel htmlFor={`checkbox-tool-${id}`} className="font-normal">
            {label}
          </FieldLabel>
        </Field>
      ))}
    </Field>
  ),
}
