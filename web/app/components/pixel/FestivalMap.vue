<script setup lang="ts">
export type FestivalMapPin = {
  fieldNumber: number
  mapX: number
  mapY: number
  kind: 'visited' | 'target'
}

const props = withDefaults(
  defineProps<{
    mapImageUrl: string | null
    pins?: FestivalMapPin[]
    /** @deprecated Use pins with kind target */
    mapX?: number
    mapY?: number
    fieldNumber?: number
  }>(),
  {
    pins: () => [],
    mapX: undefined,
    mapY: undefined,
    fieldNumber: undefined,
  },
)

const resolvedPins = computed((): FestivalMapPin[] => {
  if (props.pins.length > 0) return props.pins
  if (
    props.mapImageUrl
    && props.mapX != null
    && props.mapY != null
    && props.fieldNumber != null
  ) {
    return [
      {
        fieldNumber: props.fieldNumber,
        mapX: props.mapX,
        mapY: props.mapY,
        kind: 'target',
      },
    ]
  }
  return []
})

const ariaLabel = computed(() => {
  const visited = resolvedPins.value.filter((p) => p.kind === 'visited').length
  const target = resolvedPins.value.some((p) => p.kind === 'target')
  if (target) return `Festival map with ${visited} visited stations and search target`
  if (visited > 0) return `Festival map with ${visited} visited stations`
  return 'Festival map'
})
</script>

<template>
  <div
    class="festival-map relative w-full overflow-hidden border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)]"
    role="img"
    :aria-label="ariaLabel"
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
      v-for="pin in resolvedPins"
      :key="`${pin.kind}-${pin.fieldNumber}`"
      class="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-4 border-[var(--pixel-forest-dark)] text-[10px] font-bold shadow-[2px_2px_0_var(--pixel-forest-dark)]"
      :class="{
        'bg-[var(--pixel-forest-mid)] text-[var(--pixel-cream)]': pin.kind === 'visited',
        'bg-[var(--pixel-sunrise)] text-[var(--pixel-forest-dark)]': pin.kind === 'target',
      }"
      :style="{ left: `${pin.mapX}%`, top: `${pin.mapY}%` }"
      :title="`Field ${pin.fieldNumber}`"
    >
      {{ pin.kind === 'target' ? '?' : pin.fieldNumber }}
    </span>

    <p class="pixel-body py-1 text-center text-xs opacity-80">
      <template v-if="resolvedPins.some((p) => p.kind === 'target')">
        Target field on the festival map
      </template>
      <template v-else-if="resolvedPins.length">
        Stations you have completed
      </template>
      <template v-else>
        Festival grounds
      </template>
    </p>
  </div>
</template>
