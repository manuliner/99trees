import type { PendingApproval } from '#shared/types'

export function actionIdToRating(
  kind: PendingApproval['kind'],
  actionId: string,
): 'ok' | 'bonus' | null {
  if (kind !== 'performance') return null
  if (actionId === 'ok' || actionId === 'bonus') return actionId
  return null
}

export function useStaffApprovals(
  editionId: Ref<number | null | undefined>,
  options?: { asAdmin?: boolean; poll?: boolean },
) {
  const { api } = useGameApi()
  const pending = ref<PendingApproval[]>([])
  const loading = ref(false)
  const resolvingTurnId = ref<number | null>(null)

  const pendingCount = computed(() => pending.value.length)

  async function loadPending() {
    const id = editionId.value
    if (id == null) {
      pending.value = []
      return
    }
    loading.value = true
    try {
      const url = options?.asAdmin
        ? `/api/crew/pending?editionId=${id}`
        : '/api/crew/pending'
      const res = await api<{ pending: PendingApproval[] }>(url, { credentials: 'include' })
      pending.value = res.pending
    }
    catch {
      pending.value = []
    }
    finally {
      loading.value = false
    }
  }

  async function rate(item: PendingApproval, actionId: string) {
    const rating = actionIdToRating(item.kind, actionId)
    if (!rating) return

    resolvingTurnId.value = item.turnId
    try {
      await api('/api/crew/rate', {
        method: 'POST',
        body: { teamId: item.teamId, turnId: item.turnId, rating },
        credentials: 'include',
      })
      await loadPending()
    }
    finally {
      resolvingTurnId.value = null
    }
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null

  function startPoll() {
    if (!options?.poll || pollTimer) return
    pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      loadPending()
    }, 10_000)
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  watch(
    editionId,
    (id) => {
      stopPoll()
      if (id != null) {
        loadPending()
        if (options?.poll) startPoll()
      }
      else {
        pending.value = []
      }
    },
    { immediate: true },
  )

  onUnmounted(stopPoll)

  return {
    pending,
    pendingCount,
    loading,
    resolvingTurnId,
    loadPending,
    rate,
  }
}
