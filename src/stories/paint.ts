/** Colours as the screen shows them, for stories that check a look. */

const canvas = document.createElement("canvas")
canvas.width = canvas.height = 1
const context = canvas.getContext("2d", { willReadFrequently: true })!

type Rgb = [number, number, number]

/**
 * The sRGB pixel an element's background is: its own, over each of its
 * ancestors' (tints are see-through), on white.
 */
function painted(element: Element): Rgb {
  const layers: string[] = []
  for (let at: Element | null = element; at; at = at.parentElement)
    layers.unshift(getComputedStyle(at).backgroundColor)
  context.globalAlpha = 1
  context.fillStyle = "#fff"
  context.fillRect(0, 0, 1, 1)
  for (const layer of layers) {
    context.fillStyle = "transparent"
    context.fillStyle = layer
    context.fillRect(0, 0, 1, 1)
  }
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!]
}

/** How far apart two colours are, in sRGB units (0 to 441). */
function distance(a: Rgb, b: Rgb) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** A CSS colour (e.g. `var(--success)`) as computed in a scope. */
function resolved(scope: Element, color: string) {
  const probe = document.createElement("span")
  probe.style.color = color
  scope.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

/** The sRGB pixel a CSS colour, maybe see-through, paints on another. */
function over(color: string, background: Rgb): Rgb {
  context.globalAlpha = 1
  context.fillStyle = `rgb(${background.join(" ")})`
  context.fillRect(0, 0, 1, 1)
  context.fillStyle = "transparent"
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!]
}

/** WCAG's contrast ratio of two sRGB pixels. */
function contrast(a: Rgb, b: Rgb) {
  const luminance = (rgb: Rgb) => {
    const [r, g, bl] = rgb.map((c) => {
      const s = c / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!
  }
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export { contrast, distance, over, painted, resolved }
