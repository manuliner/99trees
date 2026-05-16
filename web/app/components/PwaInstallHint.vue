<script setup lang="ts">
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

const visible = ref(false)
let deferredPrompt: InstallPromptEvent | null = null

onMounted(() => {
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as InstallPromptEvent
    visible.value = true
  })
})

async function install() {
  if (!deferredPrompt) return
  await deferredPrompt.prompt()
  visible.value = false
  deferredPrompt = null
}

function dismiss() {
  visible.value = false
  localStorage.setItem('pwa-install-dismissed', '1')
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-4 left-4 right-4 z-50 pixel-card p-4 space-y-2 max-w-md mx-auto shadow-lg"
  >
    <p class="pixel-title text-xs">Install Zugvögel</p>
    <p class="pixel-body text-xs">Add to your home screen for faster access at the festival.</p>
    <div class="flex gap-2">
      <PixelButton class="flex-1" @click="install">Install</PixelButton>
      <PixelButton variant="secondary" class="flex-1" @click="dismiss">Not now</PixelButton>
    </div>
  </div>
</template>
