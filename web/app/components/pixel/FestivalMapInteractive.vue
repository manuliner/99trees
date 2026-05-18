<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core'
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'
import { useFestivalMapView } from '~/composables/useFestivalMapView'

const props = withDefaults(
  defineProps<{
    mapImageUrl: string | null
    pins?: FestivalMapPin[]
    /** Pan/zoom to target pin on mount */
    autoFocusTarget?: boolean
  }>(),
  {
    pins: () => [],
    autoFocusTarget: false,
  },
)

const viewportRef = ref<HTMLElement | null>(null)
const imageNatural = ref<{ w: number; h: number } | null>(null)

function getContentSize() {
  const vp = viewportRef.value
  if (!vp || !imageNatural.value) return null
  const width = vp.clientWidth
  const height = width * (imageNatural.value.h / imageNatural.value.w)
  return { width, height }
}

const {
  scale,
  reset,
  fitInitial,
  clamp,
  zoomAt,
  zoomBy,
  panBy,
  focusPin,
  pinViewportPosition,
  getInitialScale,
  panStyle,
  contentStyle,
} = useFestivalMapView({ viewportRef, getContentSize })

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth > 0) {
    imageNatural.value = { w: img.naturalWidth, h: img.naturalHeight }
    nextTick(() => {
      if (props.autoFocusTarget) focusTargetPin()
      else reset()
    })
  }
}

function focusTargetPin() {
  const target = props.pins.find((p) => p.kind === 'target')
  if (target) focusPin(target.mapX, target.mapY)
  else reset()
}

function zoomIn() {
  const vp = viewportRef.value
  if (!vp) return
  zoomBy(vp.clientWidth / 2, vp.clientHeight / 2, 1.25)
}

function zoomOut() {
  const vp = viewportRef.value
  if (!vp) return
  zoomBy(vp.clientWidth / 2, vp.clientHeight / 2, 0.8)
}

function resetView() {
  reset()
}

defineExpose({ resetView, focusTargetPin, zoomIn, zoomOut, scale })

const pointers = new Map<number, { x: number; y: number }>()
let lastPinchDistance = 0
let lastPinchCenter = { x: 0, y: 0 }
let lastTapTime = 0
let lastTapPos = { x: 0, y: 0 }

function viewportPoint(clientX: number, clientY: number) {
  const vp = viewportRef.value
  if (!vp) return { x: 0, y: 0 }
  const rect = vp.getBoundingClientRect()
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function pinchMetrics() {
  const pts = [...pointers.values()]
  const a = pts[0]
  const b = pts[1]
  if (!a || !b) return null
  const dx = b.x - a.x
  const dy = b.y - a.y
  const distance = Math.hypot(dx, dy)
  const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return { distance, center }
}

function onPointerDown(event: PointerEvent) {
  if (!props.mapImageUrl || !viewportRef.value) return
  viewportRef.value.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size === 2) {
    const metrics = pinchMetrics()
    if (metrics) {
      lastPinchDistance = metrics.distance
      const local = viewportPoint(metrics.center.x, metrics.center.y)
      lastPinchCenter = local
    }
  }
}

function onPointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  const prev = pointers.get(event.pointerId)!
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size >= 2) {
    const metrics = pinchMetrics()
    if (!metrics || lastPinchDistance <= 0) return
    const local = viewportPoint(metrics.center.x, metrics.center.y)
    const ratio = metrics.distance / lastPinchDistance
    zoomAt(lastPinchCenter.x, lastPinchCenter.y, scale.value * ratio)
    lastPinchDistance = metrics.distance
    lastPinchCenter = local
    return
  }

  panBy(event.clientX - prev.x, event.clientY - prev.y)
}

function onPointerUp(event: PointerEvent) {
  const wasTap = pointers.size === 1
  const start = pointers.get(event.pointerId)
  pointers.delete(event.pointerId)
  try {
    viewportRef.value?.releasePointerCapture(event.pointerId)
  }
  catch {
    /* already released */
  }

  if (wasTap && start) {
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (moved < 12) {
      const local = viewportPoint(event.clientX, event.clientY)
      const now = Date.now()
      if (now - lastTapTime < 320 && Math.hypot(local.x - lastTapPos.x, local.y - lastTapPos.y) < 28) {
        if (scale.value > getInitialScale() + 0.05) reset()
        else zoomAt(local.x, local.y, 2)
        lastTapTime = 0
      }
      else {
        lastTapTime = now
        lastTapPos = local
      }
    }
  }

  if (pointers.size < 2) lastPinchDistance = 0
}

function onWheel(event: WheelEvent) {
  if (!props.mapImageUrl) return
  event.preventDefault()
  const local = viewportPoint(event.clientX, event.clientY)
  const factor = event.deltaY < 0 ? 1.12 : 0.89
  zoomBy(local.x, local.y, factor)
}

useEventListener(viewportRef, 'pointerdown', onPointerDown)
useEventListener(viewportRef, 'pointermove', onPointerMove)
useEventListener(viewportRef, 'pointerup', onPointerUp)
useEventListener(viewportRef, 'pointercancel', onPointerUp)
useEventListener(viewportRef, 'wheel', onWheel, { passive: false })

useResizeObserver(viewportRef, () => {
  if (!imageNatural.value) return
  const initial = getInitialScale()
  if (Math.abs(scale.value - initial) < 0.08) fitInitial()
  else clamp()
})

watch(
  () => props.mapImageUrl,
  () => {
    imageNatural.value = null
    reset()
  },
)
</script>

<template>
  <div
    ref="viewportRef"
    class="festival-map-viewport relative h-full w-full overflow-hidden bg-[var(--pixel-cream)]"
    style="touch-action: none; overscroll-behavior: none"
  >
    <div
      v-if="mapImageUrl"
      class="absolute left-0 top-0"
      :style="panStyle"
    >
      <div class="relative" :style="contentStyle">
        <img
          :src="mapImageUrl"
          alt=""
          class="festival-map-image block h-auto w-full select-none"
          draggable="false"
          @load="onImageLoad"
        >
      </div>
    </div>
    <PixelFestivalMapPins
      v-if="mapImageUrl"
      :pins="pins"
      size="sm"
      overlay
      :pin-viewport-position="pinViewportPosition"
    />
    <div
      v-else
      class="flex h-full min-h-[12rem] items-center justify-center bg-[var(--pixel-forest-light)]"
    >
      <p class="pixel-body px-2 text-center text-xs opacity-80">Festival map not configured</p>
    </div>
  </div>
</template>

<style scoped>
.festival-map-image {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}
</style>
