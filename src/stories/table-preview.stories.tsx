import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  expect,
  fn,
  mocked,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"

import { SearchHighlight } from "@/components/search-highlight"
import {
  TablePreview,
  tableToCsv,
  tableToMarkdown,
  tableToTsv,
} from "@/components/table-preview"

const columns = ["Region", "Deploys", "Note"]
const rows = [
  ["eu-west", "42", 'Slow, then "fixed"'],
  ["us-east", "17", "Two lines:\nfirst, then second"],
  [
    "ap-south",
    "8",
    "A long note that goes on and on about the deploy, its images, its cache and the time each took, so it wraps.",
  ],
]

const meta = {
  title: "Components/Table Preview",
  component: TablePreview,
  parameters: { layout: "padded" },
  args: { columns, rows, title: "Deploys by region", onDownload: fn() },
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue(undefined)
    return () => writeText.mockRestore()
  },
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TablePreview>

export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/**
 * In a code block's frame, its header the same: its title and size.
 * Copied as text a spreadsheet takes (tabs, quoted cells); downloaded as
 * CSV or Markdown, to the app's `onDownload` or a file.
 */
export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvas.getByText("3 rows · 3 columns")).toBeVisible()
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(3)
    // Framed, its title as a code block's, in line with the cells' text.
    const frame = canvasElement.querySelector("[data-slot=code-block]")!
    await expect(getComputedStyle(frame).borderTopWidth).toBe("1px")
    const heading = canvas.getByText("Deploys by region")
    await expect(heading).toHaveAttribute("data-slot", "code-block-title")
    await expect(
      Math.abs(
        heading.getBoundingClientRect().left -
          canvas.getByText("eu-west").getBoundingClientRect().left
      )
    ).toBeLessThanOrEqual(1)
    // A long note wraps.
    const note = canvas.getByText(/^A long note/).getBoundingClientRect()
    const short = canvas.getByText("eu-west").getBoundingClientRect()
    await expect(note.height).toBeGreaterThan(short.height * 1.5)
    await expect(note.width).toBeLessThanOrEqual(320)

    await userEvent.click(canvas.getByRole("button", { name: "Copy as text" }))
    await expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith(
      tableToTsv(columns, rows)
    )
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Copied" })).toBeVisible()
    )

    await userEvent.click(canvas.getByRole("button", { name: "Download" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "CSV" }))
    await expect(args.onDownload).toHaveBeenCalledWith(
      { name: "table.csv", text: tableToCsv(columns, rows), type: "text/csv" },
      "csv"
    )
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull())
    await userEvent.click(canvas.getByRole("button", { name: "Download" }))
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Markdown" })
    )
    await expect(args.onDownload).toHaveBeenLastCalledWith(
      {
        name: "table.md",
        text: tableToMarkdown(columns, rows),
        type: "text/markdown",
      },
      "markdown"
    )
  },
}

/** Without `onDownload`, a file is downloaded, named as the app says. */
export const DownloadsAFile: Story = {
  args: { onDownload: undefined, fileName: "deploys" },
  play: async ({ canvas }) => {
    const click = spyOn(
      HTMLAnchorElement.prototype,
      "click"
    ).mockImplementation(() => {})
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Download" }))
      await userEvent.click(await body.findByRole("menuitem", { name: "CSV" }))
      await expect(click).toHaveBeenCalledTimes(1)
      const link = click.mock.contexts[0] as HTMLAnchorElement
      await expect(link.download).toBe("deploys.csv")
      await expect(link.href).toMatch(/^blob:/)
    } finally {
      click.mockRestore()
    }
  },
}

/** The text formats: quoting, CRLF, escaped pipes and lines. */
export const Formats: Story = {
  play: async () => {
    await expect(tableToCsv(["a", "b"], [['x,"y"', "1\n2"]])).toBe(
      'a,b\r\n"x,""y""","1\n2"'
    )
    await expect(tableToTsv(["a", "b"], [["x\ty", "plain"]])).toBe(
      'a\tb\n"x\ty"\tplain'
    )
    await expect(tableToMarkdown(["a|b", "c"], [["1\n2"], []])).toBe(
      "| a\\|b | c |\n| --- | --- |\n| 1<br>2 |  |\n|  |  |"
    )
  },
}

/**
 * Narrow, it scrolls sideways, the page does not, faded at the edge it
 * scrolls past; short values stay one line, not broken at a hyphen.
 */
export const Narrow: Story = {
  args: {
    columns: ["Region", "Deploys", "Images", "Cache", "Time", "Owner", "Note"],
    rows: [
      ["eu-west", "42", "1280", "hit", "3m", "platform", "fine"],
      ["us-east", "17", "980", "miss", "9m", "web", "slow"],
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const scroller = canvas.getByRole("region", { name: "Deploys by region" })
    await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    await expect(getComputedStyle(scroller).maskImage).toMatch(/gradient\(/)
    await expect(
      canvas.getAllByText("eu-west")[0]!.getBoundingClientRect().height
    ).toBe(canvas.getAllByText("42")[0]!.getBoundingClientRect().height)
    await expect(
      canvasElement.querySelector("[data-slot=table-preview]")!.clientWidth
    ).toBeLessThanOrEqual(288)
  },
}

/**
 * Full screen: its title and size, the same buttons, its heading row kept
 * at the top as it scrolls; closed, the focus is back on its button.
 */
export const FullScreen: Story = {
  args: {
    rows: Array.from({ length: 80 }, (_, index) => [
      `region-${index}`,
      String(index),
      "fine",
    ]),
  },
  play: async ({ canvas }) => {
    const open = canvas.getByRole("button", { name: "Full screen" })
    await userEvent.click(open)
    const popup = await body.findByRole("dialog", {
      name: "Deploys by region",
    })
    // Once it has grown in.
    await Promise.all(
      popup.getAnimations({ subtree: true }).map((each) => each.finished)
    )
    const dialog = within(popup)
    await expect(dialog.getByText("80 rows · 3 columns")).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Copy as text" })
    ).toBeVisible()
    const head = dialog.getAllByRole("columnheader")[0]!
    const top = head.getBoundingClientRect().top
    // The focus on the table, to scroll it by keys.
    const scroller = dialog.getByRole("region", { name: "80 rows · 3 columns" })
    // Its heading row on the dialog's surface; its buttons at the table's
    // edge, not inset for the close button above them.
    await expect(getComputedStyle(head.closest("thead")!).backgroundColor).toBe(
      getComputedStyle(popup).backgroundColor
    )
    await expect(
      scroller.getBoundingClientRect().right -
        dialog.getByRole("button", { name: "Download" }).getBoundingClientRect()
          .right
    ).toBeLessThanOrEqual(8)
    await waitFor(() => expect(scroller).toHaveFocus())
    scroller.scrollTop = 600
    await waitFor(() =>
      expect(
        Math.abs(head.getBoundingClientRect().top - top)
      ).toBeLessThanOrEqual(1)
    )
    await expect(
      dialog.getByRole("cell", { name: "region-0" }).getBoundingClientRect()
        .bottom
    ).toBeLessThan(top)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(open).toHaveFocus())
  },
}

/** With no rows, it says so; copying still has the headings. */
export const Empty: Story = {
  args: { rows: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("0 rows · 3 columns")).toBeVisible()
    await expect(canvas.getByRole("cell", { name: "No data" })).toBeVisible()
  },
}

/** When the clipboard refuses, it says it could not copy. */
export const CopyFails: Story = {
  beforeEach: () => {
    mocked(navigator.clipboard.writeText).mockRejectedValue(
      new DOMException("Denied", "NotAllowedError")
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy as text" }))
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Could not copy" })
      ).toBeVisible()
    )
  },
}

/**
 * A cell is the app's to render: e.g. a search's matches marked. Its
 * words are the app's.
 */
export const SearchAndLabels: Story = {
  args: {
    renderCell: (value) => (
      <SearchHighlight terms={["fixed"]}>{value}</SearchHighlight>
    ),
    labels: {
      size: (rows, columns) => `${rows} Zeilen · ${columns} Spalten`,
      copy: "Als tabulatorgetrennten Text kopieren",
      download: "Herunterladen",
      fullScreen: "Vollbild",
      close: "Schließen",
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("fixed", { selector: "mark" })).toBeVisible()
    await expect(canvas.getByText("3 Zeilen · 3 Spalten")).toBeVisible()
    await expect(
      canvas.getByRole("button", {
        name: "Als tabulatorgetrennten Text kopieren",
      })
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Herunterladen" })
    ).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Vollbild" })).toBeVisible()
    // Full screen's close button in the app's words.
    await userEvent.click(canvas.getByRole("button", { name: "Vollbild" }))
    const dialog = await body.findByRole("dialog")
    await expect(
      within(dialog).getByRole("button", { name: "Schließen" })
    ).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull())
  },
}
