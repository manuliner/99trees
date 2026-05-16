<script setup lang="ts">
defineProps<{
  mapImageUrl: string | null
  mapX: number
  mapY: number
  fieldNumber: number
}>()
</script>

<template>
  <div
    class="festival-map relative w-full overflow-hidden border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)]"
    role="img"
    :aria-label="`Map hint for field ${fieldNumber}`"
  >
    <img
      v-if="mapImageUrl"
      :src="mapImageUrl"
      alt=""
      class="block h-auto w-full"
      style="image-rendering: pixelated"
      draggable="false"
    >
    <div
      v-else
      class="flex aspect-[16/10] items-center justify-center bg-[var(--pixel-forest-light)]"
    >
      <p class="pixel-body px-2 text-center text-xs opacity-80">Festival map not configured</p>
    </div>
    <span
      v-if="mapImageUrl"
      class="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-sunrise)] text-[10px] font-bold text-[var(--pixel-forest-dark)] shadow-[2px_2px_0_var(--pixel-forest-dark)]"
      :style="{ left: `${mapX}%`, top: `${mapY}%` }"
      aria-hidden="true"
    >
      ?
    </span>
    <p class="pixel-body py-1 text-center text-xs opacity-80">
      Field {{ fieldNumber }} on the festival map
    </p>
  </div>
</template>
