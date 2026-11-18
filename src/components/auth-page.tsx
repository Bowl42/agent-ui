import * as React from "react"
import { cn } from "cn"

/**
 * A sign-in or sign-up page, the app's form in it. Wide (48rem and up, by
 * its own width, `data-wide`; `group-data-wide/auth:` for the app's): two halves, the app's `aside` on the muted grey at the
 * start (its brand at the top, its title and words at the foot) and the
 * form on the page's colour at the end, its title (h1) and description
 * over it, `switchTo` at the top's end on the brand's line, `terms` at
 * the foot. Narrow: the form on a card on the grey, the brand and
 * `switchTo` above it, `terms` under it; the aside only with
 * `asideOnNarrow`. In a desktop window whose own buttons are over the
 * page (`titlebar`), its top is a bar as high as the window's title bar
 * that drags the window, the page under it.
 */
function AuthPage({
  title,
  description,
  brand,
  switchTo,
  aside,
  asideOnNarrow = false,
  terms,
  titlebar = false,
  className,
  style,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  /** The form's heading: "Sign in". */
  title: React.ReactNode
  /** Under it: what to do, e.g. "Use your work email." */
  description?: React.ReactNode
  /** The app's mark and name, at the top's start. */
  brand?: React.ReactNode
  /** At the top's end: e.g. "No account? Sign up", a link. */
  switchTo?: React.ReactNode
  /** The other half: what the app is, its title and words, and more. */
  aside?: AuthPageAside | undefined
  /** On a narrow page too, above the form; else only where it is wide. */
  asideOnNarrow?: boolean
  /** At the foot: e.g. "By continuing you agree to the Terms". */
  terms?: React.ReactNode
  /**
   * In a desktop window with its own buttons over the page: a bar across
   * its top as high as the window's title bar (`env(titlebar-area-height)`,
   * else the app's `--agent-app-titlebar-height` on the root, else 40px),
   * dragging the window as an `AgentApp`'s titlebar does
   * (`agentAppTitlebarControls`), the page 8px under it.
   */
  titlebar?: boolean
}) {
  // Wide by its own width (48rem), measured, not a container query: a
  // size container around the form's own (its field groups') once left
  // Chrome drawing the form 0px tall after an error came above it.
  const own = React.useRef<HTMLDivElement>(null)
  const [wide, setWide] = React.useState(false)
  React.useLayoutEffect(() => {
    const element = own.current
    if (!element) return
    const measure = () => {
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      setWide(element.clientWidth >= 48 * rem)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      data-slot="auth-page"
      data-titlebar={titlebar || undefined}
      data-wide={wide || undefined}
      className={cn(
        "group/auth min-h-svh",
        // grid: clear (the window's title bar, 8px under it)
        titlebar &&
          "*:*:pt-[calc(var(--agent-app-titlebar)+--spacing(2))] data-wide:*:*:pt-[calc(var(--agent-app-titlebar)+--spacing(2))]",
        className
      )}
      style={
        titlebar
          ? ({
              "--agent-app-titlebar":
                "env(titlebar-area-height, var(--agent-app-titlebar-height, 2.5rem))",
              ...style,
            } as React.CSSProperties)
          : style
      }
      {...props}
    >
      {titlebar && (
        // Drags the window, as an AgentApp's titlebar: the theme's
        // app-region, or the host's own on a pointerdown in it.
        <div
          data-slot="agent-app-titlebar"
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-10 h-(--agent-app-titlebar)"
        />
      )}
      {/* As wide as the page: measured for it. */}
      <div
        ref={own}
        className="flex min-h-svh flex-col bg-muted group-data-wide/auth:grid group-data-wide/auth:grid-cols-2"
      >
        {aside && (
          <aside
            data-slot="auth-page-aside"
            className={cn(
              "flex-col gap-2 p-6 group-data-wide/auth:flex group-data-wide/auth:p-8",
              asideOnNarrow ? "flex pb-0" : "hidden"
            )}
          >
            <div className="hidden h-8 items-center group-data-wide/auth:flex">
              {brand}
            </div>
            <div className="flex flex-col gap-1 group-data-wide/auth:mt-auto">
              {aside.title && (
                <h2 className="text-lg font-medium">{aside.title}</h2>
              )}
              {aside.description && (
                <p className="text-sm text-muted-foreground">
                  {aside.description}
                </p>
              )}
            </div>
            {aside.children}
          </aside>
        )}
        <main
          data-slot="auth-page-main"
          className="flex min-h-svh flex-col gap-6 p-6 group-data-wide/auth:col-start-2 group-data-wide/auth:bg-background group-data-wide/auth:p-8"
        >
          <div
            data-slot="auth-page-top"
            className="flex h-8 items-center gap-4 text-sm"
          >
            <div
              className={cn(
                "min-w-0 flex-1",
                aside && "group-data-wide/auth:invisible"
              )}
            >
              {brand}
            </div>
            {switchTo && (
              <div
                data-slot="auth-page-switch"
                className="shrink-0 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:hover:underline"
              >
                {switchTo}
              </div>
            )}
          </div>
          {/* A card where it is narrow; on the page where it is wide. */}
          <div
            data-slot="auth-page-form"
            className="mx-auto my-auto flex w-full max-w-sm flex-col gap-6 rounded-xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10 group-data-wide/auth:rounded-none group-data-wide/auth:bg-transparent group-data-wide/auth:p-0 group-data-wide/auth:ring-0"
          >
            <div className="flex flex-col gap-1">
              <h1 className="text-base font-medium group-data-wide/auth:text-display">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {children}
          </div>
          {terms && (
            <p
              data-slot="auth-page-terms"
              className="text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground"
            >
              {terms}
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

/** An `AuthPage`'s other half. */
type AuthPageAside = {
  /** What the app is: a line, h2. */
  title?: React.ReactNode
  description?: React.ReactNode
  /** More of it: e.g. an image, a quote. */
  children?: React.ReactNode
}

export { AuthPage, type AuthPageAside }
