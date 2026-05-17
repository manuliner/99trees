<script setup lang="ts">
import { onKeyStroke, useScrollLock } from '@vueuse/core'
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'
import type FestivalMapInteractive from '~/components/pixel/FestivalMapInteractive.vue'

const props = defineProps<{
  open: boolean
  mapImageUrl: string | null
  pins?: FestivalMapPin[]
}>()

const emit = defineEmits<{ close: [] }>()

const mounted = ref(false)
const closeBtnRef = ref<HTMLButtonElement | null>(null)
const mapRef = ref<InstanceType<typeof FestivalMapInteractive> | null>(null)

onMounted(() => {
  mounted.value = true
})

const scrollLock = useScrollLock(typeof document !== 'undefined' ? document.body : null)

watch(
  () => props.open,
  (open) => {
    scrollLock.value = open
    if (open) {
      nextTick(() => closeBtnRef.value?.focus())
    }
  },
  { immediate: true },
)

onKeyStroke(
  'Escape',
  (event) => {
    if (!props.open) return
    event.preventDefault()
    emit('close')
  },
  { dedupe: true },
)

function onReset() {
  mapRef.value?.resetView()
}

function onZoomIn() {
  mapRef.value?.zoomIn()
}

function onZoomOut() {
  mapRef.value?.zoomOut()
}
</script>

<template>
  <Teleport v-if="mounted && open" to="body">
    <div
      class="festival-map-fullscreen fixed inset-0 z-[60] flex flex-col bg-[var(--pixel-forest-dark)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="festival-map-fullscreen-title"
    >
      <header
        class="festival-map-fullscreen__header flex shrink-0 items-center gap-2 border-b-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)] px-3 py-2"
      >
        <h2 id="festival-map-fullscreen-title" class="pixel-title min-w-0 flex-1 text-xs">
          Festival map
        </h2>
        <button
          type="button"
          class="festival-map-fullscreen__tool pixel-body shrink-0 border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)] px-2 py-1 text-[10px] font-bold shadow-[2px_2px_0_var(--pixel-forest-dark)]"
          @click="onReset"
        >
          Reset
        </button>
        <button
          type="button"
          class="festival-map-fullscreen__tool pixel-body shrink-0 border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)] px-2 py-1 text-xs font-bold shadow-[2px_2px_0_var(--pixel-forest-dark)]"
          aria-label="Zoom in"
          @click="onZoomIn"
        >
          +
        </button>
        <button
          type="button"
          class="festival-map-fullscreen__tool pixel-body shrink-0 border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)] px-2 py-1 text-xs font-bold shadow-[2px_2px_0_var(--pixel-forest-dark)]"
          aria-label="Zoom out"
          @click="onZoomOut"
        >
          −
        </button>
        <button
          ref="closeBtnRef"
          type="button"
          class="festival-map-fullscreen__tool pixel-body shrink-0 border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-sunrise)] px-2 py-1 text-[10px] font-bold shadow-[2px_2px_0_var(--pixel-forest-dark)]"
          @click="emit('close')"
        >
          Close
        </button>
      </header>

      <div class="festival-map-fullscreen__body min-h-0 flex-1 border-4 border-t-0 border-[var(--pixel-forest-dark)]">
        <PixelFestivalMapInteractive
          ref="mapRef"
          :map-image-url="mapImageUrl"
          :pins="pins ?? []"
          large-pin-touch
          auto-focus-target
        />
      </div>

      <p class="festival-map-fullscreen__hint pixel-body shrink-0 bg-[var(--pixel-cream)] py-1 text-center text-[10px] opacity-80">
        Pinch to zoom · drag to pan · double-tap to zoom
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.festival-map-fullscreen__header {
  padding-top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
  padding-left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
  padding-right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
}

.festival-map-fullscreen__body {
  margin-left: env(safe-area-inset-left, 0px);
  margin-right: env(safe-area-inset-right, 0px);
}

.festival-map-fullscreen__hint {
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.25rem);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.festival-map-fullscreen__tool:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--pixel-forest-dark);
}
</style>
