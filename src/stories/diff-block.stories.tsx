import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { DiffBlock } from "@/components/diff-block"
import { CodeBlockCopyButton } from "@/components/ui/code-block"
import { parseUnifiedDiff } from "@/lib/unified-diff"

import { foldedLines, insideBorder } from "./code-fold"

const patch = `diff --git a/src/images.ts b/src/images.ts
index 3b18e51..a9c5d2f 100644
--- a/src/images.ts
+++ b/src/images.ts
@@ -1,5 +1,6 @@ import { hash } from "./hash"
 import { hash } from "./hash"

 export function cacheKey(image: Image) {
-  return image.path + Date.now()
+  const key = hash(image.content)
+  return key
 }
@@ -20,3 +21,3 @@ export function evict(key: string) {
   cache.delete(key)
-  log("evicted", key)
+  log("evicted", { key })
 }
diff --git a/src/old-name.ts b/src/lib/cache.ts
similarity index 100%
rename from src/old-name.ts
rename to src/lib/cache.ts
diff --git a/public/logo.png b/public/logo.png
index 1..2 100644
Binary files a/public/logo.png and b/public/logo.png differ
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-# Images
\\ No newline at end of file
+# Images and their cache
\\ No newline at end of file
`

const meta = {
  title: "Components/Diff Block",
  component: DiffBlock,
  decorators: [
    (Story) => (
      <div className="w-xl max-w-full">
        <Story />
      </div>
    ),
  ],
  args: { diff: patch },
} satisfies Meta<typeof DiffBlock>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A unified diff's text, as git writes it: a code block for each file,
 * its name and what it adds and removes in the header; a renamed file
 * says both names, a binary one says so.
 */
export const Text: Story = {
  play: async ({ canvas }) => {
    const images = canvas.getByRole("group", { name: "src/images.ts" })
    await expect(images).toHaveTextContent("+3 −2")
    const lines = images.querySelectorAll("[data-slot=code-block-line]")
    // Each hunk under its header; the lines in the code block's variants.
    await expect(
      Array.from(lines).filter((line) => line.textContent.startsWith("@@ "))
    ).toHaveLength(2)
    await expect(
      within(images).getByText("return image.path + Date.now()", {
        exact: false,
      }).parentElement
    ).toHaveAttribute("data-variant", "removed")
    await expect(
      within(images).getByText("const key = hash(image.content)", {
        exact: false,
      }).parentElement
    ).toHaveAttribute("data-variant", "added")
    await expect(
      canvas.getByRole("group", {
        name: "src/old-name.ts → src/lib/cache.ts",
      })
    ).toHaveTextContent("No lines changed")
    await expect(
      canvas.getByRole("group", { name: "public/logo.png" })
    ).toHaveTextContent("Binary file")
    await expect(
      canvas.getByRole("group", { name: "README.md" })
    ).toHaveTextContent("+1 −1")
  },
}

/**
 * The files `parseUnifiedDiff` read, e.g. once for a diff shown in
 * several places; small, wrapped, with a copy button for each file.
 */
export const Parsed: Story = {
  args: {
    diff: parseUnifiedDiff(patch).slice(0, 1),
    size: "sm",
    wrap: true,
    actions: (file) => (
      <CodeBlockCopyButton
        value={file.hunks
          .flatMap((hunk) => hunk.lines)
          .filter((line) => line.type !== "removed")
          .map((line) => line.text)
          .join("\n")}
      />
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("group")).toHaveLength(1)
    await expect(canvas.getByRole("button", { name: "Copy" })).toBeVisible()
    await expect(
      canvas.getByRole("group", { name: "src/images.ts" })
    ).toHaveTextContent("+3 −2")
  },
}

// A file's two hunks: 9 lines, then an @@ line among the first twelve,
// then 13 more.
const long = [
  "--- a/vite.config.ts",
  "+++ b/vite.config.ts",
  "@@ -1,6 +1,7 @@",
  ' import { defineConfig } from "vite"',
  ' import react from "@vitejs/plugin-react"',
  '-import legacy from "@vitejs/plugin-legacy"',
  '+import tailwindcss from "@tailwindcss/vite"',
  '+import { visualizer } from "rollup-plugin-visualizer"',
  " ",
  " export default defineConfig({",
  "-  plugins: [react(), legacy()],",
  "+  plugins: [react(), tailwindcss(), visualizer()],",
  "@@ -14,7 +15,10 @@ export default defineConfig({",
  "   build: {",
  "-    target: 'es2015',",
  "+    target: 'es2022',",
  "-    rollupOptions: { output: { inlineDynamicImports: true } },",
  "-    cssCodeSplit: false,",
  "+    rollupOptions: {",
  '+      output: { manualChunks: { vendor: ["react", "react-dom"] } },',
  "+    },",
  "+    cssCodeSplit: true,",
  "+    sourcemap: true,",
  "   },",
  "   server: { port: 5173 },",
  " })",
].join("\n")

/**
 * With `lines`, a long file folds in its own block: twelve lines of code
 * whole (its @@ lines not counted), fading out, and the bar across its
 * foot, in the app's words.
 */
export const Fold: Story = {
  args: {
    diff: long,
    lines: 12,
    labels: {
      more: "Alles anzeigen",
      less: "Weniger anzeigen",
      lines: (lines) => `(${lines} Zeilen)`,
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const bar = await canvas.findByRole("button", {
      name: "Alles anzeigen (22 Zeilen)",
    })
    await expect(block).toHaveAttribute("data-fold", "closed")
    await expect(foldedLines(block)).toMatchObject({
      whole: 12,
      cut: 0,
      hunkCut: false,
    })
    await expect(insideBorder(bar, block)).toBe(true)
    await expect(bar.getBoundingClientRect().bottom).toBeCloseTo(
      block.getBoundingClientRect().bottom - 1,
      0
    )
    await userEvent.click(bar)
    await expect(bar).toHaveAccessibleName("Weniger anzeigen (22 Zeilen)")
    await expect(foldedLines(block)).toMatchObject({ whole: 22, cut: 0 })
    await userEvent.click(canvas.getByRole("button", { name: "Collapse" }))
    await expect(block).toHaveAttribute("data-fold", "closed")
  },
}

/**
 * Folded, only the lines it shows are rendered; the rest, a later hunk's
 * @@ line too, is one plain text, hidden until found, and counted
 * without its @@ lines. Open, every line is a line again.
 */
export const FoldRest: Story = {
  args: { diff: long, lines: 5 },
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const lines = () =>
      block.querySelectorAll(
        "[data-slot=code-block-line]:not([data-diff=hunk])"
      )
    const bar = await canvas.findByRole("button", { name: "Show all 22 lines" })
    await expect(lines()).toHaveLength(5)
    const rest = block.querySelector("[data-slot=code-block-rest]")!
    await expect(rest).toHaveAttribute("hidden", "until-found")
    await expect(rest.textContent).toContain("@@ -14,7 +15,10 @@")
    await expect(rest.textContent).toContain("server: { port: 5173 },")
    await expect(foldedLines(block)).toMatchObject({ whole: 5, cut: 0 })
    await userEvent.click(bar)
    await expect(lines()).toHaveLength(22)
    await expect(block.querySelector("[data-slot=code-block-rest]")).toBeNull()
    await expect(foldedLines(block)).toMatchObject({ whole: 22, cut: 0 })
  },
}

/** Small and wrapped, a long line counts each line it takes. */
export const FoldWrapped: Story = {
  args: { diff: long, lines: 12, size: "sm", wrap: true },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const block = canvasElement.querySelector<HTMLElement>(
      "[data-slot=code-block]"
    )!
    const bar = await canvas.findByRole("button", { name: "Show all 22 lines" })
    await expect(foldedLines(block)).toMatchObject({
      whole: 12,
      cut: 0,
      hunkCut: false,
    })
    // Small: a 32px bar, as its header.
    await expect(bar.getBoundingClientRect().height).toBe(32)
  },
}

/** Several files fold each in its own block. */
export const FoldEach: Story = {
  args: { diff: `${long}\n${patch}`, lines: 12 },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findAllByRole("button", { name: /^Show all/ })
    ).toHaveLength(1)
    await expect(
      canvas.getByRole("group", { name: "src/images.ts" })
    ).not.toHaveAttribute("data-fold")
  },
}
