const STORAGE_PREFIX = '99trees:goal-celebration:'

function storageKey(teamId: number) {
  return `${STORAGE_PREFIX}${teamId}`
}

function hasSeenCelebration(teamId: number): boolean {
  if (!import.meta.client) return false
  return sessionStorage.getItem(storageKey(teamId)) === '1'
}

function markCelebrationSeen(teamId: number) {
  if (!import.meta.client) return
  sessionStorage.setItem(storageKey(teamId), '1')
}

export function useGoalCelebration(options: {
  teamId: ComputedRef<number | undefined>
  reachedGoal: ComputedRef<boolean | undefined>
  turnScoreSummary: Ref<{ breakdown: unknown; newScore: number } | null>
}) {
  const celebrationOpen = ref(false)
  const pendingCelebration = ref(false)
  const prevReachedGoal = ref<boolean | undefined>(undefined)

  function openCelebration(opts?: { force?: boolean }) {
    const id = options.teamId.value
    if (id == null) return
    const force = opts?.force === true
    if (!force && hasSeenCelebration(id)) return
    celebrationOpen.value = true
    if (!force) markCelebrationSeen(id)
  }

  function closeCelebration() {
    celebrationOpen.value = false
  }

  function triggerDevPreview() {
    openCelebration({ force: true })
  }

  function tryStartCelebration() {
    if (!pendingCelebration.value) return
    if (options.turnScoreSummary.value != null) return
    const id = options.teamId.value
    if (id == null || !options.reachedGoal.value) {
      pendingCelebration.value = false
      return
    }
    if (hasSeenCelebration(id)) {
      pendingCelebration.value = false
      return
    }
    pendingCelebration.value = false
    openCelebration()
  }

  function scheduleGoalCelebration() {
    pendingCelebration.value = true
    tryStartCelebration()
  }

  watch(
    () => options.reachedGoal.value,
    (reached) => {
      const was = prevReachedGoal.value
      prevReachedGoal.value = !!reached
      if (was === undefined) return
      if (reached && !was) scheduleGoalCelebration()
    },
    { immediate: true },
  )

  watch(
    () => options.turnScoreSummary.value,
    (current, previous) => {
      if (previous != null && current == null) tryStartCelebration()
    },
  )

  return {
    celebrationOpen,
    scheduleGoalCelebration,
    triggerDevPreview,
    closeCelebration,
  }
}
