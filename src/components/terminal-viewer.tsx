"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown02Icon,
  AtIcon,
  PlusSignIcon,
  StopIcon,
} from "@hugeicons/core-free-icons"

import { useFollowEnd } from "@/hooks/use-follow-end"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { FloatingButton } from "@/components/floating-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ViewerBack,
  ViewerForward,
  ViewerFrame,
  ViewerStatusButton,
  ViewerStatusSeparator,
  ViewerTool,
  defaultViewerLabels,
  type ViewerFrameProps,
  type ViewerLabels,
} from "@/components/viewer"

/** A process with its terminal, as the app runs it. */
type TerminalSession = {
  id: string
  /** Its tab's name: e.g. its command. */
  title: string
  /** What it wrote, with its ANSI colours. */
  output: string
  /** Still running: a live dot on its tab, and Stop. */
  running?: boolean | undefined
  /** At the end of the status bar: "Running · 12m", "Exited 1". */
  status?: React.ReactNode
}

type TerminalViewerLabels = {
  /** The tabs' name. */
  sessions: string
  running: string
  exited: string
  newSession: string
  stop: string
  clear: string
  sendToChat: string
  jumpToEnd: string
}

const defaultLabels: TerminalViewerLabels = {
  sessions: "Terminals",
  running: "Running",
  exited: "Exited",
  newSession: "New terminal",
  stop: "Stop",
  clear: "Clear",
  sendToChat: "Send output to chat",
  jumpToEnd: "Jump to end",
}

/** A terminal's tab: its live dot and its name. */
function TerminalTab({
  className,
  ...props
}: React.ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      data-slot="terminal-tab"
      className={cn(
        "h-7 flex-none gap-1 rounded-lg px-3 text-2sm font-normal data-active:bg-muted group-data-[variant=default]/tabs-list:data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TerminalOutput({
  output,
  running,
  label,
  jumpToEnd,
}: {
  output: string
  running: boolean
  label: string
  jumpToEnd: string
}) {
  const lines = useHighlightedCode(output, "ansi")
  const { ref, atEnd, scrollToEnd } = useFollowEnd<HTMLPreElement>()
  return (
    <>
      <pre
        ref={ref}
        tabIndex={0}
        aria-label={label}
        data-slot="terminal-viewer-output"
        className="min-h-0 flex-1 overflow-auto bg-background px-3 py-3 font-mono text-xs leading-5 text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        {lines.map((line, index) => (
          <div key={index} className="min-h-lh">
            {line}
            {running && index === lines.length - 1 && (
              <span
                aria-hidden="true"
                // grid: mark (the cursor, a glyph's size)
                className="relative top-0.5 ms-px inline-block h-3.5 w-1.75 bg-foreground"
              />
            )}
          </div>
        ))}
      </pre>
      {!atEnd && (
        <FloatingButton
          onClick={scrollToEnd}
          className="absolute bottom-3 left-1/2 -translate-x-1/2"
        >
          <HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={2} />
          {jumpToEnd}
        </FloatingButton>
      )}
    </>
  )
}

/**
 * Terminals in tabs, a process each: a live dot on those still running,
 * its output with its colours (following its end while it comes), Stop,
 * Clear and "Send output to chat" below with what the app says of it.
 */
function TerminalViewer({
  sessions,
  active: activeProp,
  onActiveChange,
  onNew,
  onStop,
  onClear,
  onSendToChat,
  labels: labelsProp,
  menu,
  onBack,
  onForward,
  actions,
  className,
}: Pick<ViewerFrameProps, "menu" | "onBack" | "onForward" | "actions"> & {
  sessions: readonly TerminalSession[]
  /** The one shown, by id: the viewer's own, or the app's. */
  active?: string | undefined
  onActiveChange?: ((id: string) => void) | undefined
  onNew?: (() => void) | undefined
  onStop?: ((session: TerminalSession) => void) | undefined
  onClear?: ((session: TerminalSession) => void) | undefined
  onSendToChat?: ((session: TerminalSession) => void) | undefined
  labels?: Partial<TerminalViewerLabels & ViewerLabels>
  className?: string
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [own, setOwn] = React.useState(sessions[0]?.id)
  const active =
    sessions.find((session) => session.id === (activeProp ?? own)) ??
    sessions[0]

  return (
    <Tabs
      value={active?.id ?? null}
      onValueChange={(id: string) => {
        setOwn(id)
        onActiveChange?.(id)
      }}
      className={cn("h-full min-h-0 gap-0", className)}
    >
      <ViewerFrame
        data-viewer="terminal"
        name={active?.title ?? labels.sessions}
        labels={labelsProp}
        menu={menu}
        actions={actions}
        start={
          <>
            {onBack && (
              <ViewerBack
                label={labelsProp?.back ?? defaultViewerLabels.back}
                onClick={onBack}
              />
            )}
            {onForward && (
              <ViewerForward
                label={labelsProp?.forward ?? defaultViewerLabels.forward}
                onClick={onForward}
              />
            )}
            <TabsList
              aria-label={labels.sessions}
              className="h-auto min-w-0 flex-1 justify-start gap-0.5 overflow-x-auto overflow-y-hidden bg-transparent p-0 ps-1 inset-ring-0"
            >
              {sessions.map((session) => (
                <TerminalTab key={session.id} value={session.id}>
                  <span
                    aria-hidden="true"
                    data-running={session.running || undefined}
                    // grid: mark (a status dot)
                    className="size-1.5 shrink-0 rounded-full ring-1 ring-muted-foreground ring-inset data-running:bg-foreground data-running:ring-0"
                  />
                  {session.title}
                  <span className="sr-only">
                    {`, ${session.running ? labels.running : labels.exited}`}
                  </span>
                </TerminalTab>
              ))}
            </TabsList>
          </>
        }
        tools={
          onNew && (
            <ViewerTool label={labels.newSession} onClick={onNew}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            </ViewerTool>
          )
        }
        controls={
          active &&
          (onStop || onClear || onSendToChat) && (
            <>
              {onStop && (
                <ViewerStatusButton
                  disabled={!active.running}
                  onClick={() => onStop(active)}
                >
                  <HugeiconsIcon icon={StopIcon} strokeWidth={2} />
                  {labels.stop}
                </ViewerStatusButton>
              )}
              {onClear && (
                <>
                  {onStop && <ViewerStatusSeparator />}
                  <ViewerStatusButton onClick={() => onClear(active)}>
                    {labels.clear}
                  </ViewerStatusButton>
                </>
              )}
              {onSendToChat && (
                <>
                  {(onStop || onClear) && <ViewerStatusSeparator />}
                  <ViewerStatusButton onClick={() => onSendToChat(active)}>
                    <HugeiconsIcon icon={AtIcon} strokeWidth={2} />
                    {labels.sendToChat}
                  </ViewerStatusButton>
                </>
              )}
            </>
          )
        }
        facts={[active?.status]}
      >
        {sessions.map((session) => (
          <TabsContent
            key={session.id}
            value={session.id}
            className="relative flex min-h-0 flex-1 flex-col data-hidden:hidden"
          >
            <TerminalOutput
              output={session.output}
              running={!!session.running}
              label={session.title}
              jumpToEnd={labels.jumpToEnd}
            />
          </TabsContent>
        ))}
      </ViewerFrame>
    </Tabs>
  )
}

export { TerminalViewer, type TerminalSession, type TerminalViewerLabels }
