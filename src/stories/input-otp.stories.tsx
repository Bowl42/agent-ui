import type { Meta, StoryObj } from "@storybook/react-vite"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { expect, fn, userEvent } from "storybook/test"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

// InputOTP's props are a union (children or render), so stories render it
// themselves rather than through args.
const meta = {
  title: "Components/Input OTP",
} satisfies Meta

export default meta
type Story = StoryObj

const onComplete = fn()

export const Default: Story = {
  render: () => (
    <Field className="w-fit">
      <FieldLabel htmlFor="otp">Verification code</FieldLabel>
      <InputOTP
        id="otp"
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        onComplete={onComplete}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription>Enter the 6-digit code we sent you.</FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Verification code" })
    await userEvent.click(input)
    // Letters are rejected by the digits-only pattern.
    await userEvent.keyboard("12ab3456")
    await expect(input).toHaveValue("123456")
    await expect(onComplete).toHaveBeenCalledWith("123456")
  },
}

export const Disabled: Story = {
  render: () => (
    <Field className="w-fit" data-disabled>
      <FieldLabel htmlFor="otp-disabled">Verification code</FieldLabel>
      <InputOTP id="otp-disabled" maxLength={6} disabled value="123">
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Verification code" })
    ).toBeDisabled()
  },
}

export const Invalid: Story = {
  render: () => (
    <Field className="w-fit" data-invalid>
      <FieldLabel htmlFor="otp-invalid">Verification code</FieldLabel>
      <InputOTP id="otp-invalid" maxLength={6} defaultValue="000000">
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, index) => (
            <InputOTPSlot key={index} index={index} aria-invalid />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription>That code has expired.</FieldDescription>
    </Field>
  ),
}
