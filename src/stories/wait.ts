/**
 * Waits for play functions, each on a signal rather than a fixed time:
 * what is checked not to happen is checked once what could make it
 * happen is over.
 */

const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** The next animation frames, for what is driven by them. */
async function frames(count = 1) {
  for (let at = 0; at < count; at++) await frame()
}

/**
 * Once React has rendered what the events before it changed: a frame,
 * then a task after the one React's scheduler posted.
 */
async function rendered() {
  await frame()
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      resolve()
    }
    channel.port2.postMessage(null)
  })
}

type Options = {
  /** The frames in a row it must hold for. */
  frames?: number
  /** When it fails, still changing, in ms. */
  timeout?: number
}

/**
 * Once `read` has given the same value (as JSON) for some frames in a
 * row, e.g. a scroll position: to check something stays where it is,
 * once it has stopped moving. Frames while `busy()` holds (e.g. a
 * scroll of its own under way) do not count. Returns the value.
 */
async function settled<T>(
  read: () => T,
  {
    frames: count = 5,
    timeout = 3000,
    busy = () => false,
  }: Options & { busy?: () => boolean } = {}
) {
  const start = performance.now()
  let last = JSON.stringify(read())
  for (let same = 0; same < count;) {
    await frame()
    const now = JSON.stringify(read())
    if (now === last && !busy()) same++
    else [same, last] = [0, now]
    if (performance.now() - start > timeout)
      throw new Error(`Still changing after ${timeout}ms: ${now}`)
  }
  return read()
}

/**
 * The transition or animation running in `target`, in words; undefined if
 * none. Not endless ones (a spinner's), nor those driven by a scroll
 * rather than by time (a fade at a scroller's edge).
 */
function running(target: Element) {
  for (const animation of target.getAnimations({ subtree: true })) {
    if (animation.playState !== "running") continue
    if (animation.timeline !== document.timeline) continue
    if (animation.effect?.getComputedTiming().endTime === Infinity) continue
    return animation instanceof CSSTransition
      ? `a transition of ${animation.transitionProperty}`
      : animation instanceof CSSAnimation
        ? `the animation ${animation.animationName}`
        : "an animation"
  }
}

/** Whether a transition or an animation runs in `target`, but endless ones. */
const animating = (target: Element) => running(target) !== undefined

/** An element as the reader of a failure would find it. */
const named = (node: Node) =>
  node instanceof HTMLElement
    ? (node.dataset.slot ?? node.getAttribute("role") ?? node.localName)
    : node.nodeName

/**
 * Once nothing in `target` has changed for some frames in a row: no
 * change to its DOM, no scroll in it, no change of its size, no
 * transition or animation (but endless ones, a spinner's) running.
 */
async function quiet(
  target: Element,
  { frames: count = 5, timeout = 3000 }: Options = {}
) {
  // What changed last, to say if it goes on.
  let change: string | undefined
  const mutations = new MutationObserver((records) => {
    const { type, target, attributeName } = records.at(-1)!
    change = `${type} ${attributeName ?? ""} of ${named(target)}`
  })
  mutations.observe(target, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  })
  const sizes = new ResizeObserver(() => (change = "its size"))
  sizes.observe(target)
  const scrolled = (event: Event) =>
    (change = `a scroll of ${named(event.target as Node)}`)
  target.addEventListener("scroll", scrolled, { capture: true })
  const start = performance.now()
  try {
    for (let same = 0; same < count;) {
      await frame()
      change ??= running(target)
      if (change === undefined) same++
      else if (performance.now() - start > timeout)
        throw new Error(`Still changing after ${timeout}ms: ${change}`)
      else [change, same] = [undefined, 0]
    }
  } finally {
    mutations.disconnect()
    sizes.disconnect()
    target.removeEventListener("scroll", scrolled, { capture: true })
  }
}

/**
 * Runs `action`, then waits until the timers it set, and those they set,
 * have run or been cleared, and React has rendered what they changed:
 * e.g. a choice that goes on "a moment" after it is made. A timer longer
 * than `longest` ms (a clock's tick) is not waited for.
 */
async function timersRun(
  action: () => unknown,
  {
    longest = 1000,
    timeout = 3000,
  }: { longest?: number; timeout?: number } = {}
) {
  const set = window.setTimeout
  const clear = window.clearTimeout
  const pending = new Set<number>()
  let emptied = () => {}
  const done = (id: number) => {
    pending.delete(id)
    if (pending.size === 0) emptied()
  }
  window.setTimeout = ((
    handler: TimerHandler,
    delay = 0,
    ...rest: unknown[]
  ) => {
    if (typeof handler !== "function" || delay > longest)
      return set(handler, delay, ...rest)
    const id = set(() => {
      try {
        ;(handler as (...args: unknown[]) => void)(...rest)
      } finally {
        done(id)
      }
    }, delay)
    pending.add(id)
    return id
  }) as typeof window.setTimeout
  window.clearTimeout = ((id?: number) => {
    clear(id)
    if (id !== undefined && pending.has(id)) done(id)
  }) as typeof window.clearTimeout
  let limit = 0
  try {
    await action()
    const failed = new Promise<never>((_, reject) => {
      limit = set(
        () => reject(new Error(`Timers still pending after ${timeout}ms`)),
        timeout
      )
    })
    while (pending.size)
      await Promise.race([
        new Promise<void>((resolve) => (emptied = resolve)),
        failed,
      ])
  } finally {
    clear(limit)
    window.setTimeout = set
    window.clearTimeout = clear
  }
  await rendered()
}

export { animating, frames, quiet, rendered, settled, timersRun }
