<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    mode?: 'task' | 'team'
    embedded?: boolean
  }>(),
  { mode: 'task', embedded: false },
)

const emit = defineEmits<{
  scanned: [payload: { slug: string; token: string }]
  close: []
}>()

const { t } = useI18n()

const videoRef = ref<HTMLVideoElement | null>(null)
const error = ref('')
let controls: { stop: () => void } | null = null

function parseQrUrl(raw: string): { slug: string; token: string } | null {
  try {
    const url = new URL(raw, window.location.origin)
    const pathPattern = props.mode === 'team' ? /\/t\/([^/]+)/ : /\/s\/([^/]+)/
    const match = url.pathname.match(pathPattern)
    const token = url.searchParams.get('t')
    if (!match?.[1] || !token) return null
    return { slug: decodeURIComponent(match[1]), token }
  }
  catch {
    return null
  }
}

onMounted(async () => {
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
    error.value = t('scanner.cameraError')
    console.warn(e)
  }
})

function stop() {
  controls?.stop()
  controls = null
  const stream = videoRef.value?.srcObject as MediaStream | undefined
  stream?.getTracks().forEach((track) => track.stop())
}

function onClose() {
  stop()
  emit('close')
}

onUnmounted(stop)

const scanTitle = computed(() =>
  props.mode === 'team' ? t('scanner.scanTeamQr') : t('scanner.scanQr'),
)

const pointHint = computed(() =>
  props.mode === 'team' ? t('scanner.pointAtTeamQr') : t('scanner.pointAtTaskQr'),
)
</script>

<template>
  <div v-if="embedded" class="space-y-3">
    <div class="relative w-full aspect-[3/4] max-h-[70vh] overflow-hidden rounded bg-black">
      <video ref="videoRef" class="absolute inset-0 h-full w-full object-cover" playsinline muted />
      <div
        class="pointer-events-none absolute inset-6 border-4 border-[var(--pixel-sunrise)]"
        style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.35)"
      />
    </div>
    <p v-if="error" class="text-center text-sm text-[var(--pixel-score-minus)] pixel-body">{{ error }}</p>
    <p v-else class="pixel-body text-center text-sm opacity-80">{{ t('scanner.pointAtQr') }}</p>
  </div>

  <div v-else class="fixed inset-0 z-50 flex flex-col bg-black">
    <div class="flex items-center justify-between p-4">
      <p class="pixel-title text-xs text-[var(--pixel-cream)]">{{ scanTitle }}</p>
      <button type="button" class="pixel-body text-sm text-[var(--pixel-cream)] underline" @click="onClose">
        {{ t('scanner.close') }}
      </button>
    </div>
    <div class="relative flex flex-1 items-center justify-center">
      <video ref="videoRef" class="h-full w-full object-cover" playsinline muted />
      <div
        class="pointer-events-none absolute inset-8 border-4 border-[var(--pixel-sunrise)]"
        style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.4)"
      />
    </div>
    <p v-if="error" class="p-4 text-center text-sm text-[var(--pixel-score-minus)] pixel-body">{{ error }}</p>
    <p v-else class="p-4 text-center pixel-body text-sm text-[var(--pixel-cream)] opacity-80">
      {{ pointHint }}
    </p>
  </div>
</template>
