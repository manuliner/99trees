<script setup lang="ts">
/**
 * Pixel-art ! — 11×19 grid. Stem + gap + square dot.
 * Renders at same height as dice face (3.5rem default).
 */
const ROWS = [
  '    ###    ',
  '   #####   ',
  '  #HGGGO#  ',
  '  #HGGGO#  ',
  '  #HGGGO#  ',
  '  #HGGGO#  ',
  '  #HGGGO#  ',
  '  #HGGGO#  ',
  '  #HGGGO#  ',
  '  #HGGGOO# ',
  '   #####   ',
  '           ',
  '           ',
  '   #####   ',
  '  #HDDDG#  ',
  '  #HDDDG#  ',
  '  #HDDDG#  ',
  '   #####   ',
] as const

const GRID_W = 11
const GRID_H = ROWS.length

const FILLS: Record<string, string> = {
  '#': 'var(--pixel-forest-dark)',
  O: 'var(--pixel-forest-dark)',
  H: 'var(--pixel-hint-highlight)',
  G: 'var(--pixel-score-plus)',
  D: 'var(--pixel-forest-mid)',
}

/** Matches `.pixel-dice__cube` height (3.5rem ≈ 56px). */
const props = withDefaults(
  defineProps<{
    height?: number
  }>(),
  { height: 56 },
)

const width = computed(() => Math.round(props.height * (GRID_W / GRID_H)))

const pixels = computed(() => {
  const list: { x: number; y: number; fill: string }[] = []
  for (let y = 0; y < ROWS.length; y++) {
    const row = ROWS[y]!
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!
      if (ch === ' ') continue
      const fill = FILLS[ch]
      if (fill) list.push({ x, y, fill })
    }
  }
  return list
})
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${GRID_W} ${GRID_H}`"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    class="pixel-hint-icon"
    shape-rendering="crispEdges"
  >
    <rect
      v-for="(p, i) in pixels"
      :key="i"
      :x="p.x"
      :y="p.y"
      width="1"
      height="1"
      :fill="p.fill"
    />
  </svg>
</template>

<style scoped>
.pixel-hint-icon {
  display: block;
  height: 3.5rem;
  width: auto;
  overflow: visible;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
