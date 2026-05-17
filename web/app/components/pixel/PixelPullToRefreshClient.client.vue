<script setup lang="ts">
const {
  pullDistance,
  isRefreshing,
  ready,
  bindTouch,
  unbindTouch,
} = usePullToRefreshProvider()

onMounted(bindTouch)
onUnmounted(unbindTouch)

const indicatorVisible = computed(() => pullDistance.value > 0 || isRefreshing.value)

const indicatorLabel = computed(() => {
  if (isRefreshing.value) return 'Loading…'
  if (ready.value) return 'Let go'
  return 'Pull down'
})

const arrowOffset = computed(() => Math.min(10, Math.round(pullDistance.value / 8)))
</script>

<template>
  <div
    class="ptr-shell"
    :style="{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined }"
  >
    <div
      class="ptr-indicator"
      :class="{ 'ptr-indicator--visible': indicatorVisible }"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        class="ptr-indicator__card pixel-card"
        :class="{ 'ptr-indicator__card--ready': ready, 'ptr-indicator__card--busy': isRefreshing }"
      >
        <svg
          class="ptr-indicator__arrows"
          :class="{
            'ptr-indicator__arrows--ready': ready,
            'ptr-indicator__arrows--busy': isRefreshing,
          }"
          :style="isRefreshing ? undefined : { transform: `translateY(${arrowOffset}px)` }"
          width="18"
          height="22"
          viewBox="0 0 18 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <g class="ptr-indicator__chevron">
            <rect x="7" y="1" width="4" height="4" fill="currentColor" />
            <rect x="5" y="5" width="8" height="4" fill="currentColor" />
          </g>
          <g class="ptr-indicator__chevron" transform="translate(0 7)">
            <rect x="7" y="1" width="4" height="4" fill="currentColor" />
            <rect x="5" y="5" width="8" height="4" fill="currentColor" />
          </g>
          <g class="ptr-indicator__chevron" transform="translate(0 14)">
            <rect x="7" y="1" width="4" height="4" fill="currentColor" />
            <rect x="5" y="5" width="8" height="4" fill="currentColor" />
          </g>
        </svg>
        <span class="ptr-indicator__label pixel-title">{{ indicatorLabel }}</span>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.ptr-shell {
  min-height: inherit;
  transition: transform 0.2s ease-out;
}

.ptr-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  justify-content: center;
  padding-top: calc(env(safe-area-inset-top, 0px) + 0.35rem);
  pointer-events: none;
  opacity: 0;
  transform: translateY(-120%);
  transition: opacity 0.12s ease, transform 0.15s ease;
}

.ptr-indicator--visible {
  opacity: 1;
  transform: translateY(0);
}

.ptr-indicator__card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem;
  border-width: 3px;
  box-shadow: 3px 3px 0 var(--pixel-forest-dark);
}

.ptr-indicator__card--ready {
  background: var(--pixel-board-start);
}

.ptr-indicator__card--busy {
  background: var(--pixel-cream);
}

.ptr-indicator__arrows {
  flex-shrink: 0;
  color: var(--pixel-forest-mid);
  transition: color 0.12s ease;
}

.ptr-indicator__arrows--ready {
  color: var(--pixel-forest-dark);
}

.ptr-indicator__arrows--busy {
  animation: ptr-arrows-bounce 0.55s steps(4) infinite;
}

.ptr-indicator__label {
  font-size: 8px;
  line-height: 1.5;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--pixel-forest-dark);
}

@keyframes ptr-arrows-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}
</style>
