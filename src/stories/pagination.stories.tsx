import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor } from "storybook/test"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const meta = {
  title: "Components/Pagination",
  component: Pagination,
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#page-1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#page-3">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#page-3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("navigation", { name: "pagination" })
    ).toBeVisible()
    await expect(canvas.getByRole("link", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    await userEvent.tab()
    await expect(
      canvas.getByRole("link", { name: "Go to previous page" })
    ).toHaveFocus()
  },
}

function StatefulPagination() {
  const [page, setPage] = useState(1)
  const pages = [1, 2, 3, 4, 5]
  const go = (next: number) => (event: React.MouseEvent) => {
    event.preventDefault()
    setPage(Math.min(pages.length, Math.max(1, next)))
  }
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#previous" onClick={go(page - 1)} />
        </PaginationItem>
        {pages.map((n) => (
          <PaginationItem key={n}>
            <PaginationLink
              href={`#page-${n}`}
              isActive={n === page}
              onClick={go(n)}
            >
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#next" onClick={go(page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export const Interactive: Story = {
  render: () => <StatefulPagination />,
  play: async ({ canvas }) => {
    const next = canvas.getByRole("link", { name: "Go to next page" })
    next.focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("link", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("link", { name: "3" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    await expect(canvas.getByRole("link", { name: "1" })).not.toHaveAttribute(
      "aria-current"
    )
  },
}

export const Simple: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        {[1, 2, 3, 4, 5].map((n) => (
          <PaginationItem key={n}>
            <PaginationLink href={`#page-${n}`} isActive={n === 2}>
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  ),
}

export const WithSelect: Story = {
  render: () => (
    <div className="flex w-lg items-center justify-between gap-4">
      <Field orientation="horizontal" className="w-fit">
        <FieldLabel htmlFor="rows-per-page">Rows per page</FieldLabel>
        <Select defaultValue="25">
          <SelectTrigger className="w-20" id="rows-per-page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {["10", "25", "50", "100"].map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#previous" />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Rows per page" })
    await expect(trigger).toHaveTextContent("25")
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    await screen.findByRole("listbox")
    // The selected option takes focus as the list opens; wait for it, or
    // the next arrow press can land before it (WebKit).
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "25" })).toHaveFocus()
    )
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "50" })).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    await expect(trigger).toHaveTextContent("50")
  },
}
