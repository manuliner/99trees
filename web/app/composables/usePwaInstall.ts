export type PwaInstallRole = 'player' | 'crew' | 'admin'

const LEGACY_DISMISSED_KEY = 'pwa-install-dismissed'
const AUTO_SHOWN_PREFIX = 'zugvoegel-pwa-install-shown:'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

let deferredPrompt: InstallPromptEvent | null = null
let listenerRegistered = false
const promptAvailable = ref(false)

function autoShownKey(role: PwaInstallRole) {
  return `${AUTO_SHOWN_PREFIX}${role}`
}

function hasAutoShown(role: PwaInstallRole): boolean {
  if (import.meta.server || typeof localStorage === 'undefined') return true
  if (localStorage.getItem(LEGACY_DISMISSED_KEY)) return true
  return localStorage.getItem(autoShownKey(role)) === '1'
}

function registerInstallPromptListener() {
  if (listenerRegistered || import.meta.server || typeof window === 'undefined') return
  listenerRegistered = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as InstallPromptEvent
    promptAvailable.value = true
  })
}

function detectStandalone(): boolean {
  if (import.meta.server || typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function detectIos(): boolean {
  if (import.meta.server || typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !(window as Window & { MSStream?: unknown }).MSStream
}

export function usePwaInstall(role: PwaInstallRole) {
  const isStandalone = ref(false)
  const isIos = ref(false)

  onMounted(() => {
    registerInstallPromptListener()
    isStandalone.value = detectStandalone()
    isIos.value = detectIos()
    promptAvailable.value = deferredPrompt != null
  })

  const canPromptInstall = computed(() => promptAvailable.value && deferredPrompt != null)

  function maybeAutoShow(open: () => void): boolean {
    if (import.meta.server) return false
    if (detectStandalone() || hasAutoShown(role)) return false
    open()
    return true
  }

  function markDismissed() {
    if (import.meta.server || typeof localStorage === 'undefined') return
    localStorage.setItem(autoShownKey(role), '1')
  }

  async function promptInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    deferredPrompt = null
    promptAvailable.value = false
  }

  return {
    role,
    isStandalone,
    isIos,
    canPromptInstall,
    maybeAutoShow,
    markDismissed,
    promptInstall,
  }
}
