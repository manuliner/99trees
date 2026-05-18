<script setup lang="ts">
type CardVariant = 'goal' | 'dice' | 'station' | 'flock' | 'score'

const CARD_COUNT = 28
const VARIANTS: CardVariant[] = ['goal', 'dice', 'station', 'flock', 'score']

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

type FallingCard = {
  id: number
  variant: CardVariant
  stationNum: number
  diceFace: number
  leftPct: number
  delayMs: number
  durationMs: number
  rotStart: number
  rotEnd: number
  driftPx: number
}

const fallingCards = computed((): FallingCard[] => {
  return Array.from({ length: CARD_COUNT }, (_, i) => {
    const variant = VARIANTS[i % VARIANTS.length]!
    return {
      id: i,
      variant,
      stationNum: (i * 7) % 9 + 1,
      diceFace: (i % 6) + 1,
      leftPct: 4 + ((i * 37) % 88),
      delayMs: (i * 110) % 2200,
      durationMs: 2800 + (i % 5) * 280,
      rotStart: -18 + (i % 7) * 6,
      rotEnd: 12 + (i % 5) * 8,
      driftPx: -30 + (i % 9) * 12,
    }
  })
})

function dicePips(face: number): Set<string> {
  const positions = PIP_LAYOUTS[face] ?? []
  return new Set(positions.map(([r, c]) => `${r}-${c}`))
}

function hasPip(face: number, row: number, col: number) {
  return dicePips(face).has(`${row}-${col}`)
}
</script>

<template>
  <div class="goal-rain-wander" aria-hidden="true">
    <div
      v-for="card in fallingCards"
      :key="card.id"
      class="goal-rain-wander__card"
      :class="`goal-rain-wander__card--${card.variant}`"
      :style="{
        '--card-left': `${card.leftPct}%`,
        '--card-delay': `${card.delayMs}ms`,
        '--card-duration': `${card.durationMs}ms`,
        '--card-rot-start': `${card.rotStart}deg`,
        '--card-rot-end': `${card.rotEnd}deg`,
        '--card-drift': `${card.driftPx}px`,
      }"
    >
      <div class="goal-rain-wander__card-inner">
        <svg
          v-if="card.variant === 'goal'"
          class="goal-rain-wander__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14 2 9.5h7.5z" />
        </svg>
        <span
          v-else-if="card.variant === 'station'"
          class="goal-rain-wander__station-num pixel-title"
        >{{ card.stationNum }}</span>
        <svg
          v-else-if="card.variant === 'flock'"
          class="goal-rain-wander__icon goal-rain-wander__icon--flock"
          viewBox="0 0 24 16"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M2 12c2-3 4-4 6-4s4 1 6 4H2zm8-6c1.5-2 3-3 5-3 2 0 3.5 1 4 3-2 .5-3.5 1.5-5 3-1.5-1.5-3-2.5-4-3z" />
        </svg>
        <span
          v-else-if="card.variant === 'score'"
          class="goal-rain-wander__plus pixel-title"
        >+</span>
        <span
          v-else-if="card.variant === 'dice'"
          class="goal-rain-wander__mini-dice"
          aria-hidden="true"
        >
          <span
            v-for="row in 3"
            :key="`r-${row}`"
            class="goal-rain-wander__dice-row"
          >
            <span
              v-for="col in 3"
              :key="`c-${col}`"
              class="goal-rain-wander__dice-cell"
            >
              <span
                v-if="hasPip(card.diceFace, row - 1, col - 1)"
                class="goal-rain-wander__pip"
              />
            </span>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.goal-rain-wander {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.goal-rain-wander__card {
  position: absolute;
  top: 0;
  left: var(--card-left);
  width: 2.5rem;
  height: 3.5rem;
  margin-left: -1.25rem;
  animation: wander-card-fall var(--card-duration) var(--card-delay) ease-in forwards;
  will-change: transform;
}

.goal-rain-wander__card-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 4px solid var(--pixel-forest-dark);
  box-shadow: var(--pixel-shadow);
}

.goal-rain-wander__card--goal .goal-rain-wander__card-inner {
  background: var(--pixel-board-goal);
  color: var(--pixel-gold);
}

.goal-rain-wander__card--dice .goal-rain-wander__card-inner {
  background: var(--pixel-cream);
}

.goal-rain-wander__card--station .goal-rain-wander__card-inner {
  background: var(--pixel-board-done);
  color: var(--pixel-board-done-text);
}

.goal-rain-wander__card--flock .goal-rain-wander__card-inner {
  background: var(--pixel-forest-mid);
  color: var(--pixel-cream);
}

.goal-rain-wander__card--score .goal-rain-wander__card-inner {
  background: var(--pixel-cream);
  color: var(--pixel-score-plus);
}

.goal-rain-wander__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.goal-rain-wander__icon--flock {
  width: 1.5rem;
  height: 1rem;
}

.goal-rain-wander__station-num {
  font-size: 1.125rem;
  line-height: 1;
}

.goal-rain-wander__plus {
  font-size: 1.5rem;
  line-height: 1;
}

.goal-rain-wander__mini-dice {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  width: 1.125rem;
  height: 1.125rem;
}

.goal-rain-wander__dice-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.goal-rain-wander__dice-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.goal-rain-wander__pip {
  width: 3px;
  height: 3px;
  background: var(--pixel-dice-face);
}

@keyframes wander-card-fall {
  0% {
    transform: translate3d(0, -15vh, 0) rotate(var(--card-rot-start));
    opacity: 1;
  }
  72% {
    transform: translate3d(var(--card-drift), 78vh, 0) rotate(var(--card-rot-end));
    opacity: 1;
  }
  88% {
    transform: translate3d(calc(var(--card-drift) * 0.6), 72vh, 0) rotate(var(--card-rot-end));
  }
  100% {
    transform: translate3d(var(--card-drift), 95vh, 0) rotate(var(--card-rot-end));
    opacity: 0;
  }
}
</style>
