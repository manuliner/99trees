<script setup lang="ts">
import type { EditionConfig } from '#shared/types'
import type { TurnForHints } from '~/composables/useTurnHints'

const props = defineProps<{
  turn: TurnForHints
  hintCosts: EditionConfig['hintCosts']
  hasMapImage: boolean
  disabled?: boolean
  now: number
  /** Rows inside the play-page seeking card body */
  embedded?: boolean
}>()

const emit = defineEmits<{
  showNow: [level: 1 | 2 | 3]
  showAll: []
}>()

const { t } = useI18n()

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
  showAllPenalty,
} = useTurnHints(turnRef, costsRef, nowRef, { hasMapImage: hasMapRef })

const showNextRow = computed(() => showCountdown.value || showNowVisible.value)

function onShowNow() {
  const level = nextClaimableLevel.value
  if (level != null) emit('showNow', level)
}
</script>

<template>
  <template v-if="embedded">
    <div
      v-if="showNextRow"
      class="pixel-body text-sm seeking-card__hint-line"
      role="group"
      :aria-label="t('hints.revealNextAria')"
    >
      <span
        v-if="showCountdown"
        class="seeking-card__hint-timer"
        aria-live="polite"
      >
        {{ countdownLabel }}
      </span>
      <span
        v-if="showCountdown && showNowVisible"
        class="seeking-card__hint-sep"
        aria-hidden="true"
      >/</span>
      <PixelTooltip
        v-if="showNowVisible"
        :text="showNowPenalty"
        :gap="6"
        toggle-on-click
      >
        <button
          type="button"
          class="seeking-card__hint-action"
          :disabled="disabled"
          @click.stop="onShowNow"
        >
          {{ t('hints.revealNow') }}{{ showNowPenalty ? ` (${showNowPenalty})` : '' }}
        </button>
      </PixelTooltip>
    </div>

    <hr
      v-if="showNextRow && showAllVisible"
      class="seeking-card__hint-divider"
      aria-hidden="true"
    >

    <div
      v-if="showAllVisible"
      class="pixel-body text-sm seeking-card__hint-line seeking-card__hint-line--center"
    >
      <button
        type="button"
        class="seeking-card__hint-action"
        :disabled="disabled"
        @click.stop="emit('showAll')"
      >
        {{ t('hints.revealAll') }}{{ showAllPenalty ? ` (${showAllPenalty})` : '' }}
      </button>
    </div>
  </template>

  <div
    v-else
    class="hint-bar"
    role="group"
    :aria-label="t('hints.revealHintsAria')"
  >
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
        {{ t('hints.revealNow') }}
      </button>
    </PixelTooltip>
    <button
      v-if="showAllVisible"
      type="button"
      class="hint-bar__action"
      :disabled="disabled"
      @click.stop="emit('showAll')"
    >
      {{ t('hints.revealAll') }}
    </button>
  </div>
</template>

<style scoped>
.hint-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem 0.65rem;
  overflow: visible;
}

.hint-bar__timer {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  line-height: 1.6;
  min-width: 2.75rem;
  text-align: left;
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
</style>
