import { expect, screen, userEvent, waitFor, within } from "storybook/test"

/** A viewer's zoom, its percent's button in its toolbar: "Zoom 100%". */
const zoomButton = (scope: HTMLElement) =>
  within(scope).getByRole("button", { name: /^Zoom \d+%$/ })

/** Opens a menu by its button, acts in it, and sees it closed again. */
async function inMenu<T>(
  button: HTMLElement,
  act: (menu: HTMLElement) => Promise<T> | T
) {
  await userEvent.click(button)
  const menu = await screen.findByRole("menu")
  await waitFor(() => expect(menu).toBeVisible())
  const result = await act(menu)
  if (screen.queryByRole("menu")) await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
  return result
}

/** Whether the viewer's zoom is Fit, as its menu says. */
export const isFitted = (scope: HTMLElement) =>
  inMenu(
    zoomButton(scope),
    (menu) =>
      within(menu)
        .getByRole("menuitemradio", { name: "Fit" })
        .getAttribute("aria-checked") === "true"
  )

/** Fits it, by its zoom's menu. */
export const fit = (scope: HTMLElement) =>
  inMenu(zoomButton(scope), (menu) =>
    userEvent.click(within(menu).getByRole("menuitemradio", { name: "Fit" }))
  )

/** Zooms it in a step, by its zoom's menu. */
export const zoomIn = (scope: HTMLElement) =>
  inMenu(zoomButton(scope), (menu) =>
    userEvent.click(within(menu).getByRole("menuitem", { name: /^Zoom in/ }))
  )

/** What it is, at the top of its More menu: "PNG · 412 KB". */
export const factsOf = (scope: HTMLElement) =>
  inMenu(
    within(scope).getAllByRole("button", { name: "More" }).at(-1)!,
    (menu) =>
      menu.querySelector("[data-slot=viewer-menu-facts]")?.textContent ?? ""
  )

/** The zoom's percent as its button says it: "Zoom 100%". */
export const zoomOf = (scope: HTMLElement) =>
  within(scope)
    .getByRole("button", { name: /^Zoom \d+%$/ })
    .getAttribute("aria-label")
