<script setup lang="ts">
/** Board uses ResizeObserver and viewport metrics — parent pages wrap in ClientOnly or use ssr:false. */
import type { ComponentPublicInstance } from 'vue'
import {
  activeBoardField,
  computeGameBoardLayout,
  GAME_BOARD_NODE_SIZE,
} from '#shared/game-board-layout'

export type BoardTeam = {
  id: number
  name: string
  position: number
}

export type GameBoardFieldTooltip =
  | string
  | {
      activityType: 'quiz' | 'performance'
      text: string
    }

const { t: tr } = useI18n()

const props = withDefaults(
  defineProps<{
    fieldCount: number
    positionConfirmed: number
    positionPending?: number | null
    myTeamId?: number | null
    teams?: BoardTeam[]
    compact?: boolean
    showDice?: boolean
    diceValue?: number | null
    diceTooltip?: string
    diceInteractive?: boolean
    diceLoading?: boolean
    rollPrompt?: string | null
    selectable?: boolean
    configuredFields?: number[]
    fieldTooltips?: Record<number, GameBoardFieldTooltip>
    creatable?: boolean
  }>(),
  {
    positionPending: null,
    myTeamId: null,
    teams: () => [],
    compact: false,
    showDice: false,
    diceValue: null,
    diceTooltip: 'Roll dice',
    diceInteractive: false,
    diceLoading: false,
    rollPrompt: null,
    selectable: false,
    configuredFields: () => [],
    fieldTooltips: () => ({}),
    creatable: false,
  },
)

const emit = defineEmits<{ diceClick: []; fieldSelect: [field: number] }>()

const configuredFieldSet = computed(() => new Set(props.configuredFields))

const viewportRef = ref<HTMLElement | null>(null)
const nodeRefs = ref<Map<number, HTMLElement>>(new Map())

const layout = computed(() => computeGameBoardLayout(props.fieldCount))

const teamsByField = computed(() => {
  const map = new Map<number, BoardTeam[]>()
  for (const t of props.teams) {
    const list = map.get(t.position) ?? []
    list.push(t)
    map.set(t.position, list)
  }
  return map
})

const focusField = computed(() =>
  activeBoardField(props.positionConfirmed, props.positionPending),
)

function isPlayField(field: number): boolean {
  return field > 0 && field < props.fieldCount
}

function isFieldSelectable(field: number): boolean {
  if (!props.selectable || !isPlayField(field)) return false
  return configuredFieldSet.value.has(field)
}

function isFieldCreatable(field: number): boolean {
  if (!props.selectable || !props.creatable || !isPlayField(field)) return false
  return !configuredFieldSet.value.has(field)
}

function isFieldInteractive(field: number): boolean {
  return isFieldSelectable(field) || isFieldCreatable(field)
}

function fieldTooltip(field: number): GameBoardFieldTooltip | undefined {
  if (props.fieldTooltips[field]) return props.fieldTooltips[field]
  if (props.selectable && isFieldCreatable(field)) return 'Add station'
  if (props.selectable && adminNodeState(field) === 'unconfigured') return 'No station'
  return undefined
}

function fieldTooltipText(tooltip: GameBoardFieldTooltip): string {
  return typeof tooltip === 'string' ? tooltip : tooltip.text
}

function fieldTooltipTaskType(
  tooltip: GameBoardFieldTooltip,
): 'quiz' | 'performance' | undefined {
  return typeof tooltip === 'string' ? undefined : tooltip.activityType
}

function fieldTooltipProps(field: number) {
  const tip = fieldTooltip(field)
  return {
    text: tip ? fieldTooltipText(tip) : '',
    activityType: tip ? fieldTooltipTaskType(tip) : undefined,
  }
}

function adminNodeState(field: number): 'configured' | 'unconfigured' | 'inactive' {
  if (field === 0 || field === props.fieldCount) return 'inactive'
  if (configuredFieldSet.value.has(field)) return 'configured'
  return 'unconfigured'
}

function onNodeActivate(field: number) {
  if (isFieldInteractive(field)) emit('fieldSelect', field)
}

function onNodeKeydown(event: KeyboardEvent, field: number) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onNodeActivate(field)
  }
}

function nodeState(field: number): 'start' | 'goal' | 'completed' | 'pending' | 'future' {
  if (field === 0) {
    return props.positionConfirmed === 0 && props.positionPending !== 0 ? 'start' : 'completed'
  }
  if (field === props.fieldCount) {
    if (props.positionConfirmed >= props.fieldCount) return 'goal'
    if (props.positionPending === props.fieldCount) return 'pending'
    return 'future'
  }
  if (props.positionConfirmed >= field) return 'completed'
  if (props.positionPending === field && props.positionConfirmed < field) return 'pending'
  return 'future'
}

function setNodeRef(field: number, el: Element | ComponentPublicInstance | null) {
  let node: HTMLElement | null = null
  if (el instanceof HTMLElement) {
    node = el
  }
  else if (el && typeof el === 'object' && '$el' in el) {
    const root = (el as ComponentPublicInstance).$el
    if (root instanceof HTMLElement) node = root
  }
  if (node) nodeRefs.value.set(field, node)
  else nodeRefs.value.delete(field)
}

/** Extra space below field tiles for team name chips. */
const VIEWPORT_EXTRA_Y = 28

const fitScale = ref(1)

const scaledWidthPx = computed(() => layout.value.width * fitScale.value)
const scaledHeightPx = computed(
  () => (layout.value.height + VIEWPORT_EXTRA_Y) * fitScale.value,
)

function updateFitScale() {
  const viewport = viewportRef.value
  if (!viewport) return
  const pad = 4
  fitScale.value = Math.min(1, (viewport.clientWidth - pad) / layout.value.width)
}

function scrollToFocus() {
  if (!import.meta.client) return
  const viewport = viewportRef.value
  const el = nodeRefs.value.get(focusField.value)
  if (!viewport || !el) return
  const scale = fitScale.value
  const nodeCenterY = (el.offsetTop + el.offsetHeight / 2) * scale
  const scrollTop = nodeCenterY - viewport.clientHeight / 2
  viewport.scrollTo({
    top: Math.max(0, scrollTop),
    behavior: 'smooth',
  })
}

let resizeObserver: ResizeObserver | null = null

watch(
  () => layout.value.width,
  () => nextTick(updateFitScale),
)

onMounted(() => {
  nextTick(() => {
    updateFitScale()
    if (!props.selectable) scrollToFocus()
    const viewport = viewportRef.value
    if (!viewport) return
    resizeObserver = new ResizeObserver(() => updateFitScale())
    resizeObserver.observe(viewport)
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(focusField, () => {
  if (!props.selectable) nextTick(scrollToFocus)
})

defineExpose({ scrollToFocus })
</script>

<template>
  <div
    class="pixel-card"
    :class="compact ? 'p-2' : 'p-3'"
  >
    <p v-if="!compact && !showDice && !selectable" class="pixel-title text-xs mb-2 text-center">Game board</p>
    <p v-else-if="selectable" class="pixel-title text-xs mb-2 text-center">
      Click a field to edit{{ creatable ? ' or add' : '' }}
    </p>

    <div
      ref="viewportRef"
      class="game-board-viewport relative overflow-x-hidden overflow-y-auto"
      :class="[
        compact ? 'game-board-viewport--compact' : 'game-board-viewport--play',
        selectable && 'game-board-viewport--admin',
      ]"
    >
      <div
        class="game-board-scaler relative mx-auto"
        :style="{ width: `${scaledWidthPx}px`, height: `${scaledHeightPx}px` }"
      >
        <div
          class="game-board-canvas absolute left-0 top-0 origin-top-left"
          :style="{
            width: `${layout.width}px`,
            height: `${layout.height}px`,
            transform: `scale(${fitScale})`,
          }"
        >
        <svg
          class="game-board-track pointer-events-none absolute inset-0"
          :width="layout.width"
          :height="layout.height"
          aria-hidden="true"
        >
          <path
            :d="layout.pathD"
            fill="none"
            stroke="var(--pixel-board-path)"
            stroke-width="4"
            stroke-linecap="square"
            stroke-linejoin="miter"
            shape-rendering="crispEdges"
          />
        </svg>

        <div
          v-for="node in layout.nodes"
          :key="node.field"
          :ref="(el) => setNodeRef(node.field, el)"
          class="game-board-node absolute flex flex-col items-center"
          :style="{
            left: `${node.x}px`,
            top: `${node.y}px`,
            width: `${GAME_BOARD_NODE_SIZE}px`,
            height: `${GAME_BOARD_NODE_SIZE}px`,
            transform: 'translate(-50%, -50%)',
          }"
        >
          <PixelTooltip
            v-bind="fieldTooltipProps(node.field)"
            :gap="6"
            class="game-board-node__tooltip"
          >
            <component
              :is="isFieldInteractive(node.field) ? 'button' : 'div'"
              :type="isFieldInteractive(node.field) ? 'button' : undefined"
              class="game-board-node__tile flex shrink-0 items-center justify-center"
              :class="[
                compact ? 'game-board-node__tile--compact' : 'game-board-node__tile--play',
                selectable
                  ? `game-board-node__tile--${adminNodeState(node.field)}`
                  : `game-board-node__tile--${nodeState(node.field)}`,
                {
                  'game-board-node__tile--focus':
                    !selectable && node.field === focusField && nodeState(node.field) !== 'pending',
                  'game-board-node__tile--pending-blink':
                    !selectable && nodeState(node.field) === 'pending',
                  'game-board-node__tile--selectable': isFieldInteractive(node.field),
                  'game-board-node__tile--creatable': isFieldCreatable(node.field),
                },
              ]"
              :disabled="selectable && !isFieldInteractive(node.field) ? true : undefined"
              @click="onNodeActivate(node.field)"
              @keydown="onNodeKeydown($event, node.field)"
            >
              <span
                class="game-board-node__label"
                :class="{ 'game-board-node__label--sm': node.field >= 10 }"
              >{{ node.field }}</span>
            </component>
          </PixelTooltip>

          <div
            v-if="teamsByField.get(node.field)?.length"
            class="mt-0.5 flex max-w-[72px] flex-wrap justify-center gap-0.5"
          >
            <span
              v-for="t in teamsByField.get(node.field)"
              :key="t.id"
              class="game-board-team-chip truncate px-1 text-[8px] leading-tight"
              :class="
                t.id === myTeamId
                  ? 'game-board-team--you font-bold'
                  : 'game-board-team--other'
              "
              :title="t.name"
            >
              {{ t.id === myTeamId && !selectable ? tr('common.you') : t.name.slice(0, 6) }}
            </span>
          </div>
        </div>
        </div>
      </div>

    </div>

    <div
      v-if="showDice && !compact"
      class="game-board-footer mt-2 flex min-h-[4rem] items-center gap-2 overflow-visible"
    >
      <div
        v-if="$slots['board-actions']"
        class="game-board-footer__actions shrink-0 overflow-visible pl-0.5"
      >
        <slot name="board-actions" />
      </div>
      <div
        class="game-board-footer__dice-row flex min-w-0 flex-1 items-center gap-2"
        :class="rollPrompt ? 'justify-between' : 'justify-end'"
      >
        <p
          v-if="rollPrompt"
          class="pixel-title min-w-0 flex-1 pr-2 text-left text-xs leading-snug"
        >
          {{ rollPrompt }}
        </p>
        <div class="shrink-0">
          <PixelDiceButton
            :value="diceValue"
            :tooltip="diceTooltip"
            :interactive="diceInteractive"
            :loading="diceLoading"
            @click="emit('diceClick')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-board-viewport {
  scrollbar-width: thin;
  overscroll-behavior-x: none;
  touch-action: pan-y;
}

.game-board-viewport--play {
  max-height: 45vh;
}

.game-board-viewport--compact {
  max-height: 28vh;
}

.game-board-viewport--admin {
  max-height: 50vh;
}

.game-board-canvas {
  background: var(--pixel-cream);
  outline: 2px solid var(--pixel-forest-dark);
  outline-offset: -2px;
}

.game-board-track {
  shape-rendering: crispEdges;
}

.game-board-node__tile {
  border: var(--pixel-border) solid var(--pixel-forest-dark);
  border-radius: 0;
  box-shadow: var(--pixel-shadow);
}

.game-board-node__tile--play {
  width: 2.75rem;
  height: 2.75rem;
}

.game-board-node__tile--compact {
  width: 2.25rem;
  height: 2.25rem;
}

.game-board-node__label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  line-height: 1;
}

.game-board-node__label--sm {
  font-size: 7px;
}

.game-board-node__tile--compact .game-board-node__label {
  font-size: 7px;
}

.game-board-node__tile--compact .game-board-node__label--sm {
  font-size: 6px;
}

.game-board-node__tile--configured {
  background: var(--pixel-board-configured);
  color: var(--pixel-board-configured-text);
}

.game-board-node__tile--unconfigured {
  background: var(--pixel-board-unconfigured);
  color: var(--pixel-board-unconfigured-text);
  opacity: 0.75;
}

.game-board-node__tile--inactive {
  background: var(--pixel-board-future);
  color: var(--pixel-board-unconfigured-text);
  opacity: 0.6;
}

.game-board-node__tooltip {
  display: inline-flex;
}

.game-board-node__tile--selectable {
  cursor: pointer;
}

.game-board-node__tile--selectable:hover {
  box-shadow:
    0 0 0 2px var(--pixel-board-focus),
    var(--pixel-shadow);
}

.game-board-node__tile--creatable {
  cursor: pointer;
  border-style: dashed;
}

button.game-board-node__tile {
  padding: 0;
  font: inherit;
}

button.game-board-node__tile:disabled {
  cursor: default;
}

.game-board-node__tile--start {
  background: var(--pixel-board-start);
  color: var(--pixel-forest-dark);
  box-shadow:
    inset 2px 2px 0 rgb(255 255 255 / 0.35),
    var(--pixel-shadow);
}

.game-board-node__tile--pending {
  background: var(--pixel-board-pending);
  color: var(--pixel-forest-dark);
}

.game-board-node__tile--pending-blink {
  animation: board-pending-blink 1s steps(1, end) infinite;
  box-shadow:
    0 0 0 2px var(--pixel-board-focus),
    var(--pixel-shadow);
}

.game-board-node__tile--goal {
  background: var(--pixel-board-goal);
  color: var(--pixel-forest-dark);
  box-shadow:
    inset 2px 2px 0 rgb(255 255 255 / 0.3),
    var(--pixel-shadow);
}

.game-board-node__tile--completed {
  background: var(--pixel-board-done);
  color: var(--pixel-board-done-text);
  box-shadow:
    inset 2px 2px 0 rgb(255 255 255 / 0.25),
    var(--pixel-shadow);
}

.game-board-node__tile--future {
  background: var(--pixel-board-future);
  color: var(--pixel-board-future-text);
}

.game-board-node__tile--focus {
  box-shadow:
    0 0 0 2px var(--pixel-board-focus),
    var(--pixel-shadow);
}

.game-board-team-chip {
  border: 2px solid var(--pixel-forest-dark);
  border-radius: 0;
  box-shadow: 2px 2px 0 var(--pixel-forest-dark);
}

.game-board-team--you {
  background: var(--pixel-board-you);
}

.game-board-team--other {
  background: var(--pixel-board-other);
  opacity: 0.95;
}

@keyframes board-pending-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0.55;
  }
}
</style>
