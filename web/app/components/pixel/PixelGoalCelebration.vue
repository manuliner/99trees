<script setup lang="ts">
import { GOAL_CELEBRATION_RAIN_STYLE } from '~/config/goal-celebration'
import GoalCelebrationRainClassic from '~/components/pixel/goal-celebration/GoalCelebrationRainClassic.vue'
import GoalCelebrationRainWanderkarten from '~/components/pixel/goal-celebration/GoalCelebrationRainWanderkarten.vue'

const RAIN_MS = GOAL_CELEBRATION_RAIN_STYLE === 'classic' ? 6000 : 4500

const props = defineProps<{
  open: boolean
  scoreTotal: number
}>()

const emit = defineEmits<{
  close: []
  'open-leaderboard': []
}>()

const { t } = useI18n()

const rainStyle = GOAL_CELEBRATION_RAIN_STYLE

const phase = ref<'rain' | 'end'>('rain')
let endTimer: ReturnType<typeof setTimeout> | null = null

const prefersReducedMotion = ref(false)

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

function clearEndTimer() {
  if (endTimer != null) {
    clearTimeout(endTimer)
    endTimer = null
  }
}

function startSequence() {
  clearEndTimer()
  if (prefersReducedMotion.value) {
    phase.value = 'end'
    return
  }
  phase.value = 'rain'
  endTimer = setTimeout(() => {
    phase.value = 'end'
    endTimer = null
  }, RAIN_MS)
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) startSequence()
    else {
      clearEndTimer()
      phase.value = 'rain'
    }
  },
  { immediate: true },
)

onUnmounted(clearEndTimer)

function onDismiss() {
  emit('close')
}

function onLeaderboard() {
  emit('open-leaderboard')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="goal-celebration"
      :class="`goal-celebration--${rainStyle}`"
      role="dialog"
      aria-modal="true"
      :aria-label="t('play.goalCelebration.title')"
    >
      <GoalCelebrationRainClassic
        v-if="rainStyle === 'classic'"
        class="goal-celebration__rain-layer"
        :active="phase === 'rain'"
      />
      <GoalCelebrationRainWanderkarten
        v-else-if="phase === 'rain'"
        class="goal-celebration__rain-layer"
      />

      <Transition name="goal-celebration-end">
        <div
          v-if="phase === 'end'"
          class="goal-celebration__end"
        >
          <article class="goal-celebration__end-card pixel-card">
            <div
              v-if="rainStyle === 'wanderkarten'"
              class="goal-celebration__end-badge goal-celebration__end-badge--wander"
            >
              <svg class="goal-celebration__wander-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14 2 9.5h7.5z" />
              </svg>
            </div>
            <div
              v-else
              class="goal-celebration__end-badge goal-celebration__end-badge--classic"
            >
              <span class="goal-celebration__playing-corner goal-celebration__playing-corner--tl">
                <span class="goal-celebration__playing-rank">A</span>
                <span class="goal-celebration__playing-suit">♥</span>
              </span>
              <span class="goal-celebration__playing-center" aria-hidden="true">♥</span>
              <span class="goal-celebration__playing-corner goal-celebration__playing-corner--br">
                <span class="goal-celebration__playing-rank">A</span>
                <span class="goal-celebration__playing-suit">♥</span>
              </span>
            </div>
            <h2 class="pixel-title text-sm text-center" aria-live="polite">
              {{ t('play.goalCelebration.title') }}
            </h2>
            <p class="pixel-body text-xs text-center opacity-90">
              {{ t('play.goalCelebration.subtitle') }}
            </p>
            <p class="pixel-title text-center text-xs text-[var(--pixel-gold)]">
              {{ t('play.goalCelebration.score', { n: scoreTotal }) }}
            </p>
            <div class="goal-celebration__actions space-y-2">
              <PixelButton variant="highlight" class="w-full" @click="onLeaderboard">
                {{ t('play.goalCelebration.leaderboard') }}
              </PixelButton>
              <PixelButton variant="secondary" class="w-full" @click="onDismiss">
                {{ t('play.goalCelebration.dismiss') }}
              </PixelButton>
            </div>
          </article>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.goal-celebration {
  position: fixed;
  inset: 0;
  z-index: 55;
  pointer-events: auto;
  overflow: hidden;
  background: color-mix(in srgb, var(--pixel-forest-dark) 45%, transparent);
}

.goal-celebration--classic {
  background: transparent;
}

.goal-celebration__rain-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.goal-celebration__end {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--pixel-forest-mid) 42%, transparent);
}

.goal-celebration__end-card {
  width: 100%;
  max-width: 20rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.goal-celebration__end-badge {
  position: relative;
  margin: 0 auto 0.25rem;
  flex-shrink: 0;
}

.goal-celebration__end-badge--wander {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 4.75rem;
  background: var(--pixel-board-goal);
  color: var(--pixel-gold);
  border: 4px solid var(--pixel-forest-dark);
  box-shadow: var(--pixel-shadow);
}

.goal-celebration__wander-icon {
  width: 1.75rem;
  height: 1.75rem;
}

.goal-celebration__end-badge--classic {
  width: 3.25rem;
  height: 4.5rem;
  background: var(--pixel-cream);
  border: 2px solid var(--pixel-forest-dark);
  border-radius: 3px;
  box-shadow:
    1px 1px 0 var(--pixel-forest-dark),
    3px 3px 0 color-mix(in srgb, var(--pixel-forest-dark) 25%, transparent);
  color: var(--pixel-dice-pip-accent);
}

.goal-celebration__playing-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
}

.goal-celebration__playing-corner--tl {
  top: 3px;
  left: 4px;
  font-size: 9px;
}

.goal-celebration__playing-corner--br {
  bottom: 3px;
  right: 4px;
  transform: rotate(180deg);
  font-size: 9px;
}

.goal-celebration__playing-rank {
  font-size: 10px;
}

.goal-celebration__playing-suit {
  font-size: 8px;
}

.goal-celebration__playing-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  opacity: 0.35;
}

.goal-celebration-end-enter-active,
.goal-celebration-end-leave-active {
  transition: opacity 0.25s ease;
}

.goal-celebration-end-enter-from,
.goal-celebration-end-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .goal-celebration :deep(.goal-rain-wander),
  .goal-celebration :deep(.goal-rain-classic) {
    display: none;
  }
}
</style>
