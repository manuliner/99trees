<script setup lang="ts">
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'

const props = withDefaults(
  defineProps<{
    pins: FestivalMapPin[]
    size?: 'sm' | 'md'
    /** Pins in viewport pixels (fullscreen); fixed size, not scaled with map */
    overlay?: boolean
    pinViewportPosition?: (mapX: number, mapY: number) => { left: number, top: number }
  }>(),
  {
    size: 'sm',
    overlay: false,
    pinViewportPosition: undefined,
  },
)

const { t } = useI18n()

function pinStyle(pin: FestivalMapPin) {
  if (props.overlay && props.pinViewportPosition) {
    const { left, top } = props.pinViewportPosition(pin.mapX, pin.mapY)
    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: 'translate(-50%, -50%)',
    }
  }
  return {
    left: `${pin.mapX}%`,
    top: `${pin.mapY}%`,
    transform: 'translate(-50%, -50%)',
  }
}
</script>

<template>
  <div
    class="festival-map-pins absolute inset-0"
    :class="overlay ? 'pointer-events-none z-10' : undefined"
  >
    <span
      v-for="pin in pins"
      :key="`${pin.kind}-${pin.fieldNumber}`"
      class="absolute flex items-center justify-center border-[var(--pixel-forest-dark)] font-bold"
      :class="[
        size === 'md'
          ? 'h-[33.9px] w-[33.9px] border-4 text-[12.1px] shadow-[2px_2px_0_var(--pixel-forest-dark)]'
          : 'h-[17px] w-[17px] border-2 text-[9.7px] shadow-[1px_1px_0_var(--pixel-forest-dark)]',
        {
          'bg-[var(--pixel-forest-mid)] text-[var(--pixel-cream)]': pin.kind === 'visited',
          'bg-[var(--pixel-sunrise)] text-[var(--pixel-forest-dark)]': pin.kind === 'target',
        },
      ]"
      :style="pinStyle(pin)"
      :title="t('leaderboard.field', { n: pin.fieldNumber })"
    >
      {{ pin.kind === 'target' ? '?' : pin.fieldNumber }}
    </span>
  </div>
</template>
