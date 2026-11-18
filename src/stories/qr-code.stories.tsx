import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, mocked, spyOn, userEvent, waitFor } from "storybook/test"
import { encode } from "uqr"

import { CopyButton } from "@/components/copy-button"
import { QrCode } from "@/components/qr-code"

const link = `https://example.com/#pair=${"a1".repeat(32)}.${"b2".repeat(32)}.${"c3".repeat(32)}`

const meta = {
  title: "Components/QR Code",
  component: QrCode,
  args: { value: link, size: 240 },
} satisfies Meta<typeof QrCode>

export default meta
type Story = StoryObj<typeof meta>

const luminance = (color: string) => {
  const [r = 0, g = 0, b = 0] = color.match(/[\d.]+/g)!.map(Number)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** An image named generically (never the link), in one path. */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    const code = canvas.getByRole("img", { name: "QR code" })
    await expect(code).not.toHaveAccessibleName(args.value)
    await expect(code).toHaveAttribute("shape-rendering", "crispEdges")
    await expect(code.querySelectorAll("path")).toHaveLength(1)
    await expect(code.querySelectorAll("rect")).toHaveLength(0)
    const box = code.getBoundingClientRect()
    await expect(box.width).toBe(args.size)
    await expect(box.height).toBe(args.size)
  },
}

/**
 * Its grid is the encoder's: the quiet zone is 4 modules a side, and
 * the path's dark modules are the matrix's.
 */
export const Modules: Story = {
  play: async ({ args, canvas }) => {
    const { data } = encode(args.value, {
      ecc: "M",
      border: 0,
      boostEcc: false,
    })
    const code = canvas.getByRole("img")
    const side = data.length + 8
    await expect(code).toHaveAttribute("viewBox", `0 0 ${side} ${side}`)
    // Paint the path on a grid and compare it with the matrix.
    const d = code.querySelector("path")!.getAttribute("d")!
    const painted = data.map((row) => row.map(() => false))
    for (const [, x, y, w] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
      for (let at = 0; at < Number(w); at++)
        painted[Number(y) - 4]![Number(x) - 4 + at] = true
    }
    await expect(painted).toEqual(data)
    const dark = data.flat().filter(Boolean).length
    await expect(dark).toBeGreaterThan(0)
  },
}

/**
 * Dark on a white plate in either theme: scanners need dark modules on a
 * light plate.
 */
export const Plate: Story = {
  play: async ({ canvas }) => {
    const code = canvas.getByRole("img")
    await waitFor(() =>
      expect(luminance(getComputedStyle(code).backgroundColor)).toBeGreaterThan(
        0.9
      )
    )
    await expect(
      luminance(getComputedStyle(code.querySelector("path")!).fill)
    ).toBeLessThan(0.2)
  },
}

/** `level`, `label` and `labels` for the app's language and its needs. */
export const Options: Story = {
  args: { value: "https://example.com", size: 128, level: "H" },
  render: (args) => (
    <div className="flex gap-6">
      <QrCode
        {...args}
        labels={{ qrCode: "QR-Code" }}
        caption="Zum Koppeln scannen"
      />
      <QrCode {...args} level="L" label="Pairing code" />
    </div>
  ),
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("img", { name: "QR-Code" })).toBeVisible()
    await expect(
      canvas.getByRole("img", { name: "Pairing code" })
    ).toBeVisible()
    await expect(canvas.getByText("Zum Koppeln scannen")).toBeVisible()
    const modules = (ecc: "L" | "H") =>
      encode(args.value, { ecc, border: 0, boostEcc: false }).size + 8
    const [high, low] = canvas.getAllByRole("img")
    await expect(high).toHaveAttribute(
      "viewBox",
      `0 0 ${modules("H")} ${modules("H")}`
    )
    await expect(low).toHaveAttribute(
      "viewBox",
      `0 0 ${modules("L")} ${modules("L")}`
    )
  },
}

/** The same link beside it to copy, for the device that shows the code. */
export const WithCopyButton: Story = {
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue(undefined)
    return () => writeText.mockRestore()
  },
  render: (args) => (
    <div className="flex flex-col items-center gap-3">
      <QrCode {...args} caption="Scan to pair" />
      <CopyButton
        value={args.value}
        variant="outline"
        labels={{ copy: "Copy link" }}
      />
    </div>
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }))
    await expect(mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith(
      args.value
    )
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Copied" })).toBeVisible()
    )
  },
}
