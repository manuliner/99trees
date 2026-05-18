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

  function isPortrait() {
    const vp = options.viewportRef.value
    if (!vp) return false
    return vp.clientHeight > vp.clientWidth
  }

  /** Scale so map height matches viewport height (width may extend). */
  function getFitHeightScale() {
    const vp = options.viewportRef.value
    const base = options.getContentSize()
    if (!vp || !base || base.height <= 0) return 1
    return vp.clientHeight / base.height
  }

  /** Minimum zoom: entire map visible (fit width and height). */
  function getMinScale() {
    const vp = options.viewportRef.value
    const base = options.getContentSize()
    if (!vp || !base || base.height <= 0) return 1
    return Math.min(1, vp.clientHeight / base.height)
  }

  /** Default zoom on open / reset: fit height in portrait, fit width otherwise. */
  function getInitialScale(): number {
    const fitHeight = getFitHeightScale()
    if (isPortrait()) {
      return Math.min(FESTIVAL_MAP_MAX_SCALE, Math.max(getMinScale(), fitHeight))
    }
    return 1
  }

  function getMaxScale(): number {
    return Math.max(FESTIVAL_MAP_MAX_SCALE, getInitialScale() * 2)
  }

  function scaledContentSize(): FestivalMapContentSize | null {
    const base = options.getContentSize()
    if (!base) return null
    return {
      width: base.width * scale.value,
      height: base.height * scale.value,
    }
  }

  function clamp() {
    const vp = options.viewportRef.value
    const size = scaledContentSize()
    if (!vp || !size) return

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const contentW = size.width
    const contentH = size.height

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

  function fitInitial() {
    scale.value = getInitialScale()
    x.value = 0
    y.value = 0
    clamp()
  }

  function reset() {
    fitInitial()
  }

  function zoomAt(focusX: number, focusY: number, newScale: number) {
    const clamped = Math.min(
      getMaxScale(),
      Math.max(getMinScale(), newScale),
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
  function focusPin(mapX: number, mapY: number, targetScale?: number) {
    const vp = options.viewportRef.value
    const base = options.getContentSize()
    if (!vp || !base) return

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const desired = targetScale ?? getInitialScale()
    scale.value = Math.min(
      getMaxScale(),
      Math.max(getMinScale(), desired),
    )

    const px = (mapX / 100) * base.width * scale.value
    const py = (mapY / 100) * base.height * scale.value
    x.value = vpW / 2 - px
    y.value = vpH / 2 - py
    clamp()
  }

  /** Pin position in viewport pixels (fixed-size overlay, not scaled with map). */
  function pinViewportPosition(mapX: number, mapY: number) {
    const size = scaledContentSize()
    if (!size) return { left: 0, top: 0 }
    return {
      left: x.value + (mapX / 100) * size.width,
      top: y.value + (mapY / 100) * size.height,
    }
  }

  const panStyle = computed(() => ({
    transform: `translate(${x.value}px, ${y.value}px)`,
  }))

  const contentStyle = computed(() => {
    const size = scaledContentSize()
    if (!size) return { width: '100%' }
    return { width: `${size.width}px` }
  })

  return {
    scale,
    x,
    y,
    reset,
    fitInitial,
    clamp,
    zoomAt,
    zoomBy,
    panBy,
    focusPin,
    pinViewportPosition,
    getInitialScale,
    getMinScale,
    panStyle,
    contentStyle,
  }
}
