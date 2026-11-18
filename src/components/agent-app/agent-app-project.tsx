"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowLeft01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"

import {
  ConversationStatusMark,
  statusLabels,
  type ConversationStatus,
} from "./conversation-status"
import { projectNames, type AppProject } from "./project-picker"
import type { AppConversation, AppTarget } from "./agent-app-sidebar"
import { opensElsewhere } from "./agent-app"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemMeta,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"

type AgentAppProjectLabels = {
  newConversation: string
  conversations: string
  noConversations: string
  /** Under "No conversations yet". */
  noConversationsHint: string
  loadMore: string
  /** The title over why a project cannot be used. */
  unavailable: string
  status: Record<ConversationStatus, string>
  /** A row's menu button: "More for Fix the slow deploy". */
  conversationMenu: (conversation: string) => string
}

const defaultLabels: AgentAppProjectLabels = {
  newConversation: "New conversation",
  conversations: "Conversations",
  noConversations: "No conversations yet",
  noConversationsHint: "Conversations started in this project show here.",
  loadMore: "Load more",
  unavailable: "This project cannot be used",
  status: statusLabels,
  conversationMenu: (conversation) => `More for ${conversation}`,
}

/**
 * A part of a project's page under its heading: its conversations, or
 * the app's own (its files, its settings), with the heading's action,
 * a line under the heading that says what it is, then its content.
 */
function AgentAppProjectSection({
  title,
  description,
  action,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  /** Under the heading: what the section is, or holds. */
  description?: React.ReactNode
  /** Beside the heading: e.g. a link to see all. */
  action?: React.ReactNode
}) {
  const id = React.useId()
  const descriptionId = React.useId()
  return (
    <section
      data-slot="agent-app-project-section"
      aria-labelledby={id}
      {...(description ? { "aria-describedby": descriptionId } : {})}
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex min-h-8 items-center gap-2">
          <h2 id={id} className="text-sm font-medium">
            {title}
          </h2>
          {action && <div className="ms-auto flex items-center">{action}</div>}
        </div>
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

/** The way back from a page to the one it is under. */
type AgentAppPageBack = {
  /** The parent page's name: e.g. "Settings". */
  label: React.ReactNode
  href: string
  /** On going back; e.g. `event.preventDefault()` and route. */
  onClick?: React.MouseEventHandler<HTMLAnchorElement> | undefined
}

/**
 * A page in the main area, e.g. a project's: the way back to the page
 * it is under, if it is under one; its title, what it is under it, and
 * its buttons; then its sections. Without a title its content names
 * itself (a form with its own heading), in the same column. With `fill`,
 * the page does not scroll: its content takes the rest of its height and
 * scrolls itself, e.g. a `VirtualList` of thousands.
 */
function AgentAppPage({
  back,
  tabs,
  title,
  description,
  actions,
  footer,
  fill = false,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  /** Above the title: a link to the parent page (Settings → Security). */
  back?: AgentAppPageBack | undefined
  /**
   * Above the title, under the way back: e.g. line tabs on a rule
   * (`<TabsList variant="line" rule>`) between the page's views, 16px
   * over its title.
   */
  tabs?: React.ReactNode
  /** The page's heading (h1); none where its content has its own. */
  title?: React.ReactNode
  /**
   * Under the title, wrapping, all of it read: e.g. what the page is
   * for, or a project's directory (a long path breaks anywhere).
   */
  description?: React.ReactNode
  /** Beside the title: e.g. "New conversation". */
  actions?: React.ReactNode
  /**
   * Kept at the page's foot as it scrolls, on its colour, in its column:
   * e.g. unsaved changes, an `Alert variant="warning" role="status"` with
   * its `AlertAction`s. At the foot of a short page too.
   */
  footer?: React.ReactNode
  /**
   * The page as tall as the main area, not scrolling: its content, in a
   * column under the head, takes the rest and scrolls itself (give it
   * `min-h-0 flex-1`, e.g. a `VirtualList`).
   */
  fill?: boolean
}) {
  const head = title != null || description || actions
  return (
    <div
      data-slot="agent-app-page"
      // Its scrollbar a conversation's, thin and its room kept, so the
      // column is where a conversation's is with a scrollbar that takes
      // room (Windows, Linux).
      className={cn(
        "min-h-0 flex-1 scrollbar-thin scrollbar-gutter-stable",
        fill ? "overflow-hidden" : "overflow-y-auto",
        className
      )}
      data-fill={fill || undefined}
      {...props}
    >
      {/* Its edges a conversation's column's: max-w-column, p-4. */}
      {/* At least as tall as the page: an empty state in its middle;
          filling, as tall as it. */}
      <div
        className={cn(
          "mx-auto flex w-full max-w-column flex-col gap-8 p-4",
          fill ? "h-full" : "min-h-full"
        )}
      >
        {(back || tabs || head) && (
          // Without a title, the content's own heading 4px under the way
          // back, as a title is.
          // grid: clear (a title's height, 28px, taken back)
          <div className={cn("flex flex-col gap-1", !head && !tabs && "-mb-7")}>
            {back && (
              <a
                href={back.href}
                onClick={back.onClick}
                data-slot="agent-app-page-back"
                className="touch-target relative -ms-1 flex w-fit max-w-full items-center gap-1 rounded-sm px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  strokeWidth={2}
                  className="size-4 shrink-0 rtl:rotate-180"
                />
                <span className="truncate">{back.label}</span>
              </a>
            )}
            {tabs && (
              <div
                data-slot="agent-app-page-tabs"
                className={cn(
                  "min-w-0",
                  // grid: track (the first tab's word on the page's start
                  // line, its title's and its content's: no list padding
                  // or tab inset before it, its underline from there)
                  "*:data-[slot=tabs-list]:ps-0 [&_[data-slot=tabs-trigger]:first-child]:border-s-0 [&_[data-slot=tabs-trigger]:first-child]:ps-0",
                  head && "mb-3"
                )}
              >
                {tabs}
              </div>
            )}
            {head && (
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  {title != null && (
                    <h1 className="truncate text-lg font-medium">{title}</h1>
                  )}
                  {description && (
                    <p className="text-sm text-pretty wrap-anywhere text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="flex shrink-0 items-center gap-2">
                    {actions}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {fill ? (
          <div
            data-slot="agent-app-page-content"
            className="flex min-h-0 flex-1 flex-col"
          >
            {children}
          </div>
        ) : (
          children
        )}
        {footer && (
          // grid: clear (the column's padding, taken back to cover it)
          <div
            data-slot="agent-app-page-footer"
            className="sticky bottom-0 z-10 -mx-4 mt-auto -mb-4 bg-background px-4 pt-2 pb-safe-or-4"
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/** A row's own buttons and menu, the app's: for a list of conversations. */
type RowActions = {
  /**
   * Buttons at a row's end, before its menu: e.g. an icon `Button` to pin
   * it, named by the app.
   */
  conversationActions?:
    ((conversation: AppConversation) => React.ReactNode) | undefined
  /** `DropdownMenuItem`s for a row's menu: e.g. rename, delete. */
  conversationMenu?:
    ((conversation: AppConversation) => React.ReactNode) | undefined
}

/**
 * Conversations as a list, newest first, as many as the app has loaded,
 * "Load more" while there are more; with none, says so and offers to
 * start one, or, `quiet`, says so in a line. A row is shadcn's `Item`:
 * its title a link over the whole row, where it has an address or
 * `onSelect`, and at its end its status, the app's buttons and a menu.
 */
function AgentAppConversationList({
  conversations,
  href,
  onSelect,
  conversationActions,
  conversationMenu,
  onNewConversation,
  onLoadMore,
  loadingMore = false,
  quiet = false,
  density = "default",
  metaAlign,
  labels: labelsProp,
}: {
  /** Newest first: the ones loaded so far. */
  conversations: AppConversation[]
  /** A conversation's address, to make its row a link. */
  href?: ((target: AppTarget) => string | undefined) | undefined
  /**
   * On going to a conversation; e.g. `event.preventDefault()` and route.
   * Not for a click that opens its address elsewhere (a new tab).
   */
  onSelect?: ((target: AppTarget, event: React.MouseEvent) => void) | undefined
  /** Offered where there are none. */
  onNewConversation?: (() => void) | undefined
  /** Loads the next ones, where there are more. */
  onLoadMore?: (() => void) | undefined
  /** While the next ones load. */
  loadingMore?: boolean
  /**
   * With none, a line saying so, not a block offering to start one: where
   * the page has more under it, and its own "New conversation".
   */
  quiet?: boolean
  /**
   * `"compact"`, for a long list: rows 32px, as the sidebar's, without
   * an outline, hovered; outlined cards apart by default.
   */
  density?: "default" | "compact" | undefined
  /**
   * Where each column of the rows' `meta` lines up: at its start (words:
   * a place, a branch; the default) or its end (numbers: a cost).
   */
  metaAlign?: readonly ("start" | "end")[] | undefined
  labels?: Partial<AgentAppProjectLabels>
} & RowActions) {
  const labels = { ...defaultLabels, ...labelsProp }
  // The rows' facts in columns, as many as the most a row has, then one
  // for their status and buttons.
  const facts = Math.max(
    0,
    ...conversations.map((conversation) => conversation.meta?.length ?? 0)
  )
  const ends = conversations.some(
    (conversation) =>
      conversation.status ||
      conversationActions?.(conversation) ||
      conversationMenu?.(conversation)
  )
  return (
    <>
      {conversations.length === 0 && quiet ? (
        <p
          data-slot="agent-app-conversation-list-empty"
          className="text-sm text-muted-foreground"
        >
          {labels.noConversations}
        </p>
      ) : conversations.length === 0 ? (
        // In the middle of the room it has, a little above: where the eye
        // meets the middle of a page.
        <Empty className="pb-32">
          <EmptyHeader>
            <EmptyTitle>{labels.noConversations}</EmptyTitle>
            <EmptyDescription>{labels.noConversationsHint}</EmptyDescription>
          </EmptyHeader>
          {onNewConversation && (
            <EmptyContent>
              <Button variant="outline" onClick={onNewConversation}>
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                {labels.newConversation}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ItemGroup
          data-density={density}
          columns={facts > 0 ? facts + (ends ? 1 : 0) : undefined}
        >
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              facts={facts}
              metaAlign={metaAlign}
              density={density}
              conversation={conversation}
              href={href?.({ conversation: conversation.id })}
              onSelect={onSelect}
              actions={conversationActions?.(conversation)}
              menu={conversationMenu?.(conversation)}
              labels={labels}
            />
          ))}
        </ItemGroup>
      )}
      {onLoadMore && conversations.length > 0 && (
        <Button
          variant="outline"
          // Focusable while they load, as `ComposerSubmit` is: the
          // keyboard keeps its place, and presses it again after.
          disabled={loadingMore}
          focusableWhenDisabled
          aria-busy={loadingMore || undefined}
          onClick={onLoadMore}
          className="self-center data-disabled:pointer-events-none data-disabled:opacity-50"
        >
          {loadingMore && <Spinner aria-hidden="true" />}
          {labels.loadMore}
        </Button>
      )}
    </>
  )
}

type PageProps = Omit<React.ComponentProps<"div">, "onSelect"> & {
  /** Newest first: the ones loaded so far. */
  conversations: AppConversation[]
  /** A conversation's address, to make its row a link. */
  href?: (target: AppTarget) => string | undefined
  /**
   * On going to a conversation; e.g. `event.preventDefault()` and route.
   * Not for a click that opens its address elsewhere (a new tab).
   */
  onSelect?: (target: AppTarget, event: React.MouseEvent) => void
  /** Loads the next ones, where there are more. */
  onLoadMore?: () => void
  /** While the next ones load. */
  loadingMore?: boolean
  /** The app's buttons beside "New conversation": e.g. its settings. */
  actions?: React.ReactNode
  /** Its list's: `"compact"` rows, 32px, for a long one. */
  density?: "default" | "compact" | undefined
  /** Its list's: where each column of the rows' `meta` lines up. */
  metaAlign?: readonly ("start" | "end")[] | undefined
  labels?: Partial<AgentAppProjectLabels>
} & RowActions

/**
 * A project's page: its name and directory, a new conversation in it,
 * all its conversations, newest first, as many as the app loads, and
 * the app's own sections after (`children`, in `AgentAppProjectSection`s).
 * With none of its conversations but sections of the app's, a line says
 * so, leaving the page to them. A project that cannot be used says why,
 * and starts nothing.
 */
function AgentAppProject({
  project,
  conversations,
  href,
  onSelect,
  onNewConversation,
  onLoadMore,
  loadingMore = false,
  conversationActions,
  conversationMenu,
  actions,
  density,
  metaAlign,
  children,
  labels: labelsProp,
  ...props
}: PageProps & {
  project: AppProject
  onNewConversation?: (project: string) => void
}) {
  const labels = { ...defaultLabels, ...labelsProp }
  // The app's sections under the list: an empty list leaves them the page.
  const more = React.Children.toArray(children).length > 0
  const name = projectNames([project]).get(project.id)!.name
  const usable = project.unavailable === undefined
  const start =
    onNewConversation && usable
      ? () => onNewConversation(project.id)
      : undefined
  // Nothing on it: the empty state in its middle offers to start one, the
  // only button that does.
  const empty = conversations.length === 0 && !more

  return (
    <AgentAppPage
      data-slot="agent-app-project"
      title={name}
      description={project.path}
      actions={
        (actions || (start && !empty)) && (
          <>
            {actions}
            {start && !empty && (
              <Button variant="outline" onClick={start}>
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                {labels.newConversation}
              </Button>
            )}
          </>
        )
      }
      {...props}
    >
      {!usable && (
        <Alert>
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
          <AlertTitle>{labels.unavailable}</AlertTitle>
          <AlertDescription>{project.unavailable}</AlertDescription>
        </Alert>
      )}
      <AgentAppProjectSection
        title={labels.conversations}
        className={empty ? "flex-1" : undefined}
      >
        <AgentAppConversationList
          conversations={conversations}
          href={href}
          onSelect={onSelect}
          onNewConversation={start}
          conversationActions={conversationActions}
          conversationMenu={conversationMenu}
          onLoadMore={onLoadMore}
          loadingMore={loadingMore}
          quiet={more}
          density={density}
          metaAlign={metaAlign}
          labels={labels}
        />
      </AgentAppProjectSection>
      {children}
    </AgentAppPage>
  )
}

/**
 * The page of the conversations in no project, which the sidebar lists
 * only the latest of: all of them, as many as the app loads, and a new
 * one in no project.
 */
function AgentAppConversations({
  conversations,
  href,
  onSelect,
  onNewConversation,
  onLoadMore,
  loadingMore = false,
  conversationActions,
  conversationMenu,
  actions,
  density,
  metaAlign,
  children,
  labels: labelsProp,
  ...props
}: PageProps & {
  onNewConversation?: () => void
}) {
  const labels = {
    ...defaultLabels,
    noConversationsHint: "Conversations started in no project show here.",
    ...labelsProp,
  }
  const more = React.Children.toArray(children).length > 0
  // Nothing on it: the empty state in its middle offers to start one, the
  // only button that does.
  const empty = conversations.length === 0 && !more
  return (
    <AgentAppPage
      data-slot="agent-app-conversations-page"
      title={labels.conversations}
      actions={
        (actions || (onNewConversation && !empty)) && (
          <>
            {actions}
            {onNewConversation && !empty && (
              <Button variant="outline" onClick={onNewConversation}>
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                {labels.newConversation}
              </Button>
            )}
          </>
        )
      }
      {...props}
    >
      <section
        aria-label={labels.conversations}
        className={cn("flex flex-col gap-3", empty && "flex-1")}
      >
        <AgentAppConversationList
          conversations={conversations}
          href={href}
          onSelect={onSelect}
          onNewConversation={onNewConversation}
          conversationActions={conversationActions}
          conversationMenu={conversationMenu}
          onLoadMore={onLoadMore}
          loadingMore={loadingMore}
          quiet={more}
          density={density}
          metaAlign={metaAlign}
          labels={labels}
        />
      </section>
      {children}
    </AgentAppPage>
  )
}

function ConversationItem({
  conversation,
  facts,
  metaAlign,
  density,
  href,
  onSelect,
  actions,
  menu,
  labels,
}: {
  conversation: AppConversation
  /** The list's columns of facts. */
  facts: number
  metaAlign: readonly ("start" | "end")[] | undefined
  density: "default" | "compact"
  href: string | undefined
  onSelect: ((target: AppTarget, event: React.MouseEvent) => void) | undefined
  actions: React.ReactNode
  menu: React.ReactNode
  labels: AgentAppProjectLabels
}) {
  const linked = href !== undefined || onSelect !== undefined
  const end = conversation.status || actions || menu
  return (
    // ItemGroup is a list; each of its items, one of the list's: the item
    // itself, so it stands in the group's columns.
    <Item
      role="listitem"
      variant="outline"
      // Compact: 32px, as the sidebar's rows, no outline.
      size={density === "compact" ? "compact" : "sm"}
      data-density={density}
    >
      {conversation.icon !== undefined && (
        <ItemMedia
          variant="icon"
          aria-hidden="true"
          className="text-muted-foreground *:size-4"
        >
          {conversation.icon}
        </ItemMedia>
      )}
      <ItemContent>
        <ItemTitle>
          {linked ? (
            href !== undefined ? (
              <ItemLink
                href={href}
                onClick={(event) => {
                  // A new tab's: the browser's.
                  if (opensElsewhere(event)) return
                  onSelect?.({ conversation: conversation.id }, event)
                }}
              >
                {conversation.title}
              </ItemLink>
            ) : (
              <ItemLink
                render={<button type="button" />}
                onClick={(event) =>
                  onSelect?.({ conversation: conversation.id }, event)
                }
              >
                {conversation.title}
              </ItemLink>
            )
          ) : (
            conversation.title
          )}
        </ItemTitle>
        {conversation.description && (
          <ItemDescription>{conversation.description}</ItemDescription>
        )}
        {facts > 0 && conversation.meta?.some((fact) => fact != null) && (
          // On a phone, its facts a line under its title.
          <ItemDescription phoneOnly>
            {conversation.meta
              .filter((fact) => fact != null)
              .map((fact, index) => (
                <React.Fragment key={index}>
                  {index > 0 && " · "}
                  {fact}
                </React.Fragment>
              ))}
          </ItemDescription>
        )}
      </ItemContent>
      {Array.from({ length: facts }, (_, index) => (
        // Its facts in the list's columns, an empty one where it has
        // none, so its status and buttons stay in theirs.
        <ItemMeta
          key={index}
          align={metaAlign?.[index] ?? "start"}
          className="max-sm:hidden"
        >
          {conversation.meta?.[index]}
        </ItemMeta>
      ))}
      {end && (
        // Above the link's area.
        <ItemActions>
          {conversation.status && (
            <ConversationStatusMark
              status={conversation.status}
              label={labels.status[conversation.status]}
            />
          )}
          {actions}
          {menu && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="touch-target relative"
                    aria-label={labels.conversationMenu(conversation.title)}
                  />
                }
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
            </DropdownMenu>
          )}
        </ItemActions>
      )}
    </Item>
  )
}

export {
  AgentAppConversationList,
  AgentAppConversations,
  AgentAppPage,
  type AgentAppPageBack,
  AgentAppProject,
  AgentAppProjectSection,
  type AgentAppProjectLabels,
}
