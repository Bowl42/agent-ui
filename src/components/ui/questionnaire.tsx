"use client"

import * as React from "react"
import { Questionnaire as QuestionnairePrimitive } from "@shadcn/react/questionnaire"
import { cn } from "cn"

import { buttonVariants, type Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons"

function Questionnaire({
  advance = true,
  className,
  onClick,
  onKeyDownCapture,
  onKeyUpCapture,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Root> & {
  /**
   * agent-ui: choosing an option of a single-choice question (a click,
   * its number key, Space) goes on to the next question, as Enter does;
   * not on the last, which waits for Submit, and not with the arrow
   * keys, which only move between the options. Previous goes back.
   */
  advance?: boolean
}) {
  const pending = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const arrow = React.useRef(false)
  React.useEffect(() => () => clearTimeout(pending.current), [])
  return (
    <QuestionnairePrimitive.Root
      data-slot="questionnaire"
      className={cn("flex w-full min-w-0 flex-col gap-4", className)}
      onKeyDownCapture={(event) => {
        onKeyDownCapture?.(event)
        // Another key, another choice's or an arrow's, cancels it.
        clearTimeout(pending.current)
        arrow.current = event.key.startsWith("Arrow")
      }}
      onKeyUpCapture={(event) => {
        onKeyUpCapture?.(event)
        arrow.current = false
      }}
      onClick={(event) => {
        onClick?.(event)
        clearTimeout(pending.current)
        const input = event.target
        if (
          !advance ||
          arrow.current ||
          event.defaultPrevented ||
          !(input instanceof HTMLInputElement) ||
          input.type !== "radio" ||
          !input.checked
        )
          return
        const item = input.closest("[data-slot=questionnaire-item]")
        const items = event.currentTarget.querySelectorAll(
          "[data-slot=questionnaire-item]:not(:disabled)"
        )
        if (!item || item === items[items.length - 1]) return
        // A moment to see it chosen, then Enter's way on, which checks it.
        pending.current = setTimeout(() => {
          if (!input.checked || !item.hasAttribute("data-active")) return
          input.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              bubbles: true,
              cancelable: true,
            })
          )
        }, 150)
      }}
      {...props}
    />
  )
}

function QuestionnaireProgress({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Progress>) {
  return (
    <QuestionnairePrimitive.Progress
      data-slot="questionnaire-progress"
      className={cn(
        "min-h-[1lh] w-fit min-w-[14ch] text-xs font-medium text-muted-foreground tabular-nums",
        // agent-ui: one question has no progress to show.
        "data-[total=0]:hidden data-[total=1]:hidden",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireItem({
  className,
  onFocus,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Item>) {
  return (
    <QuestionnairePrimitive.Item
      data-slot="questionnaire-item"
      className={cn(
        "flex min-w-0 flex-col gap-4 border-0 p-0 outline-none",
        className
      )}
      onFocus={(event) => {
        onFocus?.(event)
        // agent-ui: a question that is only a field, come to, is typed in.
        const item = event.currentTarget
        if (
          event.target !== item ||
          item.querySelector("[data-slot=questionnaire-choice]")
        )
          return
        item
          .querySelector<HTMLInputElement>("[data-slot=questionnaire-input]")
          ?.focus()
      }}
      {...props}
    />
  )
}

function QuestionnaireTitle({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Title>) {
  return (
    <QuestionnairePrimitive.Title
      data-slot="questionnaire-title"
      className={cn(
        "font-heading text-base leading-6 font-medium text-pretty [&:not(:has(~[data-slot=questionnaire-description]))]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function QuestionnaireDescription({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Description>) {
  return (
    <QuestionnairePrimitive.Description
      data-slot="questionnaire-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  )
}

// agent-ui: a field among the choices is their "Other" row.
const ChoicesContext = React.createContext(false)

function QuestionnaireChoices({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Choices>) {
  return (
    <ChoicesContext value={true}>
      <QuestionnairePrimitive.Choices
        data-slot="questionnaire-choices"
        className={cn(
          "group/questionnaire-choices grid min-w-0 gap-2",
          className
        )}
        {...props}
      />
    </ChoicesContext>
  )
}

function QuestionnaireChoice({
  children,
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Choice>) {
  // agent-ui: light rows, not a stack of form fields: no border (but a
  // keyboard focus's ring; invalid, the error line under them says so), a
  // grey row when checked.
  // With a shortcut, its number key leads the row and shows the choice,
  // filled when checked, in place of the radio or checkbox.
  return (
    <QuestionnairePrimitive.Choice
      data-slot="questionnaire-choice"
      className={cn(
        "group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-transparent bg-transparent px-3 py-3 text-start text-sm transition-colors outline-none select-none hover:bg-muted/60 has-[>input:focus-visible]:ring-3 has-[>input:focus-visible]:ring-ring/50 data-checked:bg-muted dark:data-checked:bg-accent",
        "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <QuestionnairePrimitive.ChoiceInput
        data-slot="questionnaire-choice-input"
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-indicator"
        className="pointer-events-none relative flex size-4 shrink-0 translate-y-[--spacing(0.45)] items-center justify-center rounded-[4px] border border-input group-data-[shortcut]/questionnaire-choice:hidden group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 group-data-[type=radio]/questionnaire-choice:rounded-full group-data-checked/questionnaire-choice:border-primary group-data-checked/questionnaire-choice:bg-primary group-data-checked/questionnaire-choice:text-primary-foreground dark:bg-input/30 dark:group-data-checked/questionnaire-choice:bg-primary"
      >
        <span
          data-slot="questionnaire-choice-indicator-dot"
          className="hidden size-2 rounded-full bg-primary-foreground group-data-[type=checkbox]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block"
        />
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} data-slot="questionnaire-choice-indicator-check" className="hidden size-3.5 group-data-[type=radio]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block" />
      </span>
      <QuestionnairePrimitive.ChoiceLabel
        data-slot="questionnaire-choice-label"
        className="flex min-w-0 flex-1 flex-col gap-0.5 leading-5"
      >
        {children}
      </QuestionnairePrimitive.ChoiceLabel>
      <QuestionnairePrimitive.ChoiceShortcut
        data-slot="questionnaire-choice-shortcut"
        className="pointer-events-none order-first hidden size-4 shrink-0 translate-y-px items-center justify-center rounded-sm border border-border font-mono text-2xs leading-none font-medium text-muted-foreground tabular-nums group-data-checked/questionnaire-choice:border-foreground group-data-checked/questionnaire-choice:bg-foreground group-data-checked/questionnaire-choice:text-background group-data-[shortcut]/questionnaire-choice:inline-flex"
      />
    </QuestionnairePrimitive.Choice>
  )
}

function QuestionnaireChoiceDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="questionnaire-choice-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

const hasText = (value: unknown) =>
  value != null && String(value).trim().length > 0

function QuestionnaireInput(
  props: React.ComponentProps<typeof QuestionnairePrimitive.Input>
) {
  const inChoices = React.useContext(ChoicesContext)
  return inChoices ? (
    <QuestionnaireOther {...props} />
  ) : (
    <QuestionnaireField {...props} />
  )
}

/**
 * agent-ui: the "Other" field among the choices is one of their rows, not
 * a form field: no border, its placeholder in grey where a choice's words
 * are ("Something else…"), led by the key after the choices' own, which
 * types in it, and grey like a checked choice once it has words.
 */
function QuestionnaireOther({
  className,
  onChange,
  ref,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Input>) {
  const row = React.useRef<HTMLDivElement>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const [shortcut, setShortcut] = React.useState<string | null>(null)
  const [typed, setTyped] = React.useState(() => hasText(props.defaultValue))
  const filled = props.value !== undefined ? hasText(props.value) : typed

  // The key after the choices' own: "3" after two, "C" after B.
  React.useLayoutEffect(() => {
    const element = row.current
    const choices = element?.closest("[data-slot=questionnaire-choices]")
    const mode = choices?.getAttribute("data-shortcuts")
    if (!element || !choices || (mode !== "numbers" && mode !== "letters")) {
      setShortcut(null)
      return
    }
    const before = Array.from(
      choices.querySelectorAll(
        "[data-slot=questionnaire-choice]:not([data-disabled]):not([data-other])"
      )
    ).filter(
      (choice) =>
        choice.compareDocumentPosition(element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).length
    const keys = mode === "numbers" ? 9 : 26
    setShortcut(
      before >= keys
        ? null
        : mode === "numbers"
          ? String(before + 1)
          : String.fromCharCode(65 + before)
    )
  }, [])

  // That key, outside a field, types in it.
  React.useEffect(() => {
    const item = row.current?.closest("[data-slot=questionnaire-item]")
    if (!item || !shortcut) return
    const onKeyDown = (event: Event) => {
      const key = event as KeyboardEvent
      const target = key.target as HTMLElement
      if (
        key.defaultPrevented ||
        key.metaKey ||
        key.ctrlKey ||
        key.altKey ||
        key.key.toUpperCase() !== shortcut ||
        target.closest(
          "input:not([type=radio]):not([type=checkbox]), textarea, [contenteditable]"
        )
      )
        return
      key.preventDefault()
      input.current?.focus()
    }
    item.addEventListener("keydown", onKeyDown)
    return () => item.removeEventListener("keydown", onKeyDown)
  }, [shortcut])

  return (
    <div
      ref={row}
      data-slot="questionnaire-choice"
      data-other=""
      data-shortcut={shortcut ?? undefined}
      data-checked={filled ? "" : undefined}
      className="group/questionnaire-choice relative flex min-h-11 cursor-text items-start gap-2 rounded-lg px-3 py-3 text-start text-sm transition-colors focus-within:bg-muted/60 hover:bg-muted/60 data-checked:bg-muted dark:data-checked:bg-accent"
      onClick={(event) => {
        if (event.target === event.currentTarget) input.current?.focus()
      }}
    >
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-shortcut"
        className="pointer-events-none order-first hidden size-4 shrink-0 translate-y-px items-center justify-center rounded-sm border border-border font-mono text-2xs leading-none font-medium text-muted-foreground tabular-nums group-data-checked/questionnaire-choice:border-foreground group-data-checked/questionnaire-choice:bg-foreground group-data-checked/questionnaire-choice:text-background group-data-[shortcut]/questionnaire-choice:inline-flex"
      >
        {shortcut}
      </span>
      <QuestionnairePrimitive.Input
        ref={(element: HTMLInputElement | null) => {
          input.current = element
          if (typeof ref === "function") ref(element)
          else if (ref) ref.current = element
        }}
        data-slot="questionnaire-input"
        aria-keyshortcuts={shortcut ?? undefined}
        className={cn(
          "min-w-0 flex-1 bg-transparent p-0 leading-5 outline-none placeholder:text-subtle-foreground disabled:pointer-events-none disabled:opacity-50 max-md:text-base",
          className
        )}
        onChange={(event) => {
          onChange?.(event)
          setTyped(hasText(event.currentTarget.value))
        }}
        {...props}
      />
    </div>
  )
}

function QuestionnaireField({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Input>) {
  return (
    <div
      data-slot="questionnaire-input-wrapper"
      className="group/questionnaire-input relative w-full min-w-0"
    >
      <QuestionnairePrimitive.Input
        data-slot="questionnaire-input"
        // agent-ui: invalid, still a grey field: the error line says so.
        className={cn(
          "h-8 min-h-11 w-full min-w-0 rounded-lg border border-field bg-transparent px-3 py-1 text-base transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 sm:min-h-0 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
          "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
          className
        )}
        {...props}
      />
    </div>
  )
}

function QuestionnaireError({
  className,
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Error>) {
  return (
    <QuestionnairePrimitive.Error
      data-slot="questionnaire-error"
      // agent-ui: the error is this line, an icon and its words, the one
      // place in red: the choices and the "Other" field stay grey.
      className={cn(
        "mt-2 items-start gap-2 text-sm text-destructive [&:not([hidden])]:flex [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      render={(errorProps) => (
        <p {...errorProps}>
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden />
          <span>{errorProps.children as React.ReactNode}</span>
        </p>
      )}
      {...props}
    />
  )
}

function QuestionnaireActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="questionnaire-actions"
      // agent-ui: a row, not a grid of three, so a Decline fits: Previous
      // at its start, or a Decline there and Previous with the rest at
      // its end.
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center justify-end gap-2 sm:min-h-8 [&>[data-slot=questionnaire-decline]]:me-auto [&>[data-slot=questionnaire-previous]]:me-auto has-[>[data-slot=questionnaire-decline]]:[&>[data-slot=questionnaire-previous]]:me-0",
        className
      )}
      {...props}
    />
  )
}

function QuestionnairePrevious({
  children,
  className,
  size = "default",
  variant = "outline",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Previous> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Previous
      data-slot="questionnaire-previous"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-1 row-start-1 min-h-11 justify-self-start sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Previous"}
    </QuestionnairePrimitive.Previous>
  )
}

function QuestionnaireSkip({
  children,
  className,
  size = "default",
  variant = "outline",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Skip> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Skip
      data-slot="questionnaire-skip"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-2 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Skip"}
    </QuestionnairePrimitive.Skip>
  )
}

function QuestionnaireNext({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Next> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Next
      data-slot="questionnaire-next"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Next"}
    </QuestionnairePrimitive.Next>
  )
}

function QuestionnaireSubmit({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<typeof QuestionnairePrimitive.Submit> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.Submit
      data-slot="questionnaire-submit"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Submit"}
    </QuestionnairePrimitive.Submit>
  )
}

/**
 * agent-ui: the way out of the whole questionnaire, not of one question
 * (that is `QuestionnaireSkip`): e.g. the reader does not answer an
 * agent's questions at all. A quiet button, on any question, required
 * or not; what it does is its `onClick`'s.
 */
function QuestionnaireDecline({
  children,
  className,
  size = "default",
  variant = "ghost",
  type = "button",
  ...props
}: React.ComponentProps<"button"> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <button
      data-slot="questionnaire-decline"
      data-size={size}
      data-variant={variant}
      type={type}
      className={cn(
        buttonVariants({ size, variant }),
        "min-h-11 sm:min-h-0",
        className
      )}
      {...props}
    >
      {children ?? "Decline"}
    </button>
  )
}

// agent-ui: its words' type, exported, so an app's translation names
// every key.
type QuestionnaireNavigationLabels = {
  decline: React.ReactNode
  previous: React.ReactNode
  skip: React.ReactNode
  next: React.ReactNode
  submit: React.ReactNode
}

/**
 * agent-ui: the way through, whatever the question: Previous but on the
 * first, Skip on an optional one, Next but on the last and Submit on it.
 * Each shows only where it applies, so one of them always goes on. With
 * `onDecline`, a quiet Decline first, on every question: the way out of
 * the whole questionnaire. In a `QuestionnaireActions`, or a footer of
 * its own.
 */
function QuestionnaireNavigation({
  size = "default",
  onDecline,
  labels,
}: Pick<React.ComponentProps<typeof Button>, "size"> & {
  /** The reader answers none of it: e.g. tell the agent they declined. */
  onDecline?: (() => void) | undefined
  labels?: Partial<QuestionnaireNavigationLabels>
}) {
  return (
    <>
      {onDecline && (
        <QuestionnaireDecline size={size} onClick={() => onDecline()}>
          {labels?.decline}
        </QuestionnaireDecline>
      )}
      <QuestionnairePrevious size={size}>
        {labels?.previous}
      </QuestionnairePrevious>
      <QuestionnaireSkip size={size}>{labels?.skip}</QuestionnaireSkip>
      <QuestionnaireNext size={size}>{labels?.next}</QuestionnaireNext>
      <QuestionnaireSubmit size={size}>{labels?.submit}</QuestionnaireSubmit>
    </>
  )
}

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireNavigation,
  type QuestionnaireNavigationLabels,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDecline,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
}
