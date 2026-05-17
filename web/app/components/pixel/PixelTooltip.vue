<script setup lang="ts">
import { useElementBounding } from '@vueuse/core'

export type PixelTooltipSection = {
  label: string
  text: string
}

const props = withDefaults(
  defineProps<{
    text?: string
    sections?: PixelTooltipSection[]
    gap?: number
    taskType?: 'quiz' | 'performance'
    multiline?: boolean
    hints?: boolean
    toggleOnClick?: boolean
  }>(),
  { text: '', gap: 6, multiline: false, hints: false, toggleOnClick: false },
)

const taskLabel = computed(() =>
  props.taskType === 'quiz' ? 'Quiz' : props.taskType === 'performance' ? 'Performance' : '',
)

const hasContent = computed(() =>
  Boolean(props.taskType || props.sections?.length || props.text.trim()),
)

const VIEWPORT_PADDING = 8

const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const mounted = ref(false)

const tooltipStyle = ref<{ top: string; left: string }>({
  top: '0',
  left: '0',
})

const triggerBounding = useElementBounding(triggerRef, {
  windowScroll: true,
  windowResize: true,
})

function updatePosition() {
  if (!visible.value || !triggerRef.value) return

  const { top, left, width, height } = triggerBounding
  const tooltipEl = tooltipRef.value
  const tooltipWidth = tooltipEl?.offsetWidth ?? 0
  const tooltipHeight = tooltipEl?.offsetHeight ?? 0

  const centerX = left.value + width.value / 2
  let tipLeft = centerX - tooltipWidth / 2
  tipLeft = Math.max(
    VIEWPORT_PADDING,
    Math.min(tipLeft, window.innerWidth - tooltipWidth - VIEWPORT_PADDING),
  )

  const tipTop = top.value - props.gap - tooltipHeight

  tooltipStyle.value = {
    top: `${Math.max(VIEWPORT_PADDING, tipTop)}px`,
    left: `${tipLeft}px`,
  }
}

function show() {
  if (!hasContent.value) return
  visible.value = true
  nextTick(() => {
    updatePosition()
    nextTick(updatePosition)
  })
}

function hide() {
  visible.value = false
}

function onTriggerClick() {
  if (!props.toggleOnClick || !hasContent.value) return
  visible.value = !visible.value
  if (visible.value) {
    nextTick(() => {
      updatePosition()
      nextTick(updatePosition)
    })
  }
}

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && triggerRef.value?.contains(next)) return
  hide()
}

watchEffect(() => {
  if (!visible.value) return
  void triggerBounding.top.value
  void triggerBounding.left.value
  void triggerBounding.width.value
  void triggerBounding.height.value
  updatePosition()
})

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <div
    ref="triggerRef"
    class="pixel-tooltip-trigger inline-flex"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="onFocusOut"
    @click="onTriggerClick"
  >
    <slot />
    <Teleport v-if="mounted && visible && hasContent" to="body">
      <div
        ref="tooltipRef"
        role="tooltip"
        class="pixel-tooltip pixel-body fixed z-[45] opacity-100"
        :class="{
          'pixel-tooltip--station': taskType,
          'pixel-tooltip--multiline': multiline,
          'pixel-tooltip--hints': hints,
        }"
        :style="tooltipStyle"
      >
        <span v-if="taskType" class="pixel-tooltip__kind">
          <svg
            v-if="taskType === 'quiz'"
            class="pixel-tooltip__kind-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M6.25 6.25a1.75 1.75 0 1 1 2.9 1.35c-.55.45-1.15.9-1.15 1.65" stroke-linecap="square" />
            <path d="M8 12.25v.25" stroke-linecap="square" />
          </svg>
          <svg
            v-else
            class="pixel-tooltip__kind-icon"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 1.5 9.6 6l4.7.35-3.6 2.85 1.35 4.55L8 11.35 4.05 13.75l1.35-4.55L1.8 6.35 6.5 6z" />
          </svg>
          <span>{{ taskLabel }}</span>
        </span>
        <div v-if="sections?.length" class="pixel-tooltip__sections">
          <div
            v-for="(section, i) in sections"
            :key="i"
            class="pixel-tooltip__section"
          >
            <span class="pixel-tooltip__label">{{ section.label }}:</span>
            <span class="pixel-tooltip__text">{{ section.text }}</span>
          </div>
        </div>
        <span v-else-if="text.trim()" class="pixel-tooltip__text">{{ text }}</span>
      </div>
    </Teleport>
  </div>
</template>
