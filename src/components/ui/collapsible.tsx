"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { cn } from "cn"

// agentui: whether it is open, for its panel to know when it has opened.
const CollapsibleOpenContext = React.createContext<boolean | undefined>(
  undefined
)

function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: CollapsiblePrimitive.Root.Props) {
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  const open = openProp ?? ownOpen
  return (
    <CollapsibleOpenContext.Provider value={open}>
      <CollapsiblePrimitive.Root
        data-slot="collapsible"
        {...(openProp === undefined ? {} : { open: openProp })}
        defaultOpen={defaultOpen}
        onOpenChange={(next, details) => {
          setOwnOpen(next)
          onOpenChange?.(next, details)
        }}
        {...props}
      />
    </CollapsibleOpenContext.Provider>
  )
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

// agentui: it opens and closes in height and fades with it, in the
// theme's motion-size (none where motion is reduced), clipped meanwhile.
// Once open, as tall as what is in it, unclipped: rows added after it
// opened, or text grown with the font size, are not cut off.
function CollapsibleContent({
  className,
  onTransitionEnd,
  ref,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  const open = React.useContext(CollapsibleOpenContext)
  const panel = React.useRef<HTMLDivElement | null>(null)
  // Open from the first, it never opens: it is open.
  const [opened, setOpened] = React.useState(open === true)
  const [was, setWas] = React.useState(open)
  if (open !== was) {
    setWas(open)
    setOpened(false)
  }
  // Opened at once where it has no motion (reduced, say): no transition
  // to end.
  React.useLayoutEffect(() => {
    if (!open || opened || !panel.current) return
    const style = getComputedStyle(panel.current)
    const seconds = (list: string) =>
      Math.max(...list.split(",").map((part) => parseFloat(part) || 0))
    if (
      seconds(style.transitionDuration) + seconds(style.transitionDelay) ===
      0
    )
      setOpened(true)
  }, [open, opened])
  return (
    <CollapsiblePrimitive.Panel
      ref={(node: HTMLDivElement | null) => {
        panel.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      }}
      data-slot="collapsible-content"
      data-opened={opened || undefined}
      className={cn(
        "h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] motion-size data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 data-opened:h-auto data-opened:overflow-visible",
        className
      )}
      onTransitionEnd={(event) => {
        onTransitionEnd?.(event)
        if (
          open &&
          event.target === event.currentTarget &&
          event.propertyName === "height"
        )
          setOpened(true)
      }}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
