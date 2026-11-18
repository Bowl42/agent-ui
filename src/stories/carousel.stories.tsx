import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor } from "storybook/test"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const meta = {
  title: "Components/Carousel",
  component: Carousel,
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

const slides = Array.from({ length: 5 }, (_, index) => index + 1)

export const Default: Story = {
  render: () => (
    <Carousel className="w-full max-w-48 sm:max-w-xs">
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide}>
            <Card>
              <CardContent className="flex aspect-square items-center justify-center p-6">
                <span className="text-4xl font-semibold">{slide}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
  play: async ({ canvas }) => {
    const region = canvas.getByRole("region")
    await expect(region).toHaveAttribute("aria-roledescription", "carousel")
    const previous = canvas.getByRole("button", { name: "Previous slide" })
    const next = canvas.getByRole("button", { name: "Next slide" })
    await waitFor(() => expect(previous).toBeDisabled())

    await userEvent.click(next)
    await waitFor(() => expect(previous).toBeEnabled())

    // Arrow keys move between slides while the carousel has focus.
    await userEvent.click(canvas.getByText("2"))
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() => expect(previous).toBeDisabled())
  },
}

export const Sizes: Story = {
  render: () => (
    <Carousel opts={{ align: "start" }} className="w-full max-w-sm">
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide} className="basis-1/2 lg:basis-1/3">
            <Card>
              <CardContent className="flex aspect-square items-center justify-center p-6">
                <span className="text-3xl font-semibold">{slide}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}

export const Vertical: Story = {
  render: () => (
    <Carousel
      opts={{ align: "start" }}
      orientation="vertical"
      className="my-12 w-full max-w-xs"
    >
      <CarouselContent className="-mt-1 h-50">
        {slides.map((slide) => (
          <CarouselItem key={slide} className="basis-1/2 pt-1">
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <span className="text-3xl font-semibold">{slide}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}
