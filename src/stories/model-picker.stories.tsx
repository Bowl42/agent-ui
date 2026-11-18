import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiBrain01Icon,
  AiImageIcon,
  Route01Icon,
  Settings02Icon,
  SparklesIcon,
  TextIcon,
  Video01Icon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import {
  Composer,
  ComposerEditor,
  ComposerSubmit,
  ComposerToolbar,
} from "@/components/composer"
import { composerSelectRow } from "@/components/composer-select"
import {
  EffortSlider,
  ModelPicker,
  type ModelEffort,
  type ModelCustomPlace,
  type ModelGroup,
  type ModelOption,
  type ModelPickerPage,
  type ModelPurpose,
} from "@/components/model-picker"
import { quiet, settled } from "@/stories/wait"

const steps = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "max", label: "Max" },
]

/** OpenRouter's long tail: shown six at a time, found by typing. */
const more: ModelOption[] = [
  "mistral-large-3",
  "mistral-small-4",
  "codestral-3",
  "gemma-4-27b",
  "gemma-4-9b",
  "phi-5",
  "phi-5-mini",
  "command-r3",
  "command-a2",
  "yi-2-large",
  "olmo-3-32b",
  "nemotron-5",
  "jamba-2",
  "granite-4",
  "hermes-5-70b",
  "dolphin-4",
  "qwen-4-72b",
  "qwen-4-32b",
  "qwen-4-14b",
  "deepseek-v4-lite",
  "kimi-k3-mini",
  "glm-5-air",
  "llama-5-70b",
  "llama-5-8b",
  "minimax-m3",
  "ernie-6",
  "step-3",
  "doubao-2-pro",
  "hunyuan-t2",
  "lumen-3",
  "reka-core-2",
  "arctic-2",
  "dbrx-2",
  "falcon-4",
].map((id) => ({ id, label: id, detail: "128k · $0.2" }))

const groups: ModelGroup[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    icon: <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />,
    models: [
      {
        id: "opus-5.5",
        label: "Opus 5.5",
        detail: "200k · $15",
        efforts: steps,
        defaultEffort: "medium",
      },
      {
        id: "sonnet-5.5",
        label: "Sonnet 5.5",
        detail: "1M · $3",
        efforts: steps.slice(1, 4),
        defaultEffort: "medium",
      },
      { id: "sonnet-5", label: "Sonnet 5", detail: "200k · $3" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    icon: <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />,
    models: [
      { id: "gpt-6", label: "gpt-6", detail: "400k · $10" },
      { id: "gpt-6-mini", label: "gpt-6-mini", detail: "400k · $1" },
      { id: "gpt-6-nano", label: "gpt-6-nano", detail: "400k · $0.2" },
      { id: "o5", label: "o5", detail: "200k · $8" },
      { id: "o5-mini", label: "o5-mini", detail: "200k · $1.1" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    icon: <HugeiconsIcon icon={Route01Icon} strokeWidth={2} />,
    models: [
      {
        id: "deepseek-v4",
        label: "deepseek-v4",
        detail: "128k · $0.27",
        badge: "OpenRouter",
      },
      { id: "deepseek-r2", label: "deepseek-r2", detail: "128k · $0.55" },
      {
        id: "qwen-4-coder",
        label: "qwen-4-coder",
        detail: "256k · free",
        badge: "no tools",
      },
      { id: "kimi-k3", label: "kimi-k3", detail: "256k · $0.6" },
      { id: "glm-5", label: "glm-5", detail: "200k · $0.4" },
      { id: "llama-5-405b", label: "llama-5-405b", detail: "128k · $0.8" },
      {
        id: "crimson-coder-32b",
        label: "crimson-coder-32b",
        detail: "32k · $0.1",
      },
      ...more,
    ],
  },
]

const icon = (glyph: typeof TextIcon) => (
  <HugeiconsIcon icon={glyph} strokeWidth={2} />
)

const initialPurposes: ModelPurpose[] = [
  {
    id: "images",
    label: "Images",
    icon: icon(AiImageIcon),
    value: "gpt-image-2",
    models: [
      { id: "gpt-image-2", label: "gpt-image-2", detail: "$0.04" },
      { id: "flux-2-pro", label: "flux-2-pro", detail: "$0.05" },
      { id: "imagen-4", label: "imagen-4", detail: "$0.04" },
    ],
    settings: [
      {
        id: "aspect",
        label: "Aspect",
        value: "3:2",
        options: ["1:1", "3:2", "16:9", "9:16"].map((value) => ({
          value,
          label: value,
        })),
      },
      {
        id: "size",
        label: "Size",
        value: "2k",
        options: [
          { value: "1k", label: "1K" },
          { value: "2k", label: "2K", hint: "Default" },
          { value: "4k", label: "4K" },
        ],
      },
    ],
    note: "About $0.06 an image.",
  },
  {
    id: "video",
    label: "Video",
    icon: icon(Video01Icon),
    value: "veo-3",
    models: [{ id: "veo-3", label: "veo-3", detail: "$0.40/s" }],
  },
  {
    id: "speech",
    label: "Speech",
    icon: icon(VolumeHighIcon),
    value: "eleven-v3",
    models: [{ id: "eleven-v3", label: "eleven-v3" }],
  },
  {
    id: "transcription",
    label: "Transcription",
    icon: icon(TextIcon),
    value: "whisper-3",
    models: [{ id: "whisper-3", label: "whisper-3" }],
  },
]

const oneGroup: ModelGroup = {
  id: "claude",
  label: "Claude 5",
  models: [
    ...groups[0]!.models,
    { id: "haiku-5.5", label: "Haiku 5.5", detail: "200k · $1" },
  ],
}

type DemoProps = {
  groups?: ModelGroup[]
  recent?: string[]
  initialModel?: string
  showGroupIcon?: boolean
  /** Whether a model id can be typed in (`onCustomModel`). */
  custom?: boolean
  /** A field for it at the list's bottom. */
  customInput?: boolean
  /** Pages of further groups. */
  pages?: ModelPickerPage[]
  /** The app fetching its models. */
  loading?: boolean
  /** The app's own: at the button's end, over the search. */
  triggerEnd?: React.ReactNode
  header?: React.ReactNode
  onValueChange: (id: string) => void
  onEffortChange: (effort: string) => void
  onPurposeChange: (purpose: string, model: string) => void
  onManage: () => void
  onCustomModel: (id: string, place: ModelCustomPlace) => void
  onEndpoints: () => void
  onPageChange?: (page: string | null) => void
}

/** A composer with the picker in its toolbar; the app keeps the choice. */
function Demo({
  groups: modelGroups = groups,
  recent = ["opus-5.5", "sonnet-5.5", "deepseek-v4"],
  initialModel = "opus-5.5",
  showGroupIcon = false,
  custom = true,
  customInput = false,
  pages,
  loading = false,
  triggerEnd,
  header,
  onValueChange,
  onEffortChange,
  onPurposeChange,
  onManage,
  onCustomModel,
  onEndpoints,
  onPageChange,
}: DemoProps) {
  const [model, setModel] = React.useState(initialModel)
  const [effort, setEffort] = React.useState<string | null>("high")
  const [purposes, setPurposes] = React.useState(initialPurposes)
  return (
    <div className="flex w-2xl max-w-full flex-col pt-96">
      <Composer>
        <ComposerEditor aria-label="Message" placeholder="Ask anything" />
        <ComposerToolbar>
          <ModelPicker
            groups={modelGroups}
            {...(pages ? { pages } : {})}
            {...(onPageChange ? { onPageChange } : {})}
            customInput={customInput}
            recent={recent}
            groupLimit={6}
            showGroupIcon={showGroupIcon}
            value={model}
            onValueChange={(id) => {
              onValueChange(id)
              setModel(id)
              setEffort(null)
            }}
            effort={effort}
            onEffortChange={(next) => {
              onEffortChange(next)
              setEffort(next)
            }}
            purposes={purposes}
            onPurposeChange={(purpose, id) => {
              onPurposeChange(purpose, id)
              setPurposes((current) =>
                current.map((item) =>
                  item.id === purpose ? { ...item, value: id } : item
                )
              )
            }}
            onPurposeSettingChange={(purpose, setting, value) =>
              setPurposes((current) =>
                current.map((item) =>
                  item.id === purpose
                    ? {
                        ...item,
                        settings: item.settings?.map((entry) =>
                          entry.id === setting ? { ...entry, value } : entry
                        ),
                      }
                    : item
                )
              )
            }
            onManage={onManage}
            loading={loading}
            triggerEnd={triggerEnd}
            header={header}
            shortcut="⌘M"
            {...(custom
              ? {
                  onCustomModel: (id: string, place: ModelCustomPlace) => {
                    onCustomModel(id, place)
                    setModel(id)
                  },
                }
              : {})}
          >
            <button
              type="button"
              className={composerSelectRow}
              onClick={onEndpoints}
            >
              <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
              Manage endpoints
            </button>
          </ModelPicker>
          <ComposerSubmit className="ms-auto" />
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

const meta = {
  title: "Components/Model Picker",
  component: Demo,
  parameters: { layout: "centered" },
  args: {
    onValueChange: fn(),
    onEffortChange: fn(),
    onPurposeChange: fn(),
    onManage: fn(),
    onCustomModel: fn(),
    onEndpoints: fn(),
  },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

async function openPicker(canvas: ReturnType<typeof within>) {
  await userEvent.click(
    canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
  )
  // Once it has opened: typed into or measured mid-animation, it is not
  // yet where it will be.
  await quiet(await screen.findByRole("dialog"))
  const search = screen.getByRole("combobox", { name: "Search models" })
  await waitFor(() => expect(search).toHaveFocus())
  return search
}

/** Escape closes the picker, focus back on its trigger. */
async function closePicker(canvas: ReturnType<typeof within>) {
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  await waitFor(() =>
    expect(
      canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
    ).toBeVisible()
  )
}

/**
 * The trigger says the model and its thinking step; the list has recent
 * models first, the selected one checked and a step bolder, then every
 * model by group with how many it has.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await openPicker(canvas)
    const rail = screen.getByRole("tablist", { name: "Model groups" })
    await expect(
      within(rail)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual(["Recent", "Anthropic", "OpenAI", "OpenRouter"])
    await expect(
      within(rail).getByRole("tab", { name: "Anthropic" })
    ).toHaveAttribute("aria-selected", "true")
    const pane = within(screen.getByRole("tabpanel"))
    await expect(pane.getAllByRole("option")).toHaveLength(3)
    await expect(pane.getByRole("option", { name: /^Opus/ })).toHaveAttribute(
      "data-checked",
      "true"
    )
    // A row is its name and tick: its details show on the highlighted
    // row only, still in every row's name.
    const detailOf = (name: RegExp) =>
      pane
        .getByRole("option", { name })
        .querySelector("[data-slot=model-picker-detail]")!
    await expect(
      pane.getByRole("option", { name: /^Sonnet 5\.5/ })
    ).toHaveAccessibleName(/1M · \$3/)
    await waitFor(() =>
      expect(getComputedStyle(detailOf(/^Sonnet 5\.5/)).opacity).toBe("0")
    )
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(getComputedStyle(detailOf(/^Sonnet 5\.5/)).opacity).toBe("1")
    )
    // Manage models is the last row; no line of keys.
    await expect(
      screen.getByRole("button", { name: "Manage models" })
    ).toHaveAttribute("data-slot", "model-picker-manage")
    await expect(screen.queryByText(/↑↓/)).toBeNull()
    await closePicker(canvas)
  },
}

/**
 * While the app fetches its models, a row under the list says so, with a
 * spinner, as tall as the rows by it; searching too.
 */
export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvas }) => {
    const search = await openPicker(canvas)
    const loading = document.querySelector<HTMLElement>(
      "[data-slot=model-picker-loading]"
    )!
    await expect(loading).toHaveAttribute("role", "status")
    await expect(loading).toHaveTextContent("Refreshing models…")
    await expect(loading.querySelector("[data-slot=spinner]")).not.toBeNull()
    // Its text where the rows' is, as tall as they are.
    const manage = screen.getByRole("button", { name: "Manage models" })
    const textOf = (element: Element) => {
      const range = document.createRange()
      range.selectNodeContents(element.lastChild!)
      return range.getBoundingClientRect()
    }
    await expect(Math.round(loading.getBoundingClientRect().height)).toBe(
      Math.round(manage.getBoundingClientRect().height)
    )
    await expect(
      Math.abs(
        textOf(loading).left - textOf(manage.querySelector("span")!).left
      )
    ).toBeLessThanOrEqual(1)
    // Still there while searching.
    await userEvent.type(search, "son")
    await expect(
      document.querySelector("[data-slot=model-picker-loading]")
    ).toBeVisible()
    await closePicker(canvas)
  },
}

const fewGroups: ModelGroup[] = [
  groups[0]!,
  { ...groups[1]!, models: groups[1]!.models.slice(0, 3) },
]

/**
 * Few models (`searchFrom`, 10 by default): one list under their groups'
 * names, no search and no rail; focus on the list, on the chosen model.
 * The arrows move, ←→ change the thinking, Enter chooses.
 */
export const FewModels: Story = {
  args: { groups: fewGroups, custom: false },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
    )
    const list = await screen.findByRole("listbox", { name: "Model" })
    await waitFor(() => expect(list).toHaveFocus())
    await expect(screen.queryByRole("combobox")).toBeNull()
    await expect(screen.queryByRole("tablist")).toBeNull()
    await waitFor(() =>
      expect(screen.getByText("Anthropic", { exact: true })).toBeVisible()
    )
    await waitFor(() =>
      expect(screen.getByText("OpenAI", { exact: true })).toBeVisible()
    )
    const opus = within(list).getByRole("option", { name: /^Opus 5\.5/ })
    await waitFor(() => expect(opus).toHaveAttribute("aria-selected", "true"))
    await expect(list).toHaveAttribute("aria-activedescendant", opus.id)
    await userEvent.keyboard("{ArrowLeft}")
    await expect(args.onEffortChange).toHaveBeenCalledWith("medium")
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("gpt-6")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

/**
 * Off the model's default, a button by the thinking step puts it back;
 * at the default, none.
 */
export const ThinkingReset: Story = {
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    const reset = screen.getByRole("button", {
      name: "Back to the default, Medium",
    })
    await userEvent.click(reset)
    await expect(args.onEffortChange).toHaveBeenCalledWith("medium")
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /^Back to the default/ })
      ).toBeNull()
    )
    await expect(
      screen.getByRole("slider", { name: "Thinking" })
    ).toHaveAttribute("aria-valuetext", "Medium, the default")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Model: Opus 5.5 · Medium" })
      ).toBeVisible()
    )
  },
}

/**
 * With `showGroupIcon`, the trigger shows the chosen model's group's
 * mark before its name, as the rail does; a model of a group without one,
 * none.
 */
export const GroupIcon: Story = {
  args: { showGroupIcon: true },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", {
      name: "Model: Opus 5.5 · High",
    })
    // Anthropic's mark, then the name.
    await expect(trigger.querySelectorAll("svg")).toHaveLength(2)
    await expect(trigger.firstElementChild!.tagName.toLowerCase()).toBe("svg")
  },
}

/**
 * The panes are as tall as the tallest of the rail and the groups' lists,
 * here OpenRouter's six and how many more: shorter than the 320px cap,
 * and the same whichever group shows.
 */
export const PaneHeight: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas }) => {
    await openPicker(canvas)
    const panes = document.querySelector<HTMLElement>(
      "[data-slot=model-picker-panes]"
    )!
    const rail = screen.getByRole("tablist")
    const pane = screen.getByRole("tabpanel")
    for (const name of ["OpenAI", "OpenRouter", "Recent", "Anthropic"]) {
      await userEvent.click(screen.getByRole("tab", { name }))
      await waitFor(() =>
        expect(screen.getByRole("tab", { name })).toHaveAttribute(
          "aria-selected",
          "true"
        )
      )
      // As tall as the taller of the rail and this group's list, no
      // more: each fits without scrolling.
      // (offsetHeight: untouched by the popup's grow-in transform.)
      await expect(pane.scrollHeight).toBeLessThanOrEqual(pane.clientHeight + 1)
      await expect(rail.scrollHeight).toBeLessThanOrEqual(rail.clientHeight + 1)
      const list = pane.firstElementChild!.getBoundingClientRect().height
      await expect(panes.offsetHeight).toBeLessThanOrEqual(
        Math.max(rail.scrollHeight, list) + 8
      )
    }
    await closePicker(canvas)
  },
}

/** A group of the app's may be called "recent": it is not the Recent entry. */
export const GroupCalledRecent: Story = {
  tags: ["!autodocs"],
  args: {
    groups: [
      {
        id: "recent",
        label: "Recently added",
        models: [{ id: "nova-2", label: "nova-2", detail: "128k · $1" }],
      },
      groups[0]!,
    ],
    recent: ["sonnet-5.5"],
  },
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    const tabs = screen.getAllByRole("tab")
    await expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Recent",
      "Recently added",
      "Anthropic",
    ])
    await userEvent.click(screen.getByRole("tab", { name: "Recently added" }))
    await expect(
      screen.getByRole("tab", { name: "Recently added" })
    ).toHaveAttribute("aria-selected", "true")
    await expect(screen.getByRole("tab", { name: "Recent" })).toHaveAttribute(
      "aria-selected",
      "false"
    )
    const pane = within(screen.getByRole("tabpanel"))
    await expect(pane.getAllByRole("option")).toHaveLength(1)
    await userEvent.click(screen.getByRole("tab", { name: "Recent" }))
    await waitFor(() =>
      expect(
        within(screen.getByRole("tabpanel")).getByRole("option", {
          name: /^Sonnet 5\.5/,
        })
      ).toBeVisible()
    )
    await userEvent.click(screen.getByRole("tab", { name: "Recently added" }))
    await userEvent.click(
      await screen.findByRole("option", { name: /^nova-2/ })
    )
    await expect(args.onValueChange).toHaveBeenCalledWith("nova-2")
  },
}

/**
 * The slider shows the thinking of the model the keyboard or the search
 * is on, before it is chosen; a pointer passing over the rows puts back
 * the chosen model's.
 */
export const ThinkingFollowsHighlight: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas }) => {
    await openPicker(canvas)
    const slider = () => screen.getByRole("slider", { name: "Thinking" })
    // Opus 5.5, chosen: Off to Max.
    await expect(slider()).toHaveAttribute("max", "4")
    await userEvent.keyboard("son")
    // Sonnet 5.5, highlighted: Low to High.
    await waitFor(() => expect(slider()).toHaveAttribute("max", "2"))
    await expect(slider()).toHaveAttribute("aria-valuetext", "High")
    // Sonnet 5 has no thinking.
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.queryByRole("slider", { name: "Thinking" })).toBeNull()
    )
    await userEvent.hover(screen.getByRole("option", { name: /^Sonnet 5\.5/ }))
    await waitFor(() => expect(slider()).toHaveAttribute("max", "4"))
    await closePicker(canvas)
  },
}

/** Choosing a model closes the list; its thinking is its default. */
export const Choose: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.click(screen.getByRole("option", { name: /^Sonnet 5\.5/ }))
    await expect(args.onValueChange).toHaveBeenCalledWith("sonnet-5.5")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
    // Its own steps, at its default.
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Model: Sonnet 5.5 · Medium" })
      ).toBeVisible()
    )
  },
}

/**
 * Thinking: a slider of the model's named steps, a dot for each, its
 * default circled (and said, after its name).
 */
export const Thinking: Story = {
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    const slider = screen.getByRole("slider", { name: "Thinking" })
    await expect(slider).toHaveAttribute("aria-valuetext", "High")
    // One row: the heading (13px, in the text colour, weight 500), the
    // track and the step chosen on one line, 32px tall; no step names.
    const heading = screen.getByText("Thinking", { exact: true })
    const style = getComputedStyle(heading)
    await expect(style.fontSize).toBe("13px")
    await expect(style.fontWeight).toBe("500")
    await expect(style.color).toBe(
      getComputedStyle(screen.getByRole("dialog")).color
    )
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect()
      return box.top + box.height / 2
    }
    const track = slider.closest("[data-slot=slider]")!
    const chosen = document.querySelector("[data-slot=effort-slider-value]")!
    await expect(middle(track) - middle(heading)).toBeCloseTo(0, 0)
    await expect(middle(chosen) - middle(heading)).toBeCloseTo(0, 0)
    await expect(heading.parentElement!.getBoundingClientRect().height).toBe(32)
    await expect(screen.queryByText("Low", { exact: true })).toBeNull()
    slider.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await expect(args.onEffortChange).toHaveBeenCalledWith("medium")
    await waitFor(() =>
      expect(slider).toHaveAttribute("aria-valuetext", "Medium, the default")
    )
    await userEvent.keyboard("{End}")
    await waitFor(() => expect(slider).toHaveAttribute("aria-valuetext", "Max"))
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Model: Opus 5.5 · Max" })
      ).toHaveFocus()
    )
  },
}

/** From the list, ←→ change the thinking step; a screen reader hears it. */
export const ThinkingKeys: Story = {
  args: { groups: [oneGroup] },
  tags: ["!autodocs"],
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.keyboard("{ArrowRight}")
    await expect(args.onEffortChange).toHaveBeenCalledWith("max")
    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByRole("status")
      ).toHaveTextContent("Thinking: Max")
    )
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}")
    await expect(args.onEffortChange).toHaveBeenLastCalledWith("medium")
    // Typed, the arrows move the caret.
    await userEvent.keyboard("o{ArrowLeft}")
    await expect(args.onEffortChange).toHaveBeenCalledTimes(3)
  },
}

/** Typing searches every group; each result says its group, the count its end. */
export const Search: Story = {
  play: async ({ canvas }) => {
    await openPicker(canvas)
    await userEvent.keyboard("son")
    const list = screen.getByRole("listbox")
    await waitFor(() =>
      expect(within(list).getAllByRole("option")).toHaveLength(3)
    )
    await expect(within(list).getAllByRole("option")[2]).toHaveTextContent(
      "crimson-coder-32b32k · $0.1"
    )
    await waitFor(() => expect(screen.getByText("3 of 49")).toBeVisible())
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Anthropic" })).toBeVisible()
    )
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "OpenRouter" })).toBeVisible()
    )
    await expect(
      screen
        .getAllByRole("tab")
        .every((tab) => tab.getAttribute("aria-selected") === "false")
    ).toBe(true)
    await userEvent.clear(screen.getByRole("combobox"))
    await expect(
      screen.getByRole("tab", { name: "Anthropic" })
    ).toHaveAttribute("aria-selected", "true")
    await closePicker(canvas)
  },
}

/** Enter chooses the highlighted result. */
export const SearchChoose: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.keyboard("son")
    await waitFor(() =>
      expect(screen.getAllByRole("option", { name: /son/i })).toHaveLength(3)
    )
    await userEvent.keyboard("{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("sonnet-5.5")
  },
}

/**
 * With several groups, a rail beside the list: a click on a group shows
 * its models, its first six and how many more; one chosen closes it.
 */
export const Groups: Story = {
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.click(screen.getByRole("tab", { name: "OpenRouter" }))
    await expect(screen.getAllByRole("option")).toHaveLength(6)
    await waitFor(() =>
      expect(screen.getByText("35 more · type to search")).toBeVisible()
    )
    await userEvent.click(screen.getByRole("option", { name: /^deepseek-v4/ }))
    await expect(args.onValueChange).toHaveBeenCalledWith("deepseek-v4")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

const claudeIcon = <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />
const sectioned: ModelGroup[] = [
  {
    id: "official:claude",
    section: "Official",
    label: "Claude",
    icon: claudeIcon,
    models: groups[0]!.models,
  },
  {
    id: "official:gpt",
    section: "Official",
    label: "GPT",
    icon: <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />,
    models: groups[1]!.models,
  },
  {
    id: "local:claude",
    section: "Local proxy",
    label: "Claude",
    icon: claudeIcon,
    models: [{ id: "local-opus", label: "Opus 5.5 (local)" }],
  },
  {
    id: "local:deepseek",
    section: "Local proxy",
    label: "DeepSeek",
    models: [
      { id: "local-deepseek-v4", label: "deepseek-v4" },
      { id: "local-deepseek-r3", label: "deepseek-r3" },
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `local-deepseek-${index}`,
        label: `deepseek-mini-${index}`,
      })),
    ],
  },
]

/**
 * Families of several sources, each group's `section`: the rail's groups
 * under their source's name, each named by its family alone, said with
 * its source ("Local proxy · Claude"); the search's headings too, and a
 * source's name finds its models.
 */
export const Sections: Story = {
  args: { groups: sectioned, recent: [] },
  play: async ({ canvas }) => {
    const search = await openPicker(canvas)
    const rail = screen.getByRole("tablist", { name: "Model groups" })
    await expect(
      Array.from(rail.querySelectorAll("[data-slot=model-picker-section]")).map(
        (heading) => heading.textContent
      )
    ).toEqual(["Official", "Local proxy"])
    // Two families named Claude, told apart by their source.
    const local = within(rail).getByRole("tab", {
      name: "Local proxy · Claude",
    })
    await expect(local).toHaveTextContent(/^Claude$/)
    await expect(
      within(rail).getByRole("tab", { name: "Official · Claude" })
    ).toHaveAttribute("aria-selected", "true")
    await userEvent.click(local)
    await expect(screen.getByRole("tabpanel")).toHaveAccessibleName(
      "Local proxy · Claude"
    )
    // Its list named in the picker's words, not cmdk's "Suggestions".
    await expect(
      within(screen.getByRole("tabpanel")).getByRole("listbox")
    ).toHaveAccessibleName("Model")
    // Searched: under their source's and family's name; the source's
    // name finds them.
    await userEvent.type(search, "local proxy")
    await waitFor(() =>
      expect(screen.getByText("Local proxy · DeepSeek")).toBeVisible()
    )
    await expect(screen.getByText("Local proxy · Claude")).toBeVisible()
    await expect(screen.queryByText("Official · GPT")).toBeNull()
    await closePicker(canvas)
  },
}

/**
 * ← from an empty search goes to the rail, ↓ there changes the group,
 * → goes back to the search for ↓ and Enter; typing in the rail goes to
 * the search too.
 */
/**
 * The app's own in it: at the end of its button (a ring of a quota),
 * over its search (a header) and after a group's name, in the rail and
 * in the search's headings (a share used, in the warning colour).
 */
export const AppSlots: Story = {
  args: {
    groups: groups.map((group, index) =>
      index === 0
        ? {
            ...group,
            labelEnd: (
              <span data-testid="used" className="text-xs text-warning">
                82%
              </span>
            ),
          }
        : group
    ),
    triggerEnd: (
      <span
        data-testid="ring"
        aria-hidden="true"
        className="size-3 rounded-full border-2 border-warning"
      />
    ),
    header: <p className="px-3 py-2 text-xs">Usage this week</p>,
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", {
      name: "Model: Opus 5.5 · High",
    })
    const ring = within(trigger).getByTestId("ring")
    // After the model's name.
    await expect(
      within(trigger).getByText("Opus 5.5").compareDocumentPosition(ring) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    const search = await openPicker(canvas)
    // Over the search.
    const header = screen.getByText("Usage this week")
    await expect(header).toBeVisible()
    await expect(
      header.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    // After the group's name in the rail, and in its heading searched.
    const rail = screen.getByRole("tablist", { name: "Model groups" })
    await expect(
      within(rail).getByRole("tab", { name: /^Anthropic/ })
    ).toHaveTextContent(/^Anthropic82%$/)
    await userEvent.type(search, "opus")
    await waitFor(() =>
      expect(
        screen
          .getAllByTestId("used")
          .some((used) => used.closest("[cmdk-group-heading]"))
      ).toBe(true)
    )
    await closePicker(canvas)
  },
}

/** Each provider's own header, its plan and usage: the app's. */
const withHeaders = (list: ModelGroup[]) =>
  list.map((group) => ({
    ...group,
    header: <p className="text-xs">{`${group.label} plan · usage`}</p>,
  }))

/**
 * A group's own header over its models: its tab's pane, the one shown,
 * changing with the tab; not in a search's results.
 */
export const GroupHeaders: Story = {
  args: { groups: withHeaders(groups) },
  play: async ({ canvas }) => {
    const search = await openPicker(canvas)
    const panel = screen.getByRole("tabpanel")
    await expect(
      within(panel).getByText("Anthropic plan · usage")
    ).toBeVisible()
    await expect(screen.queryByText("OpenAI plan · usage")).toBeNull()
    // Over the models.
    const header = within(panel).getByText("Anthropic plan · usage")
    await expect(
      header.compareDocumentPosition(
        within(panel).getByRole("option", { name: /^Opus 5\.5/ })
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    await userEvent.click(
      within(screen.getByRole("tablist", { name: "Model groups" })).getByRole(
        "tab",
        { name: "OpenAI" }
      )
    )
    await expect(
      within(screen.getByRole("tabpanel")).getByText("OpenAI plan · usage")
    ).toBeVisible()
    await expect(screen.queryByText("Anthropic plan · usage")).toBeNull()
    // Searched: none.
    await userEvent.type(search, "o")
    await waitFor(() => expect(screen.queryByText(/plan · usage/)).toBeNull())
    await closePicker(canvas)
  },
}

/**
 * A pane as tall as its group's header and its models: a short group
 * shown whole, not scrolled to.
 */
export const GroupHeaderInItsPane: Story = {
  args: {
    groups: groups.slice(0, 3).map((group) => ({
      ...group,
      models: group.models.slice(0, 3),
      header: (
        <div className="border-b pb-1 text-xs">
          <p>{`${group.label} plan`}</p>
          <p>Usage this week</p>
          <p>Resets Monday</p>
        </div>
      ),
    })),
  },
  play: async ({ canvas }) => {
    await openPicker(canvas)
    const panel = screen.getByRole("tabpanel")
    await waitFor(() => {
      expect(within(panel).getByText("Anthropic plan")).toBeVisible()
      expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight + 1)
    })
    await userEvent.click(
      within(screen.getByRole("tablist", { name: "Model groups" })).getByRole(
        "tab",
        { name: "OpenAI" }
      )
    )
    await waitFor(() => {
      expect(within(panel).getByText("OpenAI plan")).toBeVisible()
      expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight + 1)
    })
    await closePicker(canvas)
  },
}

/** In a list of all its models: under each group's heading. */
export const GroupHeadersFlat: Story = {
  args: { groups: withHeaders(fewGroups), custom: false },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
    )
    const list = await screen.findByRole("listbox", { name: "Model" })
    for (const name of ["Anthropic", "OpenAI"]) {
      const header = await within(list).findByText(`${name} plan · usage`)
      // Once the popup has faded in.
      await waitFor(() => expect(header).toBeVisible())
      const heading = within(list).getByText(name, { exact: true })
      await expect(
        heading.compareDocumentPosition(header) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    }
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

export const GroupKeys: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas, args }) => {
    const search = await openPicker(canvas)
    await userEvent.keyboard("{ArrowLeft}")
    await expect(screen.getByRole("tab", { name: "Anthropic" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    await expect(screen.getByRole("tab", { name: "OpenAI" })).toHaveFocus()
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /^gpt-6 400k/ })).toBeVisible()
    )
    await userEvent.keyboard("{ArrowRight}")
    await expect(search).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("gpt-6-mini")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: gpt-6-mini" })
    )
    const reopened = await screen.findByRole("combobox", {
      name: "Search models",
    })
    await waitFor(() => expect(reopened).toHaveFocus())
    await userEvent.keyboard("{ArrowLeft}o5")
    await expect(reopened).toHaveValue("o5")
    await expect(reopened).toHaveFocus()
  },
}

/** It opens on the chosen model's group. */
export const ActiveOnOpen: Story = {
  tags: ["!autodocs"],
  args: { initialModel: "deepseek-v4" },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: deepseek-v4 OpenRouter" })
    )
    await expect(
      await screen.findByRole("tab", { name: "OpenRouter" })
    ).toHaveAttribute("aria-selected", "true")
    await expect(
      screen.getByRole("option", { name: /^deepseek-v4/ })
    ).toHaveAttribute("data-checked", "true")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

/**
 * The last row turns the popover to the models for images, video and
 * speech; each opens its own page, with its settings for this
 * conversation. Escape goes back a page.
 */
export const Purposes: Story = {
  play: async ({ canvas }) => {
    await openPicker(canvas)
    await waitFor(() => expect(document.getAnimations()).toHaveLength(0))
    const main = screen.getByRole("dialog").getBoundingClientRect()
    await userEvent.click(
      screen.getByRole("button", { name: /Images, video and speech/ })
    )
    const purposes = await screen.findByRole("list", {
      name: "Images, video and speech",
    })
    const images = within(purposes).getByRole("button", {
      name: "Images gpt-image-2",
    })
    await waitFor(() => expect(images).toHaveFocus())
    // Its rows inset 8px as the main list's, its note at their words' 16.
    // (Once the page has slid in.)
    const dialog = screen.getByRole("dialog")
    await waitFor(() => expect(document.getAnimations()).toHaveLength(0))
    // Once placed for its height.
    const popup = await settled(() => dialog.getBoundingClientRect())
    await expect(images.getBoundingClientRect().left - popup.left).toBe(8)
    const note = screen.getByText(/^What the agent uses when it makes/)
    await expect(note.getBoundingClientRect().left - popup.left).toBe(0)
    await expect(getComputedStyle(note).paddingLeft).toBe("16px")
    // The first row is highlighted on entering; the popup as wide, as
    // high as its rows.
    await expect(getComputedStyle(images).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)"
    )
    await expect(popup.width).toBe(main.width)
    await expect(popup.height).toBeLessThan(main.height)

    await userEvent.keyboard("{ArrowDown}")
    await expect(
      within(purposes).getByRole("button", { name: "Video veo-3" })
    ).toHaveFocus()
    await userEvent.keyboard("{ArrowUp}{Enter}")

    const models = await screen.findByRole("listbox", { name: "Images" })
    await waitFor(() =>
      expect(
        within(models).getByRole("option", { name: /gpt-image-2/ })
      ).toHaveFocus()
    )
    await expect(
      screen.getByRole("combobox", { name: "Aspect" })
    ).toHaveTextContent("3:2")
    await waitFor(() => expect(document.getAnimations()).toHaveLength(0))
    const purpose = await settled(() =>
      screen.getByRole("dialog").getBoundingClientRect()
    )
    // Another page, its bottom where it was: only its top moves.
    await expect(purpose.width).toBe(main.width)
    await expect(Math.abs(purpose.bottom - popup.bottom)).toBeLessThanOrEqual(1)

    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: "Images, video and speech" })
      ).toBeVisible()
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Search models" })
      ).toHaveFocus()
    )
    await closePicker(canvas)
  },
}

/** A purpose's model and settings change in place; the page stays. */
export const PurposeChoose: Story = {
  tags: ["!autodocs"],
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.click(
      screen.getByRole("button", { name: /Images, video and speech/ })
    )
    await userEvent.click(
      await screen.findByRole("button", { name: "Images gpt-image-2" })
    )
    const models = await screen.findByRole("listbox", { name: "Images" })
    await waitFor(() =>
      expect(
        within(models).getByRole("option", { name: /gpt-image-2/ })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(args.onPurposeChange).toHaveBeenCalledWith(
      "images",
      "flux-2-pro"
    )
    await expect(
      within(models).getByRole("option", { name: /flux-2-pro/ })
    ).toHaveAttribute("aria-selected", "true")
    await userEvent.click(screen.getByRole("combobox", { name: "Aspect" }))
    await userEvent.click(await screen.findByRole("option", { name: "16:9" }))
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Aspect" })
      ).toHaveTextContent("16:9")
    )
    // Closed: its list, unnamed as it goes, gone before the page is checked.
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "16:9" })).toBeNull()
    )
    // An option's hint, faint after its label in the list, not in the row.
    const size = screen.getByRole("combobox", { name: "Size" })
    await expect(size).toHaveTextContent(/^Size2K$/)
    await userEvent.click(size)
    const hinted = await screen.findByRole("option", { name: /^2K/ })
    await expect(hinted).toHaveTextContent("2KDefault")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: /^2K/ })).toBeNull()
    )
  },
}

const sixSteps: ModelEffort[] = [
  { value: "off", label: "Off" },
  { value: "minimal", label: "Minimal" },
  ...steps.slice(1),
]

/** A card as the picker's popover draws it. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-popover px-3.5 pt-1 pb-3 text-popover-foreground shadow-float">
      {children}
    </div>
  )
}

function EffortDemo() {
  const [all, setAll] = React.useState("high")
  const [own, setOwn] = React.useState("low")
  const [toggle, setToggle] = React.useState("on")
  const [fallback, setFallback] = React.useState("medium")
  return (
    <div className="flex w-100 flex-col gap-3.5">
      <Card>
        <EffortSlider
          efforts={sixSteps}
          value={all}
          defaultValue="medium"
          onValueChange={setAll}
          note="Only this conversation. The dashed tick is the model's default."
        />
      </Card>
      <Card>
        <EffortSlider
          efforts={steps.slice(1, 4)}
          value={own}
          defaultValue="medium"
          onValueChange={setOwn}
          note="Only the levels this model has."
        />
      </Card>
      <Card>
        <EffortSlider
          toggle
          efforts={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
          ]}
          value={toggle}
          onValueChange={setToggle}
          note="This model only turns thinking on or off."
        />
      </Card>
      <Card>
        <EffortSlider
          efforts={steps.slice(1, 4)}
          value={fallback}
          defaultValue="medium"
          onValueChange={setFallback}
          warning="You picked Max for this conversation; this model doesn't have it, so it runs at its default."
        />
      </Card>
    </div>
  )
}

/**
 * The thinking slider on its own: every step; only the model's own; a
 * switch for a model that only turns it on or off; a step it lacks.
 */
export const Effort: Story = {
  render: () => <EffortDemo />,
  play: async ({ canvas }) => {
    const [slider, , lacking] = canvas.getAllByRole("slider", {
      name: "Thinking",
    })
    await expect(slider).toHaveAttribute("aria-valuetext", "High")
    slider.focus()
    await userEvent.keyboard("{Home}{ArrowRight}")
    await expect(slider).toHaveAttribute("aria-valuetext", "Minimal")
    const toggle = canvas.getByRole("switch", { name: "Thinking" })
    await expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    await expect(toggle).not.toBeChecked()
    await expect(lacking).toHaveAttribute(
      "aria-valuetext",
      "Medium, the default"
    )
    await waitFor(() =>
      expect(canvas.getByText(/this model doesn't have it/)).toBeVisible()
    )
  },
}

const triggerGroups: ModelGroup[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      {
        id: "opus-5.5",
        label: "Opus 5.5",
        efforts: steps,
        defaultEffort: "medium",
      },
      { id: "haiku-5.5", label: "Haiku 5.5" },
      { id: "opus-4", label: "Opus 4", disabled: true },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    models: [{ id: "deepseek-v4", label: "deepseek-v4", badge: "OpenRouter" }],
  },
]

const triggers: {
  label: string
  value: string | null
  effort?: string
  showEffort?: boolean
}[] = [
  { label: "With thinking", value: "opus-5.5", effort: "high" },
  { label: "Thinking off", value: "opus-5.5", effort: "off" },
  { label: "No thinking", value: "haiku-5.5" },
  { label: "Other route", value: "deepseek-v4" },
  { label: "Unavailable", value: null },
  { label: "Phone", value: "opus-5.5", effort: "high", showEffort: false },
]

/**
 * The trigger: the model and its thinking step; the name alone for a
 * model without thinking (and always on a phone); its route's tag; and,
 * with no model or one that cannot be used now, a warning to pick one.
 */
export const Triggers: Story = {
  render: () => (
    <div className="grid grid-cols-[auto_auto] items-center gap-x-12 gap-y-3 text-2sm">
      {triggers.map((trigger) => (
        <React.Fragment key={trigger.label}>
          <span className="text-subtle-foreground">{trigger.label}</span>
          <span className="w-fit rounded-md ring-1 ring-border">
            <ModelPicker
              groups={triggerGroups}
              value={trigger.value}
              onValueChange={() => {}}
              effort={trigger.effort ?? null}
              onEffortChange={() => {}}
              showEffort={trigger.showEffort ?? true}
            />
          </span>
        </React.Fragment>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const [, off, none, route, unavailable, phone] =
      canvas.getAllByRole("button")
    await expect(off).toHaveAccessibleName("Model: Opus 5.5 · Off")
    await expect(off).toHaveTextContent("Opus 5.5· Off")
    await expect(none).toHaveTextContent(/^Haiku 5\.5$/)
    await expect(route).toHaveTextContent("deepseek-v4 OpenRouter")
    await expect(unavailable).toHaveAccessibleName("Model: Pick a model")
    await expect(phone).toHaveTextContent(/^Opus 5\.5$/)
  },
}

/**
 * On a phone the picker is a sheet from the bottom, with a title and Done;
 * a horizontal row of tabs switches the list.
 */
export const Phone: Story = {
  parameters: {
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
    )
    const dialog = await screen.findByRole("dialog", { name: "Model" })
    const sheet = within(dialog)
    await waitFor(() =>
      expect(
        sheet.getByRole("combobox", { name: "Search models" })
      ).toBeVisible()
    )
    // A handle at its top to swipe it away by.
    await waitFor(() =>
      expect(
        dialog.querySelector("[data-slot=drawer-swipe-handle]")
      ).toBeVisible()
    )
    await userEvent.click(sheet.getByRole("tab", { name: "OpenRouter" }))
    await waitFor(async () =>
      expect(
        await sheet.findByRole("option", { name: /^deepseek-v4/ })
      ).toBeVisible()
    )
    await userEvent.click(sheet.getByRole("button", { name: "Done" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

/**
 * A model id typed by hand, none of the list's, is offered as it is; the
 * app's own rows go under the list.
 */
export const CustomModel: Story = {
  play: async ({ canvas, args }) => {
    const search = await openPicker(canvas)
    const popup = screen.getByRole("dialog", { name: "Model" })
    await userEvent.click(
      within(popup).getByRole("button", { name: "Manage endpoints" })
    )
    await expect(args.onEndpoints).toHaveBeenCalled()
    await userEvent.click(search)
    await userEvent.keyboard("my-local-model")
    await userEvent.click(
      await screen.findByRole("option", { name: "Use “my-local-model”" })
    )
    // Typed in a search across groups: no group's.
    await expect(args.onCustomModel).toHaveBeenCalledWith("my-local-model", {})
  },
}

/**
 * A single group's models appear directly under its name; all of them
 * shown, recent models would only repeat them, so there are none.
 */
export const OneGroup: Story = {
  args: { groups: [oneGroup] },
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    const list = within(screen.getByRole("listbox"))
    await expect(list.queryByRole("group", { name: "Recent" })).toBeNull()
    const group = within(list.getByRole("group", { name: "Claude 5" }))
    await expect(group.getAllByRole("option")).toHaveLength(4)
    await expect(
      group.getByRole("option", { name: /^Opus 5\.5/ })
    ).toHaveAttribute("data-checked", "true")
    await expect(list.queryByRole("group", { name: "All models" })).toBeNull()
    await expect(list.queryByRole("option", { name: /^Claude 5/ })).toBeNull()
    await expect(
      screen.getByRole("slider", { name: "Thinking" })
    ).toBeInTheDocument()
    await userEvent.keyboard("{ArrowDown}")
    await expect(
      group.getByRole("option", { name: /^Sonnet 5\.5/ })
    ).toHaveAttribute("aria-selected", "true")
    await expect(
      screen.getByRole("slider", { name: "Thinking" })
    ).toHaveAttribute("max", "2")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("sonnet-5")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  },
}

/**
 * With one group, ←→ still change the thinking, opening nothing beside;
 * ↓ goes straight through the group's models.
 */
export const OneGroupKeys: Story = {
  tags: ["!autodocs"],
  args: { groups: [oneGroup] },
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.keyboard("{ArrowRight}")
    await expect(args.onEffortChange).toHaveBeenCalledWith("max")
    await expect(
      document.querySelector("[data-slot=model-picker-flyout]")
    ).toBeNull()
    // No recent rows: two down from Opus 5.5 is Sonnet 5.
    await expect(screen.queryByRole("group", { name: "Recent" })).toBeNull()
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    const group = within(screen.getByRole("group", { name: "Claude 5" }))
    await waitFor(() =>
      expect(
        group.getByRole("option", { name: "Sonnet 5 200k · $3" })
      ).toHaveAttribute("aria-selected", "true")
    )
  },
}

/** Single-group search shows model details and excludes the group name. */
export const OneGroupSearch: Story = {
  tags: ["!autodocs"],
  args: { groups: [oneGroup], recent: [] },
  play: async ({ canvas }) => {
    const search = await openPicker(canvas)
    await userEvent.type(search, "son")
    const options = within(screen.getByRole("listbox")).getAllByRole("option")
    await expect(options).toHaveLength(2)
    await waitFor(() => expect(screen.getByText("2 of 4")).toBeVisible())
    await expect(options[0]).toHaveTextContent(/^Sonnet 5\.51M · \$3$/)
    await userEvent.clear(search)
    await userEvent.type(search, "claude")
    await expect(
      document.querySelectorAll('[cmdk-item][data-value^="model:"]')
    ).toHaveLength(0)
  },
}

/**
 * A single long group is cut short until searched, its recent models
 * first; one in both lists is highlighted once.
 */
export const OneGroupLimit: Story = {
  tags: ["!autodocs"],
  args: { groups: [groups[2]!], initialModel: "deepseek-v4" },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: deepseek-v4 OpenRouter" })
    )
    const search = await screen.findByRole("combobox", {
      name: "Search models",
    })
    await waitFor(() => expect(search).toHaveFocus())
    await expect(
      within(screen.getByRole("group", { name: "OpenRouter" })).getAllByRole(
        "option"
      )
    ).toHaveLength(6)
    await waitFor(() =>
      expect(screen.getByText("35 more · type to search")).toBeVisible()
    )
    // deepseek-v4, the only recent model of the group, is in both.
    const recent = within(screen.getByRole("group", { name: "Recent" }))
    await expect(recent.getAllByRole("option")).toHaveLength(1)
    await userEvent.keyboard("{ArrowDown}")
    const inGroup = within(
      screen.getByRole("group", { name: "OpenRouter" })
    ).getByRole("option", { name: /^deepseek-v4/ })
    await waitFor(() =>
      expect(inGroup).toHaveAttribute("aria-selected", "true")
    )
    await expect(
      screen
        .getAllByRole("option")
        .filter((option) => option.getAttribute("aria-selected") === "true")
    ).toHaveLength(1)
    await userEvent.type(search, "dbrx")
    await userEvent.keyboard("{Enter}")
    await expect(args.onValueChange).toHaveBeenCalledWith("dbrx-2")
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  },
}

/** On a phone the single group's models are directly in the sheet. */
export const OneGroupPhone: Story = {
  tags: ["!autodocs"],
  parameters: Phone.parameters,
  globals: Phone.globals,
  args: { groups: [oneGroup] },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Model: Opus 5.5 · High" })
    )
    const dialog = await screen.findByRole("dialog", { name: "Model" })
    const sheet = within(dialog)
    await waitFor(() =>
      expect(
        sheet.getByRole("combobox", { name: "Search models" })
      ).toBeVisible()
    )
    await expect(sheet.getAllByRole("option")).toHaveLength(4)
    await expect(sheet.queryByRole("option", { name: /^Claude 5/ })).toBeNull()
    await userEvent.click(sheet.getByRole("option", { name: /^Haiku 5\.5/ }))
    await expect(args.onValueChange).toHaveBeenCalledWith("haiku-5.5")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

const edgeGroup: ModelGroup = {
  id: "gemini",
  label: "Gemini",
  models: [
    {
      id: "gemini-3-pro-preview",
      label: "gemini-3-pro-preview",
      detail: "1M context · $1.25 in / $10 out · doesn't support tools",
    },
    { id: "gemini-3-flash", label: "gemini-3-flash", detail: "1M · $0.3" },
  ],
}

const edgePurposes: ModelPurpose[] = [
  {
    id: "speech",
    label: "Speech",
    icon: icon(VolumeHighIcon),
    value: null,
    models: [],
    empty: (
      <button type="button" className={composerSelectRow}>
        Add a provider with speech
      </button>
    ),
  },
]

/**
 * The popup's rows are one height, Manage models too; a model's name is
 * kept and its long details cut first; conditional extra content that is
 * all false leaves no empty band; a purpose with no models says so, with
 * the app's next step.
 */
export const Edges: Story = {
  render: (args) => (
    <div className="flex w-2xl max-w-full flex-col pt-96">
      <Composer>
        <ComposerEditor aria-label="Message" placeholder="Ask anything" />
        <ComposerToolbar>
          <ModelPicker
            groups={[edgeGroup]}
            value="gemini-3-flash"
            onValueChange={args.onValueChange}
            purposes={edgePurposes}
            onManage={args.onManage}
          >
            {false}
            {null}
          </ModelPicker>
        </ComposerToolbar>
      </Composer>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Model:/ }))
    const dialog = await screen.findByRole("dialog")
    await quiet(dialog)
    const height = (element: Element) => element.getBoundingClientRect().height
    const row = screen.getByRole("option", { name: /gemini-3-flash/ })
    const manage = screen.getByRole("button", { name: "Manage models" })
    await expect(height(manage)).toBe(height(row))
    await expect(
      dialog.querySelector("[data-slot=model-picker-extra]")
    ).toBeNull()
    // The name whole, the details cut.
    const long = screen.getByRole("option", { name: /gemini-3-pro-preview/ })
    const name = within(long).getByText("gemini-3-pro-preview")
    await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth)
    const detail = within(long).getByText(/doesn't support tools/)
    await expect(detail.scrollWidth).toBeGreaterThan(detail.clientWidth)

    await userEvent.click(
      screen.getByRole("button", { name: /Images, video and speech/ })
    )
    await userEvent.click(
      await screen.findByRole("button", { name: /^Speech/ })
    )
    await waitFor(async () =>
      expect(await screen.findByText("No models for this yet.")).toBeVisible()
    )
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add a provider with speech" })
      ).toBeVisible()
    )
  },
}

/**
 * A section's heading in the rail with the app's mark before it
 * (`sectionIcon`, its first group's), e.g. a machine's.
 */
export const SectionIcon: Story = {
  args: {
    groups: sectioned.map((group) =>
      group.id === "local:claude"
        ? {
            ...group,
            sectionIcon: (
              <HugeiconsIcon
                icon={Settings02Icon}
                strokeWidth={2}
                data-testid="local-mark"
              />
            ),
          }
        : group
    ),
    recent: [],
  },
  play: async ({ canvas }) => {
    await openPicker(canvas)
    const headings = Array.from(
      screen
        .getByRole("tablist", { name: "Model groups" })
        .querySelectorAll<HTMLElement>("[data-slot=model-picker-section]")
    )
    await expect(headings.map((heading) => heading.textContent)).toEqual([
      "Official",
      "Local proxy",
    ])
    await expect(headings[0]!.querySelector("svg")).toBeNull()
    const mark = within(headings[1]!).getByTestId("local-mark")
    await expect(mark.getBoundingClientRect().width).toBe(14)
    // Before the name, on its line.
    const name = within(headings[1]!).getByText("Local proxy")
    await expect(mark.getBoundingClientRect().right).toBeLessThan(
      name.getBoundingClientRect().left
    )
    await closePicker(canvas)
  },
}

const familyGroups: ModelGroup[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    icon: <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} />,
    models: [
      {
        id: "opus-5.5",
        label: "Opus 5.5",
        section: "Claude Opus",
        efforts: steps,
        defaultEffort: "medium",
      },
      { id: "sonnet-5.5", label: "Sonnet 5.5", section: "Claude Sonnet" },
      { id: "opus-5", label: "Opus 5", section: "Claude Opus" },
      { id: "claude-latest", label: "claude-latest" },
    ],
  },
  groups[1]!,
]

/**
 * A group's models by their `section` (a family): those with none
 * first, then each family's under its name, in the order it first
 * comes. A search lists them by group alone.
 */
export const ModelSections: Story = {
  args: { groups: familyGroups, recent: [] },
  play: async ({ canvas }) => {
    const search = await openPicker(canvas)
    const pane = screen.getByRole("tabpanel")
    await expect(
      within(pane)
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual(["claude-latest", "Opus 5.5", "Opus 5", "Sonnet 5.5"])
    await expect(
      Array.from(pane.querySelectorAll("[cmdk-group-heading]")).map(
        (heading) => heading.textContent
      )
    ).toEqual(["Claude Opus", "Claude Sonnet"])
    // Each run its own group, named by its heading.
    await expect(
      within(pane).getByRole("group", { name: "Claude Sonnet" })
    ).toBeVisible()
    await userEvent.type(search, "opus")
    await waitFor(() =>
      expect(
        within(screen.getByRole("tabpanel")).getAllByRole("option")
      ).toHaveLength(2)
    )
    await expect(
      Array.from(
        screen.getByRole("tabpanel").querySelectorAll("[cmdk-group-heading]")
      ).map((heading) => heading.textContent)
    ).toEqual(["Anthropic"])
    await closePicker(canvas)
  },
}

/**
 * `customInput`: a field kept at the bottom of the pane for a model id
 * not in the list, however far it scrolls; Enter gives it to
 * `onCustomModel` with the group whose pane it is under, not the
 * highlighted model to `onValueChange`.
 */
export const CustomInput: Story = {
  args: { customInput: true },
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.click(
      within(screen.getByRole("tablist", { name: "Model groups" })).getByRole(
        "tab",
        { name: "OpenRouter" }
      )
    )
    const pane = screen.getByRole("tabpanel")
    const field = within(pane).getByRole("textbox", {
      name: "Another model's id",
    })
    // At the pane's bottom, the list scrolled or not.
    const bottom = () =>
      pane.getBoundingClientRect().bottom -
      field.closest("form")!.getBoundingClientRect().bottom
    await expect(Math.abs(bottom())).toBeLessThanOrEqual(1)
    pane.scrollTop = pane.scrollHeight
    await waitFor(() => expect(Math.abs(bottom())).toBeLessThanOrEqual(1))
    await expect(
      within(pane).getByRole("button", { name: "Use “”" })
    ).toBeDisabled()
    await userEvent.click(field)
    await userEvent.keyboard("my-local-model{Enter}")
    await expect(args.onCustomModel).toHaveBeenCalledWith("my-local-model", {
      group: "openrouter",
    })
    await expect(args.onValueChange).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  },
}

const machine: ModelPickerPage = {
  id: "desktop",
  label: "Desktop",
  icon: <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />,
  detail: "3 models",
  groups: [
    {
      id: "desktop:claude",
      label: "Claude",
      models: [{ id: "desktop-opus", label: "Opus 5.5 (Desktop)" }],
    },
    {
      id: "desktop:qwen",
      label: "Qwen",
      models: [
        { id: "desktop-qwen", label: "qwen-4" },
        { id: "desktop-qwen-coder", label: "qwen-4-coder" },
      ],
    },
  ],
}

/**
 * `pages`: a row under the list opens a page of further groups, with a
 * back header (Back or Escape returns); its models are picked as the
 * list's, the trigger naming them.
 */
export const Pages: Story = {
  args: { pages: [machine] },
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.click(screen.getByRole("button", { name: /^Desktop/ }))
    const back = await screen.findByRole("button", { name: "Back" })
    await expect(back.parentElement).toHaveTextContent("Desktop")
    const search = screen.getByRole("combobox", { name: "Search models" })
    await waitFor(() => expect(search).toHaveFocus())
    const rail = screen.getByRole("tablist", { name: "Model groups" })
    await expect(
      within(rail)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual(["Claude", "Qwen"])
    // Not the main page's rows under it.
    await expect(
      screen.queryByRole("button", { name: "Manage models" })
    ).toBeNull()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Desktop/ })).toBeVisible()
    )
    await expect(
      within(screen.getByRole("tablist", { name: "Model groups" })).getByRole(
        "tab",
        { name: "Anthropic" }
      )
    ).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /^Desktop/ }))
    await userEvent.click(
      within(
        await screen.findByRole("tablist", { name: "Model groups" })
      ).getByRole("tab", { name: "Qwen" })
    )
    await userEvent.click(screen.getByRole("option", { name: "qwen-4-coder" }))
    await expect(args.onValueChange).toHaveBeenCalledWith("desktop-qwen-coder")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await expect(
      canvas.getByRole("button", { name: "Model: qwen-4-coder" })
    ).toBeVisible()
  },
}

/**
 * `onPageChange` says a page opened, by its id, and was left (null), by
 * Back or as the picker closes on it: the app fetches its groups then,
 * the page `loading` meanwhile (a spinner, not "No models found").
 */
export const PageChange: Story = {
  args: {
    onPageChange: fn(),
    pages: [{ ...machine, groups: [], loading: true }],
  },
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.click(screen.getByRole("button", { name: /^Desktop/ }))
    await expect(args.onPageChange).toHaveBeenLastCalledWith("desktop")
    const status = await screen.findByText("Refreshing models…")
    await waitFor(() => expect(status).toBeVisible())
    // No empty panes over it.
    await expect(
      document.querySelector("[data-slot=model-picker-panes]")
    ).not.toBeVisible()
    await expect(screen.queryByText("No models found")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    await expect(args.onPageChange).toHaveBeenLastCalledWith(null)
    await userEvent.click(screen.getByRole("button", { name: /^Desktop/ }))
    await expect(args.onPageChange).toHaveBeenLastCalledWith("desktop")
    await userEvent.keyboard("{Escape}{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await expect(args.onPageChange).toHaveBeenLastCalledWith(null)
    await expect(args.onPageChange).toHaveBeenCalledTimes(4)
  },
}

/** An id typed on a page: `onCustomModel` says the page and the group. */
export const PageCustomInput: Story = {
  args: { pages: [machine], customInput: true },
  play: async ({ canvas, args }) => {
    await openPicker(canvas)
    await userEvent.click(screen.getByRole("button", { name: /^Desktop/ }))
    await userEvent.click(
      within(
        await screen.findByRole("tablist", { name: "Model groups" })
      ).getByRole("tab", { name: "Qwen" })
    )
    await userEvent.click(
      screen.getByRole("textbox", { name: "Another model's id" })
    )
    await userEvent.keyboard("qwen-5{Enter}")
    await expect(args.onCustomModel).toHaveBeenCalledWith("qwen-5", {
      group: "desktop:qwen",
      page: "desktop",
    })
  },
}
