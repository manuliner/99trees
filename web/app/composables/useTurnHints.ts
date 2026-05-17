import type { EditionConfig } from '#shared/types'
import type { Ref } from 'vue'

export type TurnHintStation = {
  hintVague?: string
  hintLevel1?: string
  hintLevel2?: string
}

export type HintTooltipSection = {
  label: string
  text: string
}

export type TurnForHints = {
  hintUnlockAt?: number[]
  hintMode?: string | null
  hintsUsed?: number[]
  canRevealAll?: boolean
  station?: TurnHintStation | null
}

export function useTurnHints(
  turn: Ref<TurnForHints | null | undefined>,
  hintCosts: Ref<EditionConfig['hintCosts'] | undefined>,
  now: Ref<number>,
  options?: { hasMapImage?: Ref<boolean> },
) {
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
    return `−${costs[level - 1]} points`
  })

  const showAllPenalty = computed(() => {
    const cost = hintCosts.value?.revealAll
    return cost != null ? `−${cost} points` : ''
  })

  const revealedHintCount = computed(() => {
    if (turn.value?.hintMode === 'reveal_all') return 3
    const used = turn.value?.hintsUsed ?? []
    return used.filter((l) => l >= 1 && l <= 3).length
  })

  const showRevealedCount = computed(() => revealedHintCount.value > 0)

  const revealedHintSections = computed((): HintTooltipSection[] => {
    const station = turn.value?.station
    const sections: HintTooltipSection[] = []
    if (station?.hintVague) sections.push({ label: 'Area', text: station.hintVague })
    if (hintVisible(1) && station?.hintLevel1) {
      sections.push({ label: 'Hint 1', text: station.hintLevel1 })
    }
    if (hintVisible(2) && station?.hintLevel2) {
      sections.push({ label: 'Hint 2', text: station.hintLevel2 })
    }
    if (hintVisible(3)) {
      const mapOk = options?.hasMapImage?.value !== false
      sections.push({
        label: 'Hint 3',
        text: mapOk
          ? 'Map pin — see festival map above.'
          : 'Map unavailable — festival map not uploaded.',
      })
    }
    return sections
  })

  const revealedHintsTooltip = computed(() =>
    revealedHintSections.value.length === 0 ? 'No hints revealed yet.' : '',
  )

  return {
    hintUnlocked,
    hintVisible,
    formatCountdown,
    nextClaimableLevel,
    nextLockedLevel,
    countdownMs,
    countdownLabel,
    showCountdown,
    allHintsVisible,
    showNowVisible,
    showAllVisible,
    showNowPenalty,
    showAllPenalty,
    revealedHintsTooltip,
    revealedHintSections,
    revealedHintCount,
    showRevealedCount,
  }
}
