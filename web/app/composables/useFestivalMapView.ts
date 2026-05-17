export const FESTIVAL_MAP_MIN_SCALE = 1
export const FESTIVAL_MAP_MAX_SCALE = 4

export type FestivalMapContentSize = {
  width: number
  height: number
}

export function useFestivalMapView(options: {
  viewportRef: Ref<HTMLElement | null>
  getContentSize: () => FestivalMapContentSize | null
}) {
  const scale = ref(1)
  const x = ref(0)
  const y = ref(0)

  function clamp() {
    const vp = options.viewportRef.value
    const size = options.getContentSize()
    if (!vp || !size) return

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const contentW = size.width * scale.value
    const contentH = size.height * scale.value

    if (contentW <= vpW) {
      x.value = (vpW - contentW) / 2
    }
    else {
      x.value = Math.min(0, Math.max(vpW - contentW, x.value))
    }

    if (contentH <= vpH) {
      y.value = (vpH - contentH) / 2
    }
    else {
      y.value = Math.min(0, Math.max(vpH - contentH, y.value))
    }
  }

  function reset() {
    scale.value = FESTIVAL_MAP_MIN_SCALE
    x.value = 0
    y.value = 0
    clamp()
  }

  function zoomAt(focusX: number, focusY: number, newScale: number) {
    const clamped = Math.min(
      FESTIVAL_MAP_MAX_SCALE,
      Math.max(FESTIVAL_MAP_MIN_SCALE, newScale),
    )
    const ratio = clamped / scale.value
    x.value = focusX - (focusX - x.value) * ratio
    y.value = focusY - (focusY - y.value) * ratio
    scale.value = clamped
    clamp()
  }

  function zoomBy(focusX: number, focusY: number, factor: number) {
    zoomAt(focusX, focusY, scale.value * factor)
  }

  function panBy(dx: number, dy: number) {
    x.value += dx
    y.value += dy
    clamp()
  }

  /** Center viewport on a pin at mapX/mapY percent (0–100). */
  function focusPin(mapX: number, mapY: number, targetScale = 1.75) {
    const vp = options.viewportRef.value
    const size = options.getContentSize()
    if (!vp || !size) return

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    scale.value = Math.min(
      FESTIVAL_MAP_MAX_SCALE,
      Math.max(FESTIVAL_MAP_MIN_SCALE, targetScale),
    )

    const px = (mapX / 100) * size.width * scale.value
    const py = (mapY / 100) * size.height * scale.value
    x.value = vpW / 2 - px
    y.value = vpH / 2 - py
    clamp()
  }

  const transformStyle = computed(() => ({
    transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
  }))

  return {
    scale,
    x,
    y,
    reset,
    clamp,
    zoomAt,
    zoomBy,
    panBy,
    focusPin,
    transformStyle,
  }
}
