import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { expect, userEvent } from "storybook/test"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const meta = {
  title: "Components/Accordion",
  component: Accordion,
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

const faq = [
  {
    value: "accessible",
    trigger: "Is it accessible?",
    content: "Yes. It adheres to the WAI-ARIA design pattern.",
  },
  {
    value: "styled",
    trigger: "Is it styled?",
    content: "Yes. It matches the other components' aesthetic.",
  },
  {
    value: "animated",
    trigger: "Is it animated?",
    content: "Yes. It's animated by default.",
  },
]

export const Basic: Story = {
  render: () => (
    <Accordion className="w-96">
      {faq.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.trigger}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
  play: async ({ canvas }) => {
    const first = canvas.getByRole("button", { name: "Is it accessible?" })
    const second = canvas.getByRole("button", { name: "Is it styled?" })
    await expect(first).toHaveAttribute("aria-expanded", "false")

    await userEvent.tab()
    await expect(first).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(first).toHaveAttribute("aria-expanded", "true")
    await expect(await canvas.findByText(faq[0].content)).toBeVisible()

    // Tab moves to the next header; opening it closes the first one.
    await userEvent.tab()
    await expect(second).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(second).toHaveAttribute("aria-expanded", "true")
    await expect(first).toHaveAttribute("aria-expanded", "false")
  },
}

export const Multiple: Story = {
  render: () => (
    <Accordion multiple className="w-96">
      <AccordionItem value="context">
        <AccordionTrigger>How is the context window managed?</AccordionTrigger>
        <AccordionContent>
          Older turns are summarised once the conversation nears the model's
          limit, so recent messages and tool results stay verbatim.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="tools">
        <AccordionTrigger>Which tools can an agent call?</AccordionTrigger>
        <AccordionContent>
          Any tool registered on the workspace: shell, file edits, web search
          and the MCP servers you have connected.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvas }) => {
    const context = canvas.getByRole("button", {
      name: "How is the context window managed?",
    })
    const tools = canvas.getByRole("button", {
      name: "Which tools can an agent call?",
    })
    await userEvent.click(context)
    await userEvent.click(tools)
    await expect(context).toHaveAttribute("aria-expanded", "true")
    await expect(tools).toHaveAttribute("aria-expanded", "true")
  },
}

export const WithBorders: Story = {
  render: () => (
    <Accordion className="w-96 gap-2">
      {faq.map((item) => (
        <AccordionItem
          key={item.value}
          value={item.value}
          className="rounded-lg border"
        >
          <AccordionTrigger className="px-2.5">{item.trigger}</AccordionTrigger>
          <AccordionContent className="px-2.5 text-muted-foreground">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
}

export const InCard: Story = {
  render: () => (
    <Card className="w-96 gap-4">
      <CardHeader>
        <CardTitle>Plans & usage</CardTitle>
        <CardDescription>
          Common questions about runs and billing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion multiple defaultValue={["plans"]}>
          <AccordionItem value="plans">
            <AccordionTrigger>What plans do you offer?</AccordionTrigger>
            <AccordionContent>
              <p>
                Starter, Pro and Team. Each raises the monthly run quota and the
                number of concurrent agents.
              </p>
              <p>
                <a href="#billing">Annual billing is available</a> at a
                discount.
              </p>
              <Button size="sm">
                View plans
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  strokeWidth={2}
                  data-icon="inline-end"
                />
              </Button>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="billing">
            <AccordionTrigger>How are runs billed?</AccordionTrigger>
            <AccordionContent>
              By tokens used, summed per run and invoiced monthly.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "What plans do you offer?" })
    ).toHaveAttribute("aria-expanded", "true")
    await expect(
      canvas.getByRole("button", { name: "View plans" })
    ).toBeVisible()
  },
}

export const WithDisabled: Story = {
  render: () => (
    <Accordion className="w-96 overflow-hidden rounded-lg border">
      <AccordionItem value="history" className="p-1 data-open:bg-muted/50">
        <AccordionTrigger className="px-2.5">
          Can I see my run history?
        </AccordionTrigger>
        <AccordionContent className="px-2.5">
          Yes, every run is listed with its transcript and cost.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem
        value="premium"
        disabled
        className="p-1 data-open:bg-muted/50"
      >
        <AccordionTrigger className="px-2.5">
          Premium model access
        </AccordionTrigger>
        <AccordionContent className="px-2.5">
          Upgrade your plan to use premium models.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="email" className="p-1 data-open:bg-muted/50">
        <AccordionTrigger className="px-2.5">
          How do I change my email?
        </AccordionTrigger>
        <AccordionContent className="px-2.5">
          In account settings; we send a link to confirm the new address.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvas }) => {
    const disabled = canvas.getByRole("button", {
      name: "Premium model access",
    })
    await expect(disabled).toBeDisabled()
    await expect(disabled).toHaveAttribute("aria-expanded", "false")
  },
}
