import * as React from "react"
import { createPortal } from "react-dom"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { AuthPage } from "@/components/auth-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { windowOf } from "@/stories/phone"

const meta = {
  title: "Blocks/Auth Page",
  component: AuthPage,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Sign in",
    description: "Use your work email.",
    brand: <span className="font-semibold">Acme</span>,
    switchTo: (
      <>
        No account? <a href="#sign-up">Sign up</a>
      </>
    ),
    aside: {
      title: "Agents that finish the job",
      description: "Plan, run and review work with your team's agents.",
    },
    terms: (
      <>
        By continuing you agree to the <a href="#terms">Terms</a>.
      </>
    ),
    children: (
      <form className="flex flex-col gap-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" placeholder="you@example.com" />
          </Field>
        </FieldGroup>
        <Button type="submit">Continue</Button>
      </form>
    ),
  },
} satisfies Meta<typeof AuthPage>

export default meta
type Story = StoryObj<typeof meta>

const colour = (value: string) => {
  const probe = document.createElement("span")
  probe.style.color = value
  document.body.append(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  return computed
}

/**
 * Wide: two halves, the aside on the grey at the start, the form on the
 * page's colour at the end; the switch on the brand's line; the terms at
 * the foot.
 */
export const Wide: Story = {
  ...windowOf("desktop", 1280, 800),
  play: async ({ canvas, canvasElement }) => {
    const aside = canvasElement.querySelector<HTMLElement>(
      "[data-slot=auth-page-aside]"
    )!
    const main = canvasElement.querySelector<HTMLElement>(
      "[data-slot=auth-page-main]"
    )!
    const a = aside.getBoundingClientRect()
    const m = main.getBoundingClientRect()
    await expect([a.left, Math.round(a.width)]).toEqual([0, 640])
    await expect([Math.round(m.left), Math.round(m.width)]).toEqual([640, 640])
    await expect(getComputedStyle(aside.parentElement!).backgroundColor).toBe(
      colour("var(--muted)")
    )
    await expect(getComputedStyle(main).backgroundColor).toBe(
      colour("var(--background)")
    )
    const title = canvas.getByRole("heading", { level: 1, name: "Sign in" })
    await expect(getComputedStyle(title).fontSize).toBe("22px")
    await expect(
      within(aside).getByRole("heading", {
        level: 2,
        name: "Agents that finish the job",
      })
    ).toBeVisible()
    // The switch on the brand's line, at the top's end.
    const brand = within(aside).getByText("Acme").getBoundingClientRect()
    const link = canvas.getByRole("link", { name: "Sign up" })
    const at = link.getBoundingClientRect()
    await expect(
      Math.abs(at.top + at.height / 2 - (brand.top + brand.height / 2))
    ).toBeLessThan(1)
    await expect(Math.round(m.right - at.right)).toBe(32)
    // The form 384px at most, in the half's middle; the terms at its foot.
    const form = canvasElement
      .querySelector("[data-slot=auth-page-form]")!
      .getBoundingClientRect()
    await expect(form.width).toBe(384)
    const terms = canvasElement
      .querySelector("[data-slot=auth-page-terms]")!
      .getBoundingClientRect()
    await expect(Math.round(m.bottom - terms.bottom)).toBe(32)
  },
}

/** Narrow: the form on a card on the grey, no aside. */
export const Narrow: Story = {
  ...windowOf("phone", 390, 844),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      getComputedStyle(
        canvasElement.querySelector("[data-slot=auth-page-aside]")!
      ).display
    ).toBe("none")
    const form = canvasElement.querySelector<HTMLElement>(
      "[data-slot=auth-page-form]"
    )!
    await expect(getComputedStyle(form).backgroundColor).toBe(
      colour("var(--card)")
    )
    const top = within(
      canvasElement.querySelector<HTMLElement>("[data-slot=auth-page-top]")!
    )
    await expect(top.getByText("Acme")).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Sign up" })).toBeVisible()
    await expect(
      getComputedStyle(canvas.getByRole("heading", { level: 1 })).fontSize
    ).toBe("16px")
  },
}

/**
 * In a desktop window whose own buttons are over the page (the app's bar
 * height on the root, as a WKWebView's): a bar as high as the window's
 * title bar drags it, the brand, the switch and the aside's top 8px
 * under it, nothing under the window's buttons.
 */
export const Titlebar: Story = {
  args: { titlebar: true },
  decorators: [
    (Story) => {
      document.documentElement.style.setProperty(
        "--agent-app-titlebar-height",
        "52px"
      )
      return <Story />
    },
  ],
  beforeEach: () => () => {
    document.documentElement.style.removeProperty("--agent-app-titlebar-height")
  },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>(
      "[data-slot=agent-app-titlebar]"
    )!
    const box = bar.getBoundingClientRect()
    await expect(box.top).toBe(0)
    await expect(box.height).toBe(52)
    await expect(box.width).toBe(window.innerWidth)
    // Its top rows 8px under it.
    for (const slot of ["auth-page-top", "auth-page-aside"]) {
      const element = canvasElement.querySelector<HTMLElement>(
        `[data-slot=${slot}]`
      )!
      if (getComputedStyle(element).display === "none") continue
      const first =
        slot === "auth-page-top" ? element : element.firstElementChild!
      await expect(Math.round(first.getBoundingClientRect().top)).toBe(60)
    }
    // Dragged by it, where the browser can.
    if (CSS.supports("app-region", "drag"))
      await expect(getComputedStyle(bar).getPropertyValue("app-region")).toBe(
        "drag"
      )
  },
}

/** On a phone in such a window: the same. */
export const TitlebarNarrow: Story = {
  ...Titlebar,
  ...windowOf("phone", 390, 844),
}

/**
 * A sign-in form as an app's: in a plain fieldset disabled while it is sent,
 * a field's own error first, then the server's at the form's top.
 */
function SignInForm() {
  const [busy, setBusy] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [invalid, setInvalid] = React.useState(false)
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const email = new FormData(event.currentTarget).get("email")
        if (!String(email).includes("@")) {
          setInvalid(true)
          return
        }
        setInvalid(false)
        setBusy(true)
        // The server's answer, a moment later: 401.
        setTimeout(() => {
          setBusy(false)
          setFailed(true)
        }, 50)
      }}
    >
      {/* A plain fieldset to disable it, laid out by a div inside: a flex
          fieldset can leave its field groups 0px tall in Chrome. */}
      <fieldset disabled={busy} className="min-w-0">
        <div className="flex flex-col gap-6">
          {failed && (
            <Alert variant="destructive">
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
              <AlertTitle>Wrong password</AlertTitle>
              <AlertDescription>Check it and try again.</AlertDescription>
            </Alert>
          )}
          <FieldGroup data-testid="fields" onKeyDown={() => {}}>
            <FieldGroup>
              <Field data-invalid={invalid || undefined}>
                <FieldLabel htmlFor="sent-email">Email</FieldLabel>
                <Input
                  id="sent-email"
                  name="email"
                  type="email"
                  aria-invalid={invalid || undefined}
                />
                {invalid && <FieldError>Enter an email address.</FieldError>}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="sent-password">Password</FieldLabel>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ms-auto"
                  >
                    Forgot it?
                  </Button>
                </div>
                <Input id="sent-password" name="password" type="password" />
              </Field>
            </FieldGroup>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
            <FieldSeparator>or</FieldSeparator>
            <Button type="button" variant="outline">
              Continue with SSO
            </Button>
          </FieldGroup>
          <Item variant="outline" size="sm">
            <ItemContent>
              <ItemTitle>New here?</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button type="button" size="sm" variant="outline">
                Book a demo
              </Button>
            </ItemActions>
          </Item>
        </div>
      </fieldset>
    </form>
  )
}

/**
 * An app's onboarding: a fixed layer of its own that scrolls, in a portal
 * on the body, the app's root under it inert.
 */
function Onboarding({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    const root = document.getElementById("storybook-root")
    root?.setAttribute("inert", "")
    return () => root?.removeAttribute("inert")
  }, [])
  return createPortal(
    <div data-slot="onboarding" className="fixed inset-0 z-50 overflow-y-auto">
      {children}
    </div>,
    document.body
  )
}

/**
 * Sent with a wrong password, after a field's own error: the server's
 * error comes at the form's top, and the fields stay drawn under it.
 * As an app's onboarding shows it: in a fixed layer of its own that
 * scrolls, the page under it inert (Chrome once drew the fields 0px
 * tall there).
 */
/** Sign-up and sign-in on one page, the same form, its words switched. */
function SignUpOrIn() {
  const [mode, setMode] = React.useState<"up" | "in">("up")
  // What it sells, come a moment after the page: the aside grows.
  const [offers, setOffers] = React.useState<string[]>([])
  React.useEffect(() => {
    const timer = setTimeout(() => setOffers(["Team", "Pro", "Max"]), 300)
    return () => clearTimeout(timer)
  }, [])
  return (
    <AuthPage
      titlebar
      title={mode === "up" ? "Create your account" : "Sign in"}
      description="Use your work email."
      brand={<span className="font-medium">Acme</span>}
      switchTo={
        <Button
          variant="link"
          size="sm"
          onClick={() => setMode(mode === "up" ? "in" : "up")}
        >
          {mode === "up" ? "Have an account? Sign in" : "No account? Sign up"}
        </Button>
      }
      aside={{
        title: "Agents that finish the job",
        description: "Plan, run and review work with your team's agents.",
        children: (
          <div className="flex flex-col gap-2">
            <FieldTitle>Plans</FieldTitle>
            <ItemGroup className="min-h-0 overflow-y-auto">
              {offers.map((offer) => (
                <Item key={offer} variant="outline" role="listitem">
                  <ItemContent>
                    <ItemTitle>{offer}</ItemTitle>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </div>
        ),
      }}
      terms={<>By continuing you agree to the Terms.</>}
    >
      <SignInForm />
    </AuthPage>
  )
}

export const ErrorAfterSending: Story = {
  ...windowOf("laptop", 1280, 800),
  render: () => <SignUpOrIn />,
  decorators: [
    (Story) => (
      <Onboarding>
        <Story />
      </Onboarding>
    ),
  ],
  play: async () => {
    const layer = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot=onboarding]"
      )
      expect(found).not.toBeNull()
      return found!
    })
    const page = within(layer)
    await expect(await page.findByText("Max")).toBeVisible()
    // Wide by its measured width, not a size container around the form's
    // own: none between the layer and the field groups.
    const root = layer.querySelector<HTMLElement>("[data-slot=auth-page]")!
    await expect(root).toHaveAttribute("data-wide")
    await expect(getComputedStyle(root).containerType).toBe("normal")
    const fields = page.getByTestId("fields")
    const before = fields.getBoundingClientRect().height
    await expect(before).toBeGreaterThan(100)
    const email = page.getByLabelText("Email")
    await userEvent.type(email, "me")
    await userEvent.click(page.getByRole("button", { name: "Sign in" }))
    await expect(await page.findByText("Enter an email address.")).toBeVisible()
    // To sign in from signing up: the same page, its words switched.
    await userEvent.click(
      page.getByRole("button", { name: "Have an account? Sign in" })
    )
    await expect(
      await page.findByRole("heading", { level: 1, name: "Sign in" })
    ).toBeVisible()
    await userEvent.clear(email)
    await userEvent.type(email, "me@acme.dev")
    await userEvent.type(page.getByLabelText("Password"), "wrong")
    await userEvent.click(page.getByRole("button", { name: "Sign in" }))
    await expect(await page.findByText("Wrong password")).toBeVisible()
    const field = layer.querySelector<HTMLElement>("#sent-password")!
    await waitFor(() => {
      expect(fields.getBoundingClientRect().height).toBeGreaterThan(100)
      expect(field.getBoundingClientRect().height).toBe(32)
    })
    await expect(field).toBeVisible()
  },
}
