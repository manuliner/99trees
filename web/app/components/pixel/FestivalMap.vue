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
    /** Inline preview: tap opens fullscreen (emit expand) */
    expandable?: boolean
  }>(),
  {
    pins: () => [],
    mapX: undefined,
    mapY: undefined,
    fieldNumber: undefined,
    expandable: false,
  },
)

const emit = defineEmits<{ expand: [] }>()

const { t } = useI18n()

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
  if (target) return t('festivalMap.ariaWithTarget', { visited })
  if (visited > 0) return t('festivalMap.ariaWithVisited', { visited })
  return t('festivalMap.ariaDefault')
})

const ariaLabelExpandable = computed(() =>
  props.expandable && props.mapImageUrl
    ? `${ariaLabel.value} ${t('festivalMap.ariaTapToOpen')}`
    : ariaLabel.value,
)

const caption = computed(() => {
  if (resolvedPins.value.some((p) => p.kind === 'target')) return t('festivalMap.captionTarget')
  if (resolvedPins.value.length) return t('festivalMap.captionVisited')
  return t('festivalMap.captionDefault')
})

function onExpand() {
  if (props.expandable && props.mapImageUrl) emit('expand')
}

function onExpandKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onExpand()
  }
}
</script>

<template>
  <component
    :is="expandable && mapImageUrl ? 'button' : 'div'"
    :type="expandable && mapImageUrl ? 'button' : undefined"
    class="festival-map relative w-full overflow-hidden border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)] text-left"
    :class="{
      'cursor-pointer transition-[filter] hover:brightness-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pixel-sunrise)]': expandable && mapImageUrl,
    }"
    :role="expandable && mapImageUrl ? undefined : 'img'"
    :aria-label="ariaLabelExpandable"
    @click="onExpand"
    @keydown="expandable && mapImageUrl ? onExpandKeydown : undefined"
  >
    <div v-if="mapImageUrl" class="relative">
      <img
        :src="mapImageUrl"
        alt=""
        class="block h-auto w-full pointer-events-none"
        style="image-rendering: pixelated"
        draggable="false"
      >
      <PixelFestivalMapPins :pins="resolvedPins" />
      <span
        v-if="expandable"
        class="absolute right-2 top-2 z-0 border-4 border-[var(--pixel-forest-dark)] bg-[var(--pixel-sunrise)] px-2 py-0.5 text-[10px] font-bold shadow-[2px_2px_0_var(--pixel-forest-dark)]"
        aria-hidden="true"
      >
        {{ t('festivalMap.expand') }}
      </span>
    </div>
    <div
      v-else
      class="flex aspect-[16/10] items-center justify-center bg-[var(--pixel-forest-light)]"
    >
      <p class="pixel-body px-2 text-center text-xs opacity-80">{{ t('festivalMap.notConfigured') }}</p>
    </div>

    <p class="festival-map__caption relative z-20 bg-[var(--pixel-cream)] py-1 text-center text-xs opacity-80 pixel-body">
      <template v-if="expandable && mapImageUrl">
        {{ t('festivalMap.captionTapToExpand', { caption }) }}
      </template>
      <template v-else>
        {{ caption }}
      </template>
    </p>
  </component>
</template>
