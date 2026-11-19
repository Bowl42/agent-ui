/**
 * An element's `transition-property` where the reader prefers reduced
 * motion, read from the page's style sheets, as the browser under test
 * has no such preference; undefined if no rule for it sets one.
 */
export function reducedMotionTransition(element: Element) {
  return reducedMotion(element, "transitionProperty")
}

/**
 * An element's `transition-duration` where the reader prefers reduced
 * motion, as `reducedMotionTransition` reads it: "0s" where the theme's
 * motion utilities (motion-size, motion-fade) stop it.
 */
export function reducedMotionDuration(element: HTMLElement) {
  const duration = reducedMotion(element, "transitionDuration")
  if (duration !== undefined) return duration
  // Else its own rules' timing, with the custom properties the page sets
  // there: the theme's --motion-fade and --motion-size are 0s.
  const properties = reducedCustomProperties()
  const before = element.style.cssText
  for (const [name, value] of properties) element.style.setProperty(name, value)
  const computed = getComputedStyle(element).transitionDuration
  element.style.cssText = before
  return computed
}

/**
 * An element's `animation-name` where the reader prefers reduced motion,
 * as `reducedMotionTransition` reads it: "none" where the theme stops it.
 */
export function reducedMotionAnimation(element: Element) {
  return reducedMotion(element, "animationName")
}

/** The custom properties the root takes where the reader prefers less motion. */
export function reducedCustomProperties() {
  const properties = new Map<string, string>()
  const visit = (rules: CSSRuleList, reduced: boolean) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule)
        visit(
          rule.cssRules,
          reduced || rule.conditionText.includes("prefers-reduced-motion")
        )
      else if (rule instanceof CSSStyleRule) {
        if (reduced && document.documentElement.matches(rule.selectorText))
          for (const name of Array.from(rule.style))
            if (name.startsWith("--"))
              properties.set(name, rule.style.getPropertyValue(name))
      } else if ("cssRules" in rule)
        visit((rule as CSSGroupingRule).cssRules, reduced)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules, false)
    } catch {
      // Another origin's.
    }
  }
  return properties
}

function reducedMotion(
  element: Element,
  name: "transitionProperty" | "transitionDuration" | "animationName"
) {
  let property: string | undefined
  const take = (style: CSSStyleDeclaration, selector: string) => {
    if (!style[name]) return
    try {
      if (element.matches(selector)) property = style[name]
    } catch {
      // A selector this browser does not take.
    }
  }
  const visit = (rules: CSSRuleList, reduced: boolean, parent: string) => {
    for (const rule of Array.from(rules)) {
      // Declarations nested in a media rule, in a style rule: the parent's.
      if (
        !(rule instanceof CSSStyleRule) &&
        "style" in rule &&
        reduced &&
        parent
      )
        take((rule as CSSRule & { style: CSSStyleDeclaration }).style, parent)
      else if (rule instanceof CSSMediaRule)
        visit(
          rule.cssRules,
          reduced || rule.conditionText.includes("prefers-reduced-motion"),
          parent
        )
      else if (rule instanceof CSSStyleRule) {
        const selector = parent
          ? rule.selectorText.replaceAll("&", parent)
          : rule.selectorText
        if (reduced) take(rule.style, selector)
        visit(rule.cssRules, reduced, selector)
      } else if ("cssRules" in rule)
        visit((rule as CSSGroupingRule).cssRules, reduced, parent)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules, false, "")
    } catch {
      // Another origin's.
    }
  }
  return property
}
