export { nextZoom, zoomSteps }

/** The zoom steps viewers and the image editor share: 1 is its own size. */
const zoomSteps = [
  0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16, 20,
]

// A step nearer than this, by its ratio, is passed over: from a fitted
// 72%, 75% would hardly change it, only push its edges out of sight.
const least = 1.2

/**
 * The next zoom step in or out from this one, at least a fifth larger or
 * smaller, from `min` to `max` (a viewer's: 10% to 800%).
 */
function nextZoom(
  zoom: number,
  direction: 1 | -1,
  { min = 0.1, max = 8 }: { min?: number; max?: number } = {}
) {
  const steps = zoomSteps.filter(
    (step) => step >= min - 1e-6 && step <= max + 1e-6
  )
  if (direction < 0) steps.reverse()
  return (
    steps.find((step) =>
      direction > 0
        ? step >= zoom * least - 1e-6
        : step <= zoom / least + 1e-6
    ) ?? steps.at(-1)!
  )
}
