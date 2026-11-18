import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { expect, screen, userEvent, waitFor } from "storybook/test"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const meta = {
  title: "Components/Table",
  component: Table,
  decorators: [
    (Story) => (
      <div className="w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const runs = [
  { id: "RUN001", status: "Succeeded", model: "Opus", tokens: "12,480" },
  { id: "RUN002", status: "Running", model: "Sonnet", tokens: "3,210" },
  { id: "RUN003", status: "Failed", model: "Haiku", tokens: "940" },
]

function RunRows() {
  return (
    <TableBody>
      {runs.map((run) => (
        <TableRow key={run.id}>
          <TableCell className="font-medium">{run.id}</TableCell>
          <TableCell>{run.status}</TableCell>
          <TableCell>{run.model}</TableCell>
          <TableCell className="text-end">{run.tokens}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

function RunHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-25">Run</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Model</TableHead>
        <TableHead className="text-end">Tokens</TableHead>
      </TableRow>
    </TableHeader>
  )
}

export const Basic: Story = {
  render: () => (
    <Table>
      <TableCaption>Your recent runs.</TableCaption>
      <RunHeader />
      <RunRows />
    </Table>
  ),
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table", { name: "Your recent runs." })
    await expect(table).toBeVisible()
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(4)
    await expect(canvas.getAllByRole("row")).toHaveLength(4)
  },
}

export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableCaption>Your recent runs.</TableCaption>
      <RunHeader />
      <RunRows />
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-end">16,630</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

export const WithBadges: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-end">Priority</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Summarise thread</TableCell>
          <TableCell>
            <Badge className="bg-success/10 text-success dark:bg-success/20">
              Completed
            </Badge>
          </TableCell>
          <TableCell className="text-end">
            <Badge className="bg-info/10 text-info dark:bg-info/20">High</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Index repository</TableCell>
          <TableCell>
            <Badge className="bg-warning/10 text-warning dark:bg-warning/20">
              In progress
            </Badge>
          </TableCell>
          <TableCell className="text-end">
            <Badge variant="secondary">Medium</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Write tests</TableCell>
          <TableCell>
            <Badge variant="outline">Pending</Badge>
          </TableCell>
          <TableCell className="text-end">
            <Badge variant="secondary">Low</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}

const agents = [
  { name: "Researcher", model: "Opus" },
  { name: "Planner", model: "Sonnet" },
  { name: "Reviewer", model: "Haiku" },
]

export const WithActions: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Model</TableHead>
          <TableHead className="text-end">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.name}>
            <TableCell className="font-medium">{agent.name}</TableCell>
            <TableCell>{agent.model}</TableCell>
            <TableCell className="text-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${agent.name}`}
                    />
                  }
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", {
      name: "Actions for Researcher",
    })
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    const menu = await screen.findByRole("menu")
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus()
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
    await expect(trigger).toHaveFocus()
  },
}

const people = [
  { label: "Ada", value: "ada" },
  { label: "Grace", value: "grace" },
  { label: "Alan", value: "alan" },
]

const tasks = [
  { task: "Summarise thread", assignee: "ada", status: "Done" },
  { task: "Index repository", assignee: "grace", status: "Running" },
]

export const WithSelect: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((item) => (
          <TableRow key={item.task}>
            <TableCell className="font-medium">{item.task}</TableCell>
            <TableCell>
              <Select items={people} defaultValue={item.assignee}>
                <SelectTrigger
                  className="w-32"
                  size="sm"
                  aria-label={`Assignee for ${item.task}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {people.map((person) => (
                      <SelectItem key={person.value} value={person.value}>
                        {person.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", {
      name: "Assignee for Summarise thread",
    })
    await expect(trigger).toHaveTextContent("Ada")
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    await screen.findByRole("listbox")
    // The popup moves focus to the selected option once it has opened.
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Ada" })).toHaveFocus()
    )
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Grace" })).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await expect(trigger).toHaveTextContent("Grace")
  },
}

export const WithInput: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tool</TableHead>
          <TableHead>Max calls</TableHead>
          <TableHead>Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[
          { tool: "Web search", calls: "5", cost: "$0.01" },
          { tool: "Code runner", calls: "2", cost: "$0.05" },
        ].map((row) => (
          <TableRow key={row.tool}>
            <TableCell className="font-medium">{row.tool}</TableCell>
            <TableCell>
              <Input
                type="number"
                defaultValue={row.calls}
                aria-label={`Max calls for ${row.tool}`}
                className="h-8 w-20"
                min="0"
              />
            </TableCell>
            <TableCell>{row.cost}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("spinbutton", {
      name: "Max calls for Web search",
    })
    await userEvent.tab()
    await expect(input).toHaveFocus()
    await userEvent.clear(input)
    await userEvent.keyboard("8")
    await expect(input).toHaveValue(8)
  },
}
