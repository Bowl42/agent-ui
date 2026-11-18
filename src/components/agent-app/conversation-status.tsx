"use client"

import { cn } from "cn"

import { StatusMark, type StatusTone } from "@/components/status-mark"

/** What the reader should know of a conversation from a list of them. */
type ConversationStatus = "running" | "waiting" | "error" | "unread"

const statusLabels: Record<ConversationStatus, string> = {
  running: "Running",
  waiting: "Needs you",
  error: "Failed",
  unread: "Unread",
}

const tones: Record<ConversationStatus, StatusTone> = {
  running: "neutral",
  waiting: "warning",
  error: "destructive",
  // The sidebar and the lists have no colour: shapes in greys (`grey`).
  unread: "neutral",
}

/** The most pressing first: what a group of conversations shows. */
const pressing: ConversationStatus[] = ["waiting", "error", "running", "unread"]

/** A conversation's status as a mark in greys, at the end of its row. */
function ConversationStatusMark({
  status,
  label,
  className,
}: {
  status: ConversationStatus | undefined
  label: string
  className?: string
}) {
  if (!status) return null
  return (
    <StatusMark
      data-status={status}
      tone={tones[status]}
      busy={status === "running"}
      grey
      label={label}
      className={cn("ms-auto", className)}
    />
  )
}

export {
  ConversationStatusMark,
  pressing,
  statusLabels,
  type ConversationStatus,
}
