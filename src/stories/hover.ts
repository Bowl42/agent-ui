/**
 * What the page's style sheets declare for an element while it is
 * hovered, by property: a script's events cannot hover it.
 */
export function hoverStyle(element: Element) {
  // The pseudo-class, not a class named after it (`hover\:…`).
  const hover = /(?<!\\):hover/
  const declared: Record<string, string> = {}
  const take = (style: CSSStyleDeclaration) => {
    for (const property of Array.from(style))
      declared[property] = style.getPropertyValue(property)
  }
  const visit = (rules: CSSRuleList, parent: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const selector = parent
          ? rule.selectorText.replaceAll("&", parent)
          : rule.selectorText
        if (hover.test(selector)) {
          try {
            if (element.matches(selector.replace(hover, ""))) take(rule.style)
          } catch {
            // A selector this browser does not take.
          }
        }
        visit(rule.cssRules, selector)
      } else if (
        // Declarations in a rule nested in another (e.g. its @media).
        hover.test(parent) &&
        "style" in rule &&
        !("selectorText" in rule)
      ) {
        try {
          if (element.matches(parent.replace(hover, "")))
            take((rule as CSSRule & { style: CSSStyleDeclaration }).style)
        } catch {
          // As above.
        }
      } else if ("cssRules" in rule)
        visit((rule as CSSGroupingRule).cssRules, parent)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules, "")
    } catch {
      // Another origin's.
    }
  }
  return declared
}
