import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight02Icon,
  AudioWave01Icon,
  Copy01Icon,
  Delete01Icon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  MinusSignIcon,
  PlusSignIcon,
  RotateClockwiseIcon,
  Search01Icon,
  Share03Icon,
} from "@hugeicons/core-free-icons"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const meta = {
  title: "Components/Button Group",
  component: ButtonGroup,
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <ButtonGroup aria-label="Chat actions">
      <Button variant="outline">Retry</Button>
      <Button variant="outline">Edit prompt</Button>
    </ButtonGroup>
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole("group", { name: "Chat actions" })
    await expect(within(group).getAllByRole("button")).toHaveLength(2)
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Retry" })).toHaveFocus()
    await userEvent.tab()
    await expect(
      canvas.getByRole("button", { name: "Edit prompt" })
    ).toHaveFocus()
  },
}

export const WithInput: Story = {
  render: () => (
    <ButtonGroup>
      <Input aria-label="Search chats" placeholder="Search chats..." />
      <Button variant="outline" aria-label="Search">
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </Button>
    </ButtonGroup>
  ),
}

export const WithText: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ButtonGroup>
        <ButtonGroupText>Model</ButtonGroupText>
        <Button variant="outline">claude-opus</Button>
      </ButtonGroup>
      <ButtonGroup>
        <ButtonGroupText render={<Label htmlFor="max-tokens" />}>
          Max tokens
        </ButtonGroupText>
        <Input id="max-tokens" placeholder="4096" />
      </ButtonGroup>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Max tokens" })
    ).toBeVisible()
  },
}

export const WithDropdown: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Follow</Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon" />}
          aria-label="More follow options"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
              Copy conversation
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HugeiconsIcon icon={Share03Icon} strokeWidth={2} />
              Share conversation
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive">
              <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
              Delete conversation
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "More follow options" })
    await userEvent.tab()
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    const menu = await screen.findByRole("menu")
    const items = within(menu).getAllByRole("menuitem")
    await waitFor(() => expect(items[0]).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    await expect(
      within(menu).getByRole("menuitem", { name: "Delete conversation" })
    ).toHaveFocus()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    )
  },
}

const currencies = [
  { label: "$", value: "usd" },
  { label: "€", value: "eur" },
  { label: "£", value: "gbp" },
]

export const WithSelect: Story = {
  render: () => (
    <Field className="w-80">
      <Label htmlFor="budget">Run budget</Label>
      <ButtonGroup>
        <Select items={currencies} defaultValue="usd">
          <SelectTrigger aria-label="Currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {currencies.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input id="budget" placeholder="Amount" />
        <Button variant="outline" aria-label="Apply budget">
          <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} />
        </Button>
      </ButtonGroup>
    </Field>
  ),
  play: async ({ canvas }) => {
    const currency = canvas.getByRole("combobox", { name: "Currency" })
    await expect(currency).toHaveTextContent("$")
    currency.focus()
    await userEvent.keyboard("{ArrowDown}")
    const listbox = await screen.findByRole("listbox")
    await waitFor(() =>
      expect(within(listbox).getByRole("option", { name: "$" })).toHaveFocus()
    )
    await userEvent.keyboard("{ArrowDown}")
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(currency).toHaveTextContent("€"))
    // Let the popup finish closing before the accessibility check.
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  },
}

export const WithIcons: Story = {
  render: () => (
    <ButtonGroup aria-label="Transform">
      <Button variant="outline" size="icon" aria-label="Flip horizontally">
        <HugeiconsIcon icon={FlipHorizontalIcon} strokeWidth={2} />
      </Button>
      <Button variant="outline" size="icon" aria-label="Flip vertically">
        <HugeiconsIcon icon={FlipVerticalIcon} strokeWidth={2} />
      </Button>
      <Button variant="outline" size="icon" aria-label="Rotate">
        <HugeiconsIcon icon={RotateClockwiseIcon} strokeWidth={2} />
      </Button>
    </ButtonGroup>
  ),
}

export const WithFields: Story = {
  render: () => (
    <Field className="w-72">
      <Label htmlFor="width">Width</Label>
      <ButtonGroup>
        <InputGroup>
          <InputGroupInput id="width" defaultValue="320" />
          <InputGroupAddon align="inline-end" className="text-muted-foreground">
            px
          </InputGroupAddon>
        </InputGroup>
        <Button variant="outline" size="icon" aria-label="Decrease width">
          <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />
        </Button>
        <Button variant="outline" size="icon" aria-label="Increase width">
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        </Button>
      </ButtonGroup>
    </Field>
  ),
}

export const Nested: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label="Attach file">
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <InputGroup>
          <InputGroupInput
            aria-label="Message"
            placeholder="Send a message..."
          />
          <Tooltip>
            <TooltipTrigger
              render={<InputGroupAddon align="inline-end" />}
              aria-label="Voice mode"
            >
              <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>Voice mode</TooltipContent>
          </Tooltip>
        </InputGroup>
      </ButtonGroup>
    </ButtonGroup>
  ),
}

export const Pagination: Story = {
  render: () => (
    <ButtonGroup aria-label="Pagination">
      <Button variant="outline" size="sm">
        <HugeiconsIcon
          icon={ArrowLeft01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Previous
      </Button>
      {[1, 2, 3].map((page) => (
        <Button key={page} variant="outline" size="sm">
          {page}
        </Button>
      ))}
      <Button variant="outline" size="sm">
        Next
        <HugeiconsIcon
          icon={ArrowRight02Icon}
          strokeWidth={2}
          data-icon="inline-end"
        />
      </Button>
    </ButtonGroup>
  ),
}

export const WithSeparator: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="secondary">Copy</Button>
      <ButtonGroupSeparator />
      <Button variant="secondary">Paste</Button>
    </ButtonGroup>
  ),
}

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical" aria-label="Zoom" className="h-fit">
      <Button variant="outline" size="icon" aria-label="Zoom in">
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
      </Button>
      <Button variant="outline" size="icon" aria-label="Zoom out">
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />
      </Button>
    </ButtonGroup>
  ),
}
