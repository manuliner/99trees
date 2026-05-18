<script setup lang="ts">
import type { TurnScoreBreakdown } from '#shared/scoring'

const props = defineProps<{
  open: boolean
  breakdown: TurnScoreBreakdown | null
  newScore: number | null
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

type ScoreLine = { key: string; label: string; value: number; sign: 'plus' | 'minus' }

const gainedLines = computed((): ScoreLine[] => {
  const b = props.breakdown
  if (!b) return []
  const lines: ScoreLine[] = []
  if (b.base > 0) lines.push({ key: 'base', label: t('play.turnScore.base'), value: b.base, sign: 'plus' })
  if (b.timeBonus > 0) lines.push({ key: 'time', label: t('play.turnScore.time'), value: b.timeBonus, sign: 'plus' })
  if (b.crewBonus > 0) lines.push({ key: 'crew', label: t('play.turnScore.crewBonus'), value: b.crewBonus, sign: 'plus' })
  return lines
})

const deductedLines = computed((): ScoreLine[] => {
  const b = props.breakdown
  if (!b) return []
  const lines: ScoreLine[] = []
  if (b.hintsDuringTurn > 0) {
    lines.push({
      key: 'hintsDuring',
      label: t('play.turnScore.hintsDuringTurn'),
      value: b.hintsDuringTurn,
      sign: 'minus',
    })
  }
  if (b.hintsAtConfirm > 0) {
    lines.push({
      key: 'hintsConfirm',
      label: t('play.turnScore.hintsAtConfirm'),
      value: b.hintsAtConfirm,
      sign: 'minus',
    })
  }
  if (b.quizPenalty > 0) {
    lines.push({
      key: 'quiz',
      label: t('play.turnScore.quizPenalty'),
      value: b.quizPenalty,
      sign: 'minus',
    })
  }
  return lines
})

const totalDelta = computed(() => props.breakdown?.total ?? 0)

function formatLine(line: ScoreLine) {
  return line.sign === 'plus'
    ? t('play.turnScore.linePlus', { n: line.value })
    : t('play.turnScore.lineMinus', { n: line.value })
}

function formatTotal(n: number) {
  return n >= 0 ? t('play.turnScore.linePlus', { n }) : t('play.turnScore.lineMinus', { n: Math.abs(n) })
}
</script>

<template>
  <PixelDialog
    :open="open && breakdown != null"
    :title="t('play.turnScore.title')"
    @close="emit('close')"
  >
    <p
      class="turn-score-summary__hero pixel-title text-center"
      :class="totalDelta >= 0 ? 'turn-score-summary__hero--plus' : 'turn-score-summary__hero--minus'"
    >
      {{ formatTotal(totalDelta) }}
    </p>

    <section v-if="gainedLines.length" class="turn-score-summary__section">
      <h3 class="turn-score-summary__heading pixel-body text-xs font-bold">
        {{ t('play.turnScore.gained') }}
      </h3>
      <ul class="turn-score-summary__list pixel-body text-sm">
        <li
          v-for="line in gainedLines"
          :key="line.key"
          class="turn-score-summary__row turn-score-summary__row--plus"
        >
          <span>{{ line.label }}</span>
          <span class="tabular-nums">{{ formatLine(line) }}</span>
        </li>
      </ul>
    </section>

    <section v-if="deductedLines.length" class="turn-score-summary__section">
      <h3 class="turn-score-summary__heading pixel-body text-xs font-bold">
        {{ t('play.turnScore.deducted') }}
      </h3>
      <ul class="turn-score-summary__list pixel-body text-sm">
        <li
          v-for="line in deductedLines"
          :key="line.key"
          class="turn-score-summary__row turn-score-summary__row--minus"
        >
          <span>{{ line.label }}</span>
          <span class="tabular-nums">{{ formatLine(line) }}</span>
        </li>
      </ul>
    </section>

    <p v-if="newScore != null" class="turn-score-summary__total pixel-body text-sm text-center opacity-90">
      {{ t('play.turnScore.newTotal', { n: newScore }) }}
    </p>

    <template #actions>
      <PixelButton variant="highlight" class="w-full" @click="emit('close')">
        {{ t('play.turnScore.continue') }}
      </PixelButton>
    </template>
  </PixelDialog>
</template>

<style scoped>
.turn-score-summary__hero {
  font-size: 1.25rem;
  line-height: 1.4;
  margin: 0.25rem 0 0.75rem;
}

.turn-score-summary__hero--plus {
  color: var(--pixel-score-plus);
}

.turn-score-summary__hero--minus {
  color: var(--pixel-score-minus);
}

.turn-score-summary__section + .turn-score-summary__section {
  margin-top: 1rem;
}

.turn-score-summary__heading {
  margin-bottom: 0.375rem;
  opacity: 0.85;
}

.turn-score-summary__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.turn-score-summary__row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.turn-score-summary__row--plus span:last-child {
  color: var(--pixel-score-plus);
  font-weight: 700;
}

.turn-score-summary__row--minus span:last-child {
  color: var(--pixel-score-minus);
  font-weight: 700;
}

.turn-score-summary__total {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 2px solid var(--pixel-forest-dark);
}
</style>
