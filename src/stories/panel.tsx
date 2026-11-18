import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

/**
 * A viewer as in the panel beside a conversation: its size there (600 by
 * 670 under the panel's tabs), to its edges, as the panel shows it.
 */
export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-167.5 w-150 max-w-full overflow-hidden">{children}</div>
  )
}

/** An app's items in a viewer's More (`menu`), as every panel has them. */
export function PanelMenu() {
  return (
    <>
      <DropdownMenuItem>Open in a new window</DropdownMenuItem>
      <DropdownMenuItem>Copy path</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Show in Files</DropdownMenuItem>
    </>
  )
}
