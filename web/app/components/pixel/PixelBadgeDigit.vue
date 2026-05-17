<script setup lang="ts">
/** 5×7 pixel digits 1–3 for hint badge. */
const DIGITS: Record<1 | 2 | 3, readonly string[]> = {
  1: [
    '..#..',
    '.##.',
    '..#..',
    '..#..',
    '..#..',
    '..#..',
    '.###.',
  ],
  2: [
    '.###.',
    '#...#',
    '....#',
    '..##.',
    '.#...',
    '#....',
    '#####',
  ],
  3: [
    '.###.',
    '#...#',
    '....#',
    '..##.',
    '....#',
    '#...#',
    '.###.',
  ],
}

const props = defineProps<{
  value: 1 | 2 | 3
}>()

const GRID_W = 5
const GRID_H = 7

const pixels = computed(() => {
  const rows = DIGITS[props.value]
  const list: { x: number; y: number }[] = []
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]!
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') list.push({ x, y })
    }
  }
  return list
})
</script>

<template>
  <svg
    class="pixel-badge-digit"
    :viewBox="`0 0 ${GRID_W} ${GRID_H}`"
    xmlns="http://www.w3.org/2000/svg"
    shape-rendering="crispEdges"
    aria-hidden="true"
  >
    <rect
      v-for="(p, i) in pixels"
      :key="i"
      :x="p.x"
      :y="p.y"
      width="1"
      height="1"
      class="pixel-badge-digit__pixel"
    />
  </svg>
</template>

<style scoped>
.pixel-badge-digit {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.pixel-badge-digit__pixel {
  fill: var(--pixel-board-start);
  stroke: var(--pixel-forest-dark);
  stroke-width: 0.15;
  paint-order: stroke fill;
}
</style>
