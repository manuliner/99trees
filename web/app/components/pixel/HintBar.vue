<script setup lang="ts">
import type { EditionConfig } from '#shared/types'
import type { TurnForHints } from '~/composables/useTurnHints'

const props = defineProps<{
  turn: TurnForHints
  hintCosts: EditionConfig['hintCosts']
  hasMapImage: boolean
  disabled?: boolean
  now: number
}>()

const emit = defineEmits<{
  showNow: [level: 1 | 2 | 3]
  showAll: []
}>()

const turnRef = toRef(() => props.turn)
const costsRef = toRef(() => props.hintCosts)
const nowRef = toRef(() => props.now)
const hasMapRef = toRef(() => props.hasMapImage)

const {
  nextClaimableLevel,
  countdownLabel,
  showCountdown,
  showNowVisible,
  showAllVisible,
  showNowPenalty,
  revealedHintsTooltip,
  revealedHintSections,
  revealedHintCount,
  showRevealedCount,
} = useTurnHints(turnRef, costsRef, nowRef, { hasMapImage: hasMapRef })

const badgeDigit = computed((): 1 | 2 | 3 | null => {
  const n = revealedHintCount.value
  if (n === 1 || n === 2 || n === 3) return n
  return null
})

const tipsTooltipRef = ref<{ show: () => void } | null>(null)

function onShowNow() {
  const level = nextClaimableLevel.value
  if (level != null) emit('showNow', level)
}

function showTipsPopover() {
  nextTick(() => tipsTooltipRef.value?.show())
}

defineExpose({ showTipsPopover })
</script>

<template>
  <div
    class="hint-bar"
    role="group"
    aria-label="Tips"
  >
    <div class="hint-bar__lead">
      <PixelTooltip
        ref="tipsTooltipRef"
        :text="revealedHintsTooltip"
        :sections="revealedHintSections"
        :gap="8"
        hints
        multiline
        toggle-on-click
      >
        <button
          type="button"
          class="hint-bar__icon-btn"
          :aria-label="showRevealedCount ? `${revealedHintCount} hints revealed` : 'Revealed hints'"
          :disabled="disabled"
        >
          <span class="hint-bar__icon-wrap">
            <PixelHintIcon />
            <span
              v-if="showRevealedCount && badgeDigit != null"
              class="hint-bar__badge"
              aria-hidden="true"
            >
              <PixelBadgeDigit :value="badgeDigit" />
            </span>
          </span>
        </button>
      </PixelTooltip>
      <span class="hint-bar__label">Tips</span>
    </div>

    <div class="hint-bar__controls">
      <span
        v-if="showCountdown"
        class="hint-bar__timer"
        aria-live="polite"
      >
        {{ countdownLabel }}
      </span>

      <PixelTooltip
      v-if="showNowVisible"
      :text="showNowPenalty"
      :gap="6"
      toggle-on-click
    >
      <button
        type="button"
        class="hint-bar__action"
        :disabled="disabled"
        @click.stop="onShowNow"
      >
        <span class="hint-bar__action-long">Reveal now</span>
        <span class="hint-bar__action-short">Now</span>
      </button>
    </PixelTooltip>

      <button
        v-if="showAllVisible"
        type="button"
        class="hint-bar__action"
        :disabled="disabled"
        @click.stop="emit('showAll')"
      >
        <span class="hint-bar__action-long">Reveal all</span>
        <span class="hint-bar__action-short">All</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hint-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.5rem 0.65rem;
  overflow: visible;
}

.hint-bar__lead {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.hint-bar__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  min-height: 3.5rem;
  padding-top: 0.15rem;
}

.hint-bar__label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  line-height: 1.4;
  color: var(--pixel-forest-dark);
  opacity: 0.9;
  text-align: center;
  white-space: nowrap;
}

.hint-bar__icon-wrap {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.hint-bar__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3.5rem;
  padding: 0 4px;
  margin: 0;
  overflow: visible;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  transition: transform 0.12s ease;
}

.hint-bar__badge {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  padding: 1px;
  border: 2px solid var(--pixel-forest-dark);
  background: var(--pixel-cream);
  box-shadow: 1px 1px 0 var(--pixel-forest-dark);
  transform: translate(15%, 8%);
  pointer-events: none;
}

.hint-bar__icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (hover: hover) {
  .hint-bar__icon-btn:not(:disabled):hover {
    transform: scale(1.08);
  }
}

.hint-bar__timer {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  line-height: 1.6;
  min-width: 2.75rem;
  text-align: center;
  color: var(--pixel-forest-dark);
  font-variant-numeric: tabular-nums;
}

.hint-bar__action {
  padding: 0.2rem 0.35rem;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  line-height: 1.5;
  text-decoration: underline;
  text-underline-offset: 3px;
  color: var(--pixel-forest-dark);
  background: transparent;
  border: none;
  cursor: pointer;
}

.hint-bar__action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.hint-bar__action-short {
  display: none;
}

@media (max-width: 380px) {
  .hint-bar__action-long {
    display: none;
  }

  .hint-bar__action-short {
    display: inline;
  }
}
</style>
