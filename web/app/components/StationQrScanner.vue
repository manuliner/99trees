<script setup lang="ts">
const props = withDefaults(
  defineProps<{ mode?: 'station' | 'team' }>(),
  { mode: 'station' },
)

const emit = defineEmits<{
  scanned: [payload: { slug: string; token: string }]
  close: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const error = ref('')
const scanning = ref(false)
let controls: { stop: () => void } | null = null

function parseQrUrl(raw: string): { slug: string; token: string } | null {
  try {
    const url = new URL(raw, window.location.origin)
    const pathPattern = props.mode === 'team' ? /\/t\/([^/]+)/ : /\/s\/([^/]+)/
    const match = url.pathname.match(pathPattern)
    const token = url.searchParams.get('t')
    if (!match?.[1] || !token) return null
    return { slug: match[1], token }
  }
  catch {
    return null
  }
}

onMounted(async () => {
  scanning.value = true
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const reader = new BrowserMultiFormatReader()
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
    controls = await reader.decodeFromVideoDevice(undefined, videoRef.value!, (result) => {
      if (!result) return
      const parsed = parseQrUrl(result.getText())
      if (parsed) {
        stop()
        emit('scanned', parsed)
      }
    })
  }
  catch (e) {
    error.value = 'Camera access denied or unavailable'
    console.warn(e)
  }
})

function stop() {
  scanning.value = false
  controls?.stop()
  controls = null
  const stream = videoRef.value?.srcObject as MediaStream | undefined
  stream?.getTracks().forEach((t) => t.stop())
}

onUnmounted(stop)
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black flex flex-col">
    <div class="p-4 flex justify-between items-center">
      <p class="pixel-title text-xs text-[var(--pixel-cream)]">Scan station QR</p>
      <button type="button" class="pixel-body text-sm text-[var(--pixel-cream)] underline" @click="emit('close'); stop()">
        Close
      </button>
    </div>
    <div class="flex-1 relative flex items-center justify-center">
      <video ref="videoRef" class="w-full h-full object-cover" playsinline muted />
      <div
        class="absolute inset-8 border-4 border-[var(--pixel-sunrise)] pointer-events-none"
        style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.4)"
      />
    </div>
    <p v-if="error" class="p-4 text-center text-[var(--pixel-score-minus)] pixel-body text-sm">{{ error }}</p>
    <p v-else class="p-4 text-center pixel-body text-sm text-[var(--pixel-cream)] opacity-80">
      Point at the station QR code
    </p>
  </div>
</template>
