<script setup lang="ts">
import type { FestivalMapPin } from '~/components/pixel/FestivalMap.vue'

defineProps<{
  pins: FestivalMapPin[]
  /** Larger min touch target for fullscreen interactive map */
  largeTouch?: boolean
}>()
</script>

<template>
  <span
    v-for="pin in pins"
    :key="`${pin.kind}-${pin.fieldNumber}`"
    class="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border-4 border-[var(--pixel-forest-dark)] font-bold shadow-[2px_2px_0_var(--pixel-forest-dark)]"
    :class="[
      largeTouch
        ? 'min-h-11 min-w-11 text-xs'
        : 'h-7 w-7 text-[10px]',
      {
        'bg-[var(--pixel-forest-mid)] text-[var(--pixel-cream)]': pin.kind === 'visited',
        'bg-[var(--pixel-sunrise)] text-[var(--pixel-forest-dark)]': pin.kind === 'target',
      },
    ]"
    :style="{ left: `${pin.mapX}%`, top: `${pin.mapY}%` }"
    :title="`Field ${pin.fieldNumber}`"
  >
    {{ pin.kind === 'target' ? '?' : pin.fieldNumber }}
  </span>
</template>
