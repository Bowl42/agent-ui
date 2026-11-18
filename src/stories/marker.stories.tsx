import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Clock01Icon,
  File01Icon,
  GitBranchIcon,
  Search01Icon,
  Tick02Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { Spinner } from "@/components/ui/spinner"

// Records clicks on the controls the stories exercise.
const onAction = fn()

const meta = {
  title: "Components/Marker",
  component: Marker,
  beforeEach: () => {
    onAction.mockClear()
  },
  args: { children: <MarkerContent>A default marker</MarkerContent> },
  decorators: [
    (Story) => (
      <div className="flex w-md max-w-full flex-col gap-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Marker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Markers: Story = {
  render: () => (
    <>
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Marker with icon</MarkerContent>
      </Marker>
      <Marker role="status">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent>Running the eval suite</MarkerContent>
      </Marker>
      <Marker role="status">
        <MarkerContent className="shimmer">Thinking...</MarkerContent>
      </Marker>
      <Marker render={<a href="#branch" />}>
        <MarkerIcon>
          <HugeiconsIcon icon={GitBranchIcon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Marker as a link</MarkerContent>
      </Marker>
      <Marker
        render={
          <button
            type="button"
            onClick={onAction}
            className="transition-colors hover:text-foreground"
          />
        }
      >
        <MarkerIcon>
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent className="flex-1">Worked for 42s</MarkerContent>
        <MarkerIcon>
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
        </MarkerIcon>
      </Marker>
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Rhea joined the chat</MarkerContent>
      </Marker>
      <Marker className="justify-center">
        <MarkerContent>
          <strong className="font-medium">Olivia Rose</strong> left the chat
        </MarkerContent>
      </Marker>
      <Marker className="flex-col">
        <MarkerIcon>
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Marker with icon at the top</MarkerContent>
      </Marker>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Marker as a link" })
    ).toBeVisible()
    await userEvent.tab()
    await userEvent.tab()
    const button = canvas.getByRole("button", { name: "Worked for 42s" })
    await expect(button).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(onAction).toHaveBeenCalledOnce()
  },
}

export const Border: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Marker variant="border">
        <MarkerIcon>
          <HugeiconsIcon icon={GitBranchIcon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Switched to release-candidate</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerIcon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Reviewed 8 related files</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerIcon>
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Opened implementation notes</MarkerContent>
      </Marker>
    </div>
  ),
}

export const Separator: Story = {
  render: () => (
    <>
      <Marker variant="separator">
        <MarkerContent>Worked for 42s</MarkerContent>
      </Marker>
      <Marker variant="separator" role="status">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent>Compacting conversation</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerIcon>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
        </MarkerIcon>
        <MarkerContent>Conversation compacted</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>
          With a <a href="#compaction">link to learn more</a>
        </MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>
          <Button variant="outline">
            <HugeiconsIcon
              icon={GitBranchIcon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Open branch
          </Button>
        </MarkerContent>
      </Marker>
    </>
  ),
}

export const InAccordion: Story = {
  render: () => (
    <Accordion>
      <AccordionItem value="worked">
        <AccordionTrigger>
          <Marker>
            <MarkerIcon>
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
            </MarkerIcon>
            <MarkerContent>Worked for 42s</MarkerContent>
          </Marker>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-muted-foreground">
            Listed the workspace, read three files and ran the tests.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Worked for 42s" })
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(await canvas.findByText(/Listed the workspace/)).toBeVisible()
  },
}

const files = ["app/chat/page.tsx", "components/message.tsx", "lib/ai.ts"]

export const InDrawer: Story = {
  render: () => (
    <Drawer swipeDirection="right">
      <Marker variant="separator">
        <DrawerTrigger render={<Button variant="outline" />}>
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Explored 3 files
        </DrawerTrigger>
      </Marker>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>File activity</DrawerTitle>
          <DrawerDescription>
            Files read while preparing the response.
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 px-4 text-sm">
          {files.map((file) => (
            <div
              key={file}
              className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
            >
              <span className="truncate">{file}</span>
              <span className="text-muted-foreground">read</span>
            </div>
          ))}
        </div>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
  play: async ({ canvas }) => {
    const body = within(document.body)
    const trigger = canvas.getByRole("button", { name: "Explored 3 files" })
    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    const dialog = await body.findByRole("dialog", { name: "File activity" })
    await expect(within(dialog).getByText("lib/ai.ts")).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}
