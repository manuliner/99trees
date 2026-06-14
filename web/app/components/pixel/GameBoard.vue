<script setup lang="ts">
/** Board uses ResizeObserver and viewport metrics — parent pages wrap in ClientOnly or use ssr:false. */
import type { ComponentPublicInstance } from 'vue'
import {
  activeBoardField,
  computeGameBoardLayout,
  GAME_BOARD_NODE_SIZE,
} from '#shared/game-board-layout'
import { isTeamAvatarId } from '#shared/team-avatars'

export type BoardTeam = {
  id: number
  name: string
  position: number
  avatarId?: string | null
}

export type GameBoardFieldTooltip =
  | string
  | {
      activityType: 'quiz' | 'performance' | 'coop' | 'media'
      text: string
    }

const { t: tr } = useI18n()

const props = withDefaults(
  defineProps<{
    fieldCount: number
    positionConfirmed: number
    positionPending?: number | null
    myTeamId?: number | null
    myAvatarId?: string | null
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
    /** Animated “you” marker field during roll move phase. */
    moveTokenField?: number | null
    /** Überlauf + Ziel — hellblau. */
    moveOverflowFields?: number[]
    /** Verbrauchte Würfelschritte — dunkelblau. */
    moveSteppedFields?: number[]
    /** Performance wartet auf Crew — orange hervorgehoben. */
    pendingCrewFields?: number[]
    /** Hide static team chip at confirmed position while move token is active. */
    suppressMyTeamChip?: boolean
    /** Dev: single-letter activity type per field (q/p/m/c). */
    fieldActivityLetters?: Record<number, string>
    /** Dev: allow tapping task fields to simulate a roll. */
    devFieldPickable?: boolean
    devPickableFields?: number[]
  }>(),
  {
    positionPending: null,
    myTeamId: null,
    myAvatarId: null,
    teams: () => [],
    moveTokenField: null,
    moveOverflowFields: () => [],
    moveSteppedFields: () => [],
    pendingCrewFields: () => [],
    suppressMyTeamChip: false,
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
    fieldActivityLetters: () => ({}),
    devFieldPickable: false,
    devPickableFields: () => [],
  },
)

const emit = defineEmits<{
  diceClick: []
  fieldSelect: [field: number]
  devFieldPick: [field: number]
}>()

const configuredFieldSet = computed(() => new Set(props.configuredFields))
const devPickableFieldSet = computed(() => new Set(props.devPickableFields))

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

const moveOverflowSet = computed(() => new Set(props.moveOverflowFields))
const moveSteppedSet = computed(() => new Set(props.moveSteppedFields))
const pendingCrewSet = computed(() => new Set(props.pendingCrewFields))

const focusField = computed(() => {
  if (props.moveTokenField != null) return props.moveTokenField
  return activeBoardField(props.positionConfirmed, props.positionPending)
})

function isMoveHighlighted(field: number): boolean {
  return moveOverflowSet.value.has(field) || moveSteppedSet.value.has(field)
}

function isPendingCrewField(field: number): boolean {
  return pendingCrewSet.value.has(field)
}

function playTileStateClass(field: number): string {
  if (isPendingCrewField(field)) return 'game-board-node__tile--pending-crew'
  if (moveSteppedSet.value.has(field)) return 'game-board-node__tile--step-played'
  if (moveOverflowSet.value.has(field)) return 'game-board-node__tile--step-active'
  return `game-board-node__tile--${nodeState(field)}`
}

const moveTokenNode = computed(() => {
  if (props.moveTokenField == null) return null
  return layout.value.nodes.find((n) => n.field === props.moveTokenField) ?? null
})

function teamsOnField(field: number): BoardTeam[] {
  const list = teamsByField.value.get(field) ?? []
  if (!props.suppressMyTeamChip || props.myTeamId == null) return list
  return list.filter((t) => t.id !== props.myTeamId)
}

function teamHasBoardAvatar(team: BoardTeam): boolean {
  return team.avatarId != null && isTeamAvatarId(team.avatarId)
}

function teamMarkerTitle(team: BoardTeam): string {
  if (team.id === props.myTeamId && !props.selectable) {
    return `${tr('common.you')} — ${team.name}`
  }
  return team.name
}

function teamChipLabel(team: BoardTeam): string {
  if (team.id === props.myTeamId && !props.selectable) return tr('common.you')
  return team.name.slice(0, 6)
}

const moveTokenHasAvatar = computed(
  () => props.myAvatarId != null && isTeamAvatarId(props.myAvatarId),
)

const boardAvatarSize = computed((): 'board' | 'board-compact' =>
  props.compact ? 'board-compact' : 'board',
)

function showFieldLabel(field: number): boolean {
  const onField = teamsOnFieldDisplay(field)
  if (onField.some(teamHasBoardAvatar)) return false
  if (props.moveTokenField === field && moveTokenHasAvatar.value) return false
  return true
}

const MAX_FIELD_AVATARS = 4
const MAX_OTHERS_BESIDE_MINE = MAX_FIELD_AVATARS - 1

/** Visible teams on a field (own team always included; max 4 total). */
function teamsOnFieldDisplay(field: number): BoardTeam[] {
  const all = teamsOnField(field)
  const mine =
    props.myTeamId != null ? all.filter((t) => t.id === props.myTeamId) : []
  const others = all.filter((t) => t.id !== props.myTeamId)

  if (mine.length > 0) {
    return [...others.slice(0, MAX_OTHERS_BESIDE_MINE), ...mine]
  }
  return others.slice(0, MAX_FIELD_AVATARS)
}

function fieldAvatarsLayout(field: number): 'solo' | 'you-and-others' | 'others-only' {
  const displayed = teamsOnFieldDisplay(field)
  if (displayed.length <= 1) return 'solo'
  if (displayed.some((t) => t.id === props.myTeamId)) return 'you-and-others'
  return 'others-only'
}

function otherAvatarCornerIndex(field: number, team: BoardTeam): number {
  const others = teamsOnFieldDisplay(field).filter((t) => t.id !== props.myTeamId)
  return others.findIndex((t) => t.id === team.id)
}

function avatarBadgeSize(
  field: number,
  team: BoardTeam,
): 'board' | 'board-compact' | 'board-mini' {
  const layout = fieldAvatarsLayout(field)
  if (layout === 'solo' || team.id === props.myTeamId) return boardAvatarSize.value
  return 'board-mini'
}

function isPlayField(field: number): boolean {
  if (field <= 0) return false
  if (props.selectable) return field <= props.fieldCount
  return field < props.fieldCount
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

function isDevFieldPickable(field: number): boolean {
  if (!props.devFieldPickable || !isPlayField(field)) return false
  return devPickableFieldSet.value.has(field)
}

function isNodeClickable(field: number): boolean {
  return isFieldInteractive(field) || isDevFieldPickable(field)
}

function fieldActivityLetter(field: number): string | undefined {
  return props.fieldActivityLetters[field]
}

function fieldTooltip(field: number): GameBoardFieldTooltip | undefined {
  if (props.fieldTooltips[field]) return props.fieldTooltips[field]
  if (props.selectable && isFieldCreatable(field)) return 'Add station'
  if (props.selectable && configuredFieldSet.value.has(field)) return 'Edit station'
  if (props.selectable && adminNodeState(field) === 'unconfigured') return 'No station'
  return undefined
}

function fieldTooltipText(tooltip: GameBoardFieldTooltip): string {
  return typeof tooltip === 'string' ? tooltip : tooltip.text
}

function fieldTooltipTaskType(
  tooltip: GameBoardFieldTooltip,
): 'quiz' | 'performance' | 'coop' | 'media' | undefined {
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
  if (field === 0) return 'inactive'
  if (!props.selectable && field === props.fieldCount) return 'inactive'
  if (configuredFieldSet.value.has(field)) return 'configured'
  return 'unconfigured'
}

function onNodeActivate(field: number) {
  if (isDevFieldPickable(field)) {
    emit('devFieldPick', field)
    return
  }
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

/** Small padding below board canvas (avatars sit on tiles). */
const VIEWPORT_EXTRA_Y = 8

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

watch(
  () => props.moveTokenField,
  () => {
    if (!props.selectable && props.moveTokenField != null) nextTick(scrollToFocus)
  },
)

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
      class="game-board-viewport scroll-contained relative overflow-x-hidden overflow-y-auto"
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
              :is="isNodeClickable(node.field) ? 'button' : 'div'"
              :type="isNodeClickable(node.field) ? 'button' : undefined"
              class="game-board-node__tile relative flex shrink-0 items-center justify-center"
              :class="[
                compact ? 'game-board-node__tile--compact' : 'game-board-node__tile--play',
                selectable
                  ? `game-board-node__tile--${adminNodeState(node.field)}`
                  : playTileStateClass(node.field),
                {
                  'game-board-node__tile--focus':
                    !selectable
                    && !isMoveHighlighted(node.field)
                    && !isPendingCrewField(node.field)
                    && node.field === focusField
                    && nodeState(node.field) !== 'pending',
                  'game-board-node__tile--pending-blink':
                    !selectable
                    && !isMoveHighlighted(node.field)
                    && !isPendingCrewField(node.field)
                    && nodeState(node.field) === 'pending',
                  'game-board-node__tile--selectable': isFieldInteractive(node.field),
                  'game-board-node__tile--creatable': isFieldCreatable(node.field),
                  'game-board-node__tile--dev-pick': isDevFieldPickable(node.field),
                },
              ]"
              :disabled="selectable && !isFieldInteractive(node.field) ? true : undefined"
              @click="onNodeActivate(node.field)"
              @keydown="onNodeKeydown($event, node.field)"
            >
              <span
                v-if="showFieldLabel(node.field)"
                class="game-board-node__label"
                :class="{ 'game-board-node__label--sm': node.field >= 10 }"
              >{{ node.field }}</span>
              <span
                v-if="fieldActivityLetter(node.field)"
                class="game-board-node__type-badge"
                aria-hidden="true"
              >{{ fieldActivityLetter(node.field) }}</span>

              <div
                v-if="teamsOnFieldDisplay(node.field).length"
                class="game-board-node__avatars pointer-events-none absolute inset-0 z-[1]"
                :class="`game-board-node__avatars--${fieldAvatarsLayout(node.field)}`"
              >
                <template
                  v-for="t in teamsOnFieldDisplay(node.field)"
                  :key="t.id"
                >
                  <span
                    v-if="teamHasBoardAvatar(t)"
                    class="game-board-node__avatar shrink-0"
                    :class="{
                      'game-board-node__avatar--you': t.id === myTeamId,
                      'game-board-node__avatar--other': t.id !== myTeamId && fieldAvatarsLayout(node.field) !== 'solo',
                      [`game-board-node__avatar--other-${otherAvatarCornerIndex(node.field, t)}`]:
                        t.id !== myTeamId && fieldAvatarsLayout(node.field) !== 'solo',
                    }"
                    :title="teamMarkerTitle(t)"
                  >
                    <PixelTeamAvatarBadge
                      :avatar-id="t.avatarId"
                      :size="avatarBadgeSize(node.field, t)"
                      borderless
                    />
                  </span>
                  <span
                    v-else
                    class="game-board-team-chip absolute bottom-0 left-1/2 max-w-full -translate-x-1/2 truncate px-1 text-[8px] leading-tight"
                    :class="
                      t.id === myTeamId
                        ? 'game-board-team--you font-bold'
                        : 'game-board-team--other'
                    "
                    :title="teamMarkerTitle(t)"
                  >
                    {{ teamChipLabel(t) }}
                  </span>
                </template>
              </div>
            </component>
          </PixelTooltip>
        </div>

        <div
          v-if="moveTokenNode && !selectable"
          class="game-board-move-token pointer-events-none absolute z-10 flex items-center justify-center"
          :style="{
            left: `${moveTokenNode.x}px`,
            top: `${moveTokenNode.y}px`,
            width: compact ? '2.25rem' : '2.75rem',
            height: compact ? '2.25rem' : '2.75rem',
            transform: 'translate(-50%, -50%)',
          }"
          :title="tr('common.you')"
        >
          <PixelTeamAvatarBadge
            v-if="moveTokenHasAvatar"
            :avatar-id="myAvatarId"
            :size="boardAvatarSize"
            borderless
          />
          <span
            v-else
            class="game-board-team-chip game-board-team--you px-1 text-[8px] font-bold leading-tight"
          >
            {{ tr('common.you') }}
          </span>
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
  position: relative;
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

.game-board-node__type-badge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  line-height: 1;
  opacity: 0.85;
  pointer-events: none;
}

.game-board-node__tile--dev-pick {
  cursor: pointer;
}

.game-board-node__tile--dev-pick:hover {
  box-shadow:
    0 0 0 2px var(--pixel-board-focus),
    var(--pixel-shadow);
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

/* Überlaufen: nur übersprungen */
.game-board-node__tile--step-active {
  background: var(--pixel-board-overflow);
  color: var(--pixel-board-overflow-text);
  box-shadow:
    inset 2px 2px 0 rgb(255 255 255 / 0.55),
    var(--pixel-shadow);
}

/* Gespielt: Aufgabe an dieser Station gelöst */
.game-board-node__tile--step-played {
  background: var(--pixel-board-played-path);
  color: var(--pixel-board-played-path-text);
  box-shadow:
    inset 2px 2px 0 rgb(255 255 255 / 0.25),
    var(--pixel-shadow);
}

.game-board-node__tile--pending-crew {
  background: var(--pixel-board-pending-crew);
  color: var(--pixel-board-pending-crew-text);
  animation: game-board-pending-crew-pulse 1.4s ease-in-out infinite;
  box-shadow:
    inset 2px 2px 0 rgb(255 255 255 / 0.45),
    0 0 0 2px var(--pixel-sunrise),
    var(--pixel-shadow);
}

@keyframes game-board-pending-crew-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-board-node__tile--pending-crew {
    animation: none;
  }
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

.game-board-node__avatars--solo {
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-board-node__avatars--solo .game-board-node__avatar {
  width: 100%;
  height: 100%;
}

.game-board-node__avatars--solo .game-board-node__avatar :deep(.team-avatar-badge) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.game-board-node__avatar :deep(.team-avatar-badge img),
.game-board-move-token :deep(.team-avatar-badge img) {
  object-position: bottom;
}

/* Own team full-size on top; up to 3 smaller others in corners. */
.game-board-node__avatars--you-and-others .game-board-node__avatar--you {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.game-board-node__avatars--you-and-others .game-board-node__avatar--you :deep(.team-avatar-badge) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.game-board-node__avatars--you-and-others .game-board-node__avatar--other {
  position: absolute;
  z-index: 1;
}

.game-board-node__avatars--you-and-others .game-board-node__avatar--other-0 {
  top: 0;
  left: 0;
}

.game-board-node__avatars--you-and-others .game-board-node__avatar--other-1 {
  top: 0;
  right: 0;
}

.game-board-node__avatars--you-and-others .game-board-node__avatar--other-2 {
  bottom: 0;
  right: 0;
}

/* No own team on field: up to 4 mini avatars in corners. */
.game-board-node__avatars--others-only .game-board-node__avatar--other {
  position: absolute;
  z-index: 1;
}

.game-board-node__avatars--others-only .game-board-node__avatar--other-0 {
  top: 0;
  left: 0;
}

.game-board-node__avatars--others-only .game-board-node__avatar--other-1 {
  top: 0;
  right: 0;
}

.game-board-node__avatars--others-only .game-board-node__avatar--other-2 {
  bottom: 0;
  left: 0;
}

.game-board-node__avatars--others-only .game-board-node__avatar--other-3 {
  bottom: 0;
  right: 0;
}

.game-board-move-token {
  transition:
    left 120ms ease-out,
    top 120ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .game-board-move-token {
    transition: none;
  }
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
