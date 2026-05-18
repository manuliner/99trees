import type { EditionConfig } from '#shared/types'
import type { LocalizedString } from '#shared/localized'
import type { Ref } from 'vue'

export type TurnHintTask = {
  hintVague?: LocalizedString | string
  hintLevel1?: LocalizedString | string
  hintLevel2?: LocalizedString | string
}

export type TurnForHints = {
  hintUnlockAt?: number[]
  hintMode?: string | null
  hintsUsed?: number[]
  canRevealAll?: boolean
  task?: TurnHintTask | null
}

export function useTurnHints(
  turn: Ref<TurnForHints | null | undefined>,
  hintCosts: Ref<EditionConfig['hintCosts'] | undefined>,
  now: Ref<number>,
  options?: { hasMapImage?: Ref<boolean> },
) {
  const { t } = useI18n()
  function hintUnlocked(level: number) {
    const unlock = turn.value?.hintUnlockAt?.[level - 1]
    if (!unlock) return false
    return turn.value?.hintMode === 'reveal_all' || now.value >= unlock
  }

  function hintVisible(level: number) {
    return turn.value?.hintsUsed?.includes(level) || turn.value?.hintMode === 'reveal_all'
  }

  function formatCountdown(ms: number) {
    const s = Math.max(0, Math.ceil((ms - now.value) / 1000))
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  const nextClaimableLevel = computed((): 1 | 2 | 3 | null => {
    for (const level of [1, 2, 3] as const) {
      if (hintUnlocked(level) && !hintVisible(level)) return level
    }
    return null
  })

  const nextLockedLevel = computed((): 1 | 2 | 3 | null => {
    for (const level of [1, 2, 3] as const) {
      if (!hintUnlocked(level)) return level
    }
    return null
  })

  const countdownMs = computed(() => {
    if (nextClaimableLevel.value != null) return null
    const locked = nextLockedLevel.value
    if (locked == null) return null
    return turn.value?.hintUnlockAt?.[locked - 1] ?? null
  })

  const countdownLabel = computed(() => {
    const ms = countdownMs.value
    return ms != null ? formatCountdown(ms) : ''
  })

  const showCountdown = computed(() => countdownMs.value != null)

  const allHintsVisible = computed(() => {
    if (turn.value?.hintMode === 'reveal_all') return true
    return hintVisible(1) && hintVisible(2) && hintVisible(3)
  })

  const showNowVisible = computed(() => nextClaimableLevel.value != null)

  const showAllVisible = computed(
    () =>
      Boolean(turn.value?.canRevealAll)
      && turn.value?.hintMode !== 'reveal_all'
      && !allHintsVisible.value,
  )

  const showNowPenalty = computed(() => {
    const level = nextClaimableLevel.value
    const costs = hintCosts.value?.wait
    if (level == null || !costs) return ''
    return t('common.pointsPenalty', { n: costs[level - 1] })
  })

  const showAllPenalty = computed(() => {
    const cost = hintCosts.value?.revealAll
    return cost != null ? t('common.pointsPenalty', { n: cost }) : ''
  })

  const hint3Text = computed(() => {
    const mapOk = options?.hasMapImage?.value !== false
    return mapOk ? t('hints.mapBelow') : t('hints.mapUnavailable')
  })

  const revealedHintCount = computed(() => {
    if (turn.value?.hintMode === 'reveal_all') return 3
    const used = turn.value?.hintsUsed ?? []
    return used.filter((l) => l >= 1 && l <= 3).length
  })

  const showRevealedCount = computed(() => revealedHintCount.value > 0)

  const nextHintLevel = computed((): 1 | 2 | 3 | null =>
    nextClaimableLevel.value ?? nextLockedLevel.value,
  )

  return {
    hintUnlocked,
    hintVisible,
    formatCountdown,
    nextClaimableLevel,
    nextLockedLevel,
    nextHintLevel,
    countdownMs,
    countdownLabel,
    showCountdown,
    allHintsVisible,
    showNowVisible,
    showAllVisible,
    showNowPenalty,
    showAllPenalty,
    hint3Text,
    revealedHintCount,
    showRevealedCount,
  }
}
