<script setup lang="ts">
/** Pip positions on a 3×3 grid: [row, col] with 0-based indices. */
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

const props = withDefaults(
  defineProps<{
    value: number | null
    tooltip: string
    disabled?: boolean
    loading?: boolean
    interactive?: boolean
  }>(),
  {
    disabled: false,
    loading: false,
    interactive: true,
  },
)

const emit = defineEmits<{ click: [] }>()

function normalizeDice(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const faceValue = computed(() => normalizeDice(props.value))

const showPipFace = computed(
  () => faceValue.value != null && faceValue.value >= 1 && faceValue.value <= 6,
)

const activePips = computed(() => {
  if (!showPipFace.value || faceValue.value == null) return new Set<string>()
  const positions = PIP_LAYOUTS[faceValue.value] ?? []
  return new Set(positions.map(([r, c]) => `${r}-${c}`))
})

const isClickable = computed(
  () => props.interactive && !props.disabled && !props.loading,
)

function hasPip(row: number, col: number) {
  return activePips.value.has(`${row}-${col}`)
}

function onClick() {
  if (!isClickable.value) return
  emit('click')
}
</script>

<template>
  <PixelTooltip :text="tooltip" :gap="8">
    <div
      class="pixel-dice"
      :class="{
        'pixel-dice--interactive': isClickable,
        'pixel-dice--loading': loading,
      }"
    >
      <button
        type="button"
        class="pixel-dice__cube"
        :disabled="!isClickable"
        :aria-label="tooltip"
        @click="onClick"
      >
        <span class="pixel-dice__face">
          <span v-if="showPipFace" class="pixel-dice__pips" aria-hidden="true">
            <span
              v-for="row in 3"
              :key="`r-${row}`"
              class="pixel-dice__row"
            >
              <span
                v-for="col in 3"
                :key="`c-${col}`"
                class="pixel-dice__cell"
              >
                <span
                  v-if="hasPip(row - 1, col - 1)"
                  class="pixel-dice__pip"
                  :class="{ 'pixel-dice__pip--solo': faceValue === 1 }"
                />
              </span>
            </span>
          </span>
          <span
            v-else-if="faceValue != null"
            class="pixel-dice__digit"
            aria-hidden="true"
          >{{ faceValue }}</span>
          <span v-else class="pixel-dice__digit pixel-dice__digit--idle" aria-hidden="true">?</span>
          <span class="sr-only">{{ faceValue ?? 'Not rolled' }}</span>
        </span>
      </button>
    </div>
  </PixelTooltip>
</template>

<style scoped>
.pixel-dice {
  width: 3.75rem;
  height: 3.75rem;
  filter: drop-shadow(3px 5px 0 rgb(26 28 44 / 0.35));
}

.pixel-dice__cube {
  position: relative;
  display: block;
  width: 3.5rem;
  height: 3.5rem;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: default;
  transition:
    transform 0.15s ease,
    filter 0.15s ease;
}

.pixel-dice__face {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 3px solid var(--pixel-forest-dark);
  background: var(--pixel-dice-face);
  box-shadow:
    inset 3px 3px 0 var(--pixel-dice-highlight),
    inset -3px -3px 0 var(--pixel-dice-shadow),
    4px 4px 0 var(--pixel-forest-dark);
}

.pixel-dice__pips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0;
  width: 2.5rem;
  height: 2.5rem;
}

.pixel-dice__row {
  display: contents;
}

.pixel-dice__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
}

.pixel-dice__pip {
  width: 0.5625rem;
  height: 0.5625rem;
  border-radius: 50%;
  background: var(--pixel-forest-dark);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.25);
}

.pixel-dice__pip--solo {
  width: 0.8125rem;
  height: 0.8125rem;
  background: var(--pixel-cream);
  border: 2px solid var(--pixel-forest-dark);
  box-shadow: none;
}

.pixel-dice__digit {
  font-family: 'Press Start 2P', monospace;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--pixel-cream);
  text-shadow:
    2px 2px 0 var(--pixel-forest-dark),
    -1px -1px 0 var(--pixel-dice-shadow);
}

.pixel-dice__digit--idle {
  font-size: 1rem;
  opacity: 0.85;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.pixel-dice--interactive .pixel-dice__cube {
  cursor: pointer;
}

@media (hover: hover) {
  .pixel-dice--interactive:hover .pixel-dice__cube,
  .pixel-dice--interactive:focus-visible .pixel-dice__cube {
    transform: translateY(-10px);
    filter: drop-shadow(4px 10px 0 rgb(26 28 44 / 0.4));
  }
}

.pixel-dice__cube:active:not(:disabled) {
  transform: translate(2px, 2px);
  filter: drop-shadow(1px 2px 0 rgb(26 28 44 / 0.35));
}

.pixel-dice__cube:active:not(:disabled) .pixel-dice__face {
  box-shadow:
    inset 2px 2px 0 var(--pixel-dice-highlight),
    inset -2px -2px 0 var(--pixel-dice-shadow),
    2px 2px 0 var(--pixel-forest-dark);
}

.pixel-dice__cube:disabled {
  opacity: 0.6;
}

.pixel-dice--loading .pixel-dice__cube {
  animation: pixel-dice-wiggle 0.5s ease-in-out infinite;
}

@keyframes pixel-dice-wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-6deg);
  }
  75% {
    transform: rotate(6deg);
  }
}
</style>
