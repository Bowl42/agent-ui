"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckListIcon,
  CheckmarkCircle02Icon,
  CircleIcon,
} from "@hugeicons/core-free-icons"

import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"

type TodoItem = {
  id: string
  /** What is to be done, in the app's words. */
  title: React.ReactNode
  status: "pending" | "running" | "done"
}

type TodoListLabels = {
  /** How many are done: "2 of 5". */
  done: (done: number, items: number) => string
  /** For screen readers, each item's status. */
  status: Record<TodoItem["status"], string>
}

const defaultLabels: TodoListLabels = {
  done: (done, items) => `${done} of ${items}`,
  status: { pending: "To do", running: "In progress", done: "Done" },
}

/**
 * A list of things to do, such as an agent's plan, flat in the
 * conversation: its title and how many are done (a bar and "2 of 5"),
 * then the items, the one in progress in bold with a spinner, those done
 * muted and struck through.
 */
function TodoList({
  title = "Plan",
  items,
  labels: labelsProp,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title?: React.ReactNode
  items: TodoItem[]
  labels?: Partial<TodoListLabels>
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const id = React.useId()
  const done = items.filter((item) => item.status === "done").length
  return (
    <section
      data-slot="todo-list"
      aria-labelledby={id}
      className={cn(
        "flex w-full min-w-0 flex-col rounded-xl border text-2sm",
        // In a popover, the popover's surface its edge: no border of its
        // own, out to the popover's edges past its padding.
        "in-data-[slot=popover-content]:-mx-3 in-data-[slot=popover-content]:w-auto in-data-[slot=popover-content]:rounded-none in-data-[slot=popover-content]:border-0 in-[[data-slot=popover-content]:not([data-phone-sheet])]:-my-3",
        className
      )}
      {...props}
    >
      <div className="flex h-10 items-center gap-2 px-3">
        <HugeiconsIcon
          icon={CheckListIcon}
          strokeWidth={2}
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <h3 id={id} className="min-w-0 truncate font-normal">
          {title}
        </h3>
        <Progress
          value={items.length ? (done / items.length) * 100 : 0}
          aria-label={labels.done(done, items.length)}
          // grid: mark
          className="ms-auto w-12 shrink-0 gap-0 *:data-[slot=progress-track]:h-0.75 *:data-[slot=progress-track]:bg-border"
        />
        <span className="shrink-0 text-xs text-subtle-foreground tabular-nums">
          {labels.done(done, items.length)}
        </span>
      </div>
      <ul className="border-t py-1">
        {items.map((item) => (
          <li
            key={item.id}
            data-status={item.status}
            className="group/todo flex min-h-8 items-center gap-2 px-3 py-1 data-[status=done]:text-subtle-foreground data-[status=running]:font-medium"
          >
            {item.status === "running" ? (
              <Spinner
                aria-hidden="true"
                className="size-4 shrink-0 text-foreground"
              />
            ) : item.status === "done" ? (
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            ) : (
              <HugeiconsIcon
                icon={CircleIcon}
                strokeWidth={2}
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground/60"
              />
            )}
            <span className="sr-only">{labels.status[item.status]}: </span>
            <span className="min-w-0 group-data-[status=done]/todo:line-through group-data-[status=done]/todo:decoration-muted-foreground/50">
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { TodoList, type TodoItem, type TodoListLabels }
