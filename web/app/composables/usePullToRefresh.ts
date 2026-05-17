export type PullToRefreshHandler = () => void | Promise<void>

export interface PullToRefreshContext {
  register: (handler: PullToRefreshHandler) => () => void
  disabled: Ref<boolean>
}

const pullToRefreshKey: InjectionKey<PullToRefreshContext> = Symbol('pullToRefresh')

const THRESHOLD_PX = 72
const MAX_PULL_PX = 120
const PULL_RESISTANCE = 0.45

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function usePullToRefreshProvider() {
  const handlers = new Set<PullToRefreshHandler>()
  const disabled = ref(false)
  const pullDistance = ref(0)
  const isRefreshing = ref(false)

  let touchStartY = 0
  let tracking = false

  function register(handler: PullToRefreshHandler) {
    if (typeof handler !== 'function') return () => {}
    handlers.add(handler)
    return () => handlers.delete(handler)
  }

  function purgeInvalidHandlers() {
    for (const entry of handlers) {
      if (typeof entry !== 'function') handlers.delete(entry)
    }
  }

  provide(pullToRefreshKey, { register, disabled })

  async function runRefresh() {
    if (isRefreshing.value) return
    isRefreshing.value = true
    pullDistance.value = THRESHOLD_PX
    try {
      await refreshNuxtData()
      purgeInvalidHandlers()
      await Promise.all(
        [...handlers].map((handler) => Promise.resolve(handler())),
      )
    }
    finally {
      isRefreshing.value = false
      pullDistance.value = 0
    }
  }

  function onTouchStart(e: TouchEvent) {
    if (disabled.value || isRefreshing.value) return
    if (window.scrollY > 2) return
    if (isEditableTarget(e.target)) return
    touchStartY = e.touches[0]?.clientY ?? 0
    tracking = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking || disabled.value || isRefreshing.value) return
    const y = e.touches[0]?.clientY ?? 0
    const delta = y - touchStartY
    if (delta <= 0) {
      pullDistance.value = 0
      return
    }
    if (window.scrollY > 2) {
      tracking = false
      pullDistance.value = 0
      return
    }
    e.preventDefault()
    pullDistance.value = Math.min(MAX_PULL_PX, delta * PULL_RESISTANCE)
  }

  function onTouchEnd() {
    if (!tracking) return
    tracking = false
    if (pullDistance.value >= THRESHOLD_PX) {
      void runRefresh()
      return
    }
    pullDistance.value = 0
  }

  function bindTouch() {
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
  }

  function unbindTouch() {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchEnd)
  }

  const ready = computed(() => pullDistance.value >= THRESHOLD_PX)

  return {
    pullDistance,
    isRefreshing,
    ready,
    bindTouch,
    unbindTouch,
    runRefresh,
  }
}

type PullToRefreshHandlerSource =
  | PullToRefreshHandler
  | Ref<PullToRefreshHandler | undefined>

function resolvePullToRefreshHandler(
  handler?: PullToRefreshHandlerSource,
): PullToRefreshHandler | undefined {
  if (handler == null) return undefined
  return isRef(handler) ? handler.value : handler
}

/** Register extra refresh work (e.g. manual polls). `refreshNuxtData` always runs on pull. */
export function usePullToRefresh(handler?: PullToRefreshHandlerSource) {
  const ctx = inject(pullToRefreshKey, null)
  if (!ctx) return

  let unregister: (() => void) | undefined

  watch(
    () => resolvePullToRefreshHandler(handler),
    (fn) => {
      unregister?.()
      unregister = undefined
      if (typeof fn !== 'function') return
      unregister = ctx.register(fn)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    unregister?.()
    unregister = undefined
  })
}

export function usePullToRefreshDisabled(disabled: MaybeRefOrGetter<boolean>) {
  const ctx = inject(pullToRefreshKey, null)
  if (!ctx) return

  watch(
    () => toValue(disabled),
    (value) => {
      ctx.disabled.value = value
    },
    { immediate: true },
  )
}
