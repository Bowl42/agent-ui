import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, spyOn } from "storybook/test"

import { CodeReadout } from "@/components/code-readout"
import { CopyButton } from "@/components/copy-button"

const meta = {
  title: "Components/Code Readout",
  component: CodeReadout,
  args: { value: "WDJB7K2Q", label: "Your code" },
  beforeEach: () => {
    const writeText = spyOn(navigator.clipboard, "writeText")
    writeText.mockResolvedValue(undefined)
    return () => writeText.mockRestore()
  },
} satisfies Meta<typeof CodeReadout>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A one-time code, read out to be typed elsewhere: 32px, monospaced, in
 * groups of four; selected and copied whole; said character by
 * character. A CopyButton with its word beside it.
 */
export const Default: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-3">
      <CodeReadout {...args} />
      <CopyButton value={args.value} showLabel variant="outline" />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const code = canvas.getByRole("img", {
      name: "Your code: W D J B 7 K 2 Q",
    })
    await expect(getComputedStyle(code).fontSize).toBe("32px")
    await expect(getComputedStyle(code).lineHeight).toBe("40px")
    await expect(code.children).toHaveLength(2)
    // Selected whole, it is the code as typed: no space between groups.
    const range = document.createRange()
    range.selectNodeContents(code)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
    await expect(getSelection()!.toString()).toBe("WDJB7K2Q")
    getSelection()!.removeAllRanges()
    // Its groups 12px apart.
    const [first, second] = Array.from(code.children)
    await expect(
      second!.getBoundingClientRect().left -
        first!.getBoundingClientRect().right
    ).toBe(12)
    await expect(
      canvasElement.querySelector("[data-slot=copy-button]")
    ).toHaveTextContent("Copy")
  },
}

/** `group={3}`: as a code of six reads, "482 913". */
export const Groups: Story = {
  args: { value: "482913", group: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img").children).toHaveLength(2)
  },
}
