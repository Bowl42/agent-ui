import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Cancel01Icon,
  File01Icon,
  LaptopIcon,
  ShieldEnergyIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, within, waitFor } from "storybook/test"

import {
  Composer,
  ComposerEditor,
  ComposerAttach,
  ComposerShelf,
  ComposerShelfBar,
  ComposerShelfTab,
  ComposerSubmit,
  ComposerToolbar,
  type ComposerValue,
} from "@/components/composer"
import { onOneLine, textStart } from "@/stories/grid-lines"
import { Button } from "@/components/ui/button"

const meta = {
  title: "Components/Composer Shelf",
  component: ComposerShelf,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ComposerShelf>
export default meta
type Story = StoryObj<typeof meta>

function Editor() {
  const [value, setValue] = React.useState<ComposerValue>([])
  return (
    <Composer value={value} onValueChange={setValue} onSubmit={() => {}}>
      <ComposerEditor aria-label="Message" placeholder="Ask anything" />
    </Composer>
  )
}

function ShoulderDemo() {
  const [count, setCount] = React.useState(3)
  return (
    <div className="flex flex-col items-start gap-6">
      <Button onClick={() => setCount(count + 1)}>Stash a draft</Button>
      <div className="flex w-2xl max-w-full flex-col">
        <ComposerShelfTab
          icon={<HugeiconsIcon icon={File01Icon} aria-hidden />}
          count={count}
        >
          Stash
        </ComposerShelfTab>
        <Editor />
      </div>
    </div>
  )
}

export const ShoulderTab: Story = {
  render: () => <ShoulderDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tab = canvas.getByRole("button", { name: /Stash 3/ })
    expect(tab.querySelector("[data-pulse]")).toBeNull()
    const shelf = tab.closest("[data-composer-shelf]")!
    const composer = canvasElement.querySelector('[data-slot="input-group"]')!
    await waitFor(() => {
      const bounds = shelf.getBoundingClientRect()
      const box = composer.getBoundingClientRect()
      expect(bounds.width).toBeLessThan(box.width)
      expect(bounds.right).toBeLessThanOrEqual(box.right)
    })
    await userEvent.click(canvas.getByRole("button", { name: "Stash a draft" }))
    await waitFor(() => {
      expect(canvas.getByRole("button", { name: "Stash 4" })).toBeVisible()
      expect(tab.querySelector("[data-pulse]")).toHaveTextContent("4")
    })
  },
}

export const StackedShelves: Story = {
  render: () => (
    <div className="flex w-2xl max-w-full flex-col">
      <ComposerShelf>
        <ComposerShelfBar
          icon={<HugeiconsIcon icon={LaptopIcon} aria-hidden />}
        >
          Working in a sandbox
        </ComposerShelfBar>
      </ComposerShelf>
      <ComposerShelf>
        <ComposerShelfBar
          icon={<HugeiconsIcon icon={Alert02Icon} aria-hidden />}
        >
          Usage limit nearly reached
        </ComposerShelfBar>
      </ComposerShelf>
      <Editor />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const shelves = canvasElement.querySelectorAll("[data-composer-shelf]")
    const first = shelves[0]!
    const second = shelves[1]!
    await waitFor(() => {
      const upper = getComputedStyle(first)
      const lower = getComputedStyle(second)
      expect(parseFloat(upper.borderTopLeftRadius)).toBeGreaterThan(0)
      expect(parseFloat(upper.borderTopRightRadius)).toBeGreaterThan(0)
      expect(upper.marginBottom).toBe("0px")
      expect(upper.borderBottomWidth).toBe("0px")
      expect(lower.borderTopLeftRadius).toBe("0px")
      expect(lower.borderTopRightRadius).toBe("0px")
      expect(
        Math.abs(
          first.getBoundingClientRect().bottom -
            second.getBoundingClientRect().top
        )
      ).toBeLessThan(1)
      const composer = canvasElement
        .querySelector('[data-slot="input-group"]')!
        .getBoundingClientRect()
      for (const shelf of shelves) {
        const box = shelf.getBoundingClientRect()
        expect(box.width).toBeLessThan(composer.width)
        expect(box.left).toBeGreaterThan(composer.left)
        expect(box.right).toBeLessThan(composer.right)
      }
    })
  },
}

const askFirst = fn()

/**
 * A setting a new conversation kept that the reader may not expect: what
 * it is, in grey what it means, a way back, and a way to close it.
 */
export const KeptSetting: Story = {
  render: function Render() {
    const [shown, setShown] = React.useState(true)
    return (
      <div className="flex w-2xl max-w-full flex-col">
        {shown && (
          <ComposerShelf>
            <ComposerShelfBar
              icon={<HugeiconsIcon icon={ShieldEnergyIcon} aria-hidden />}
              detail="It won't ask first."
              actions={
                <>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      askFirst()
                      setShown(false)
                    }}
                  >
                    Ask first again
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Dismiss"
                    onClick={() => setShown(false)}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} />
                  </Button>
                </>
              }
            >
              Full access kept from your last chat.
            </ComposerShelfBar>
          </ComposerShelf>
        )}
        <Editor />
      </div>
    )
  },
  play: async ({ canvas }) => {
    askFirst.mockClear()
    // Once it has faded in.
    await waitFor(() =>
      expect(
        canvas.getByText("Full access kept from your last chat.")
      ).toBeVisible()
    )
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss" }))
    await waitFor(() =>
      expect(
        canvas.queryByText("Full access kept from your last chat.")
      ).toBeNull()
    )
  },
}

function LeadingDemo() {
  const [value, setValue] = React.useState<ComposerValue>([])
  return (
    <div className="flex w-2xl max-w-full flex-col">
      <ComposerShelf>
        <ComposerShelfBar
          icon={<HugeiconsIcon icon={LaptopIcon} aria-hidden />}
        >
          Working in a sandbox
        </ComposerShelfBar>
      </ComposerShelf>
      <Composer
        value={value}
        onValueChange={setValue}
        onSubmit={() => {}}
        onAddFiles={() => {}}
      >
        <ComposerEditor aria-label="Message" placeholder="Ask anything" />
        <ComposerToolbar>
          <ComposerAttach />
          <ComposerSubmit className="ms-auto" />
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

/**
 * The composer's leading line (--composer-lead, 16px in): a shelf's
 * icon, the text and the toolbar's first glyph ("+") start on it.
 */
export const LeadingLine: Story = {
  render: () => <LeadingDemo />,
  play: async ({ canvasElement }) => {
    const editor =
      canvasElement.querySelector<HTMLElement>("[contenteditable]")!
    const box = canvasElement
      .querySelector("[data-slot=composer]")!
      .getBoundingClientRect()
    await onOneLine(
      "composer leading line",
      {
        shelf: canvasElement.querySelector(
          "[data-slot=composer-shelf-bar] svg"
        ),
        text: textStart(editor),
        add: canvasElement.querySelector("[data-slot=composer-attach] svg"),
        lead: box.left + 16,
      },
      { least: 4 }
    )
  },
}

export const LeadingLinePhone: Story = {
  render: () => <LeadingDemo />,
  parameters: {
    layout: "padded",
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: LeadingLine.play,
}
