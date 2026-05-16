<script setup lang="ts">
const props = defineProps<{
  fieldCount: number
  positionConfirmed: number
  positionPending?: number | null
}>()

const fields = computed(() => {
  const n = Math.min(props.fieldCount, 50)
  return Array.from({ length: n }, (_, i) => i + 1)
})
</script>

<template>
  <div class="pixel-card p-3 overflow-x-auto">
    <p class="pixel-title text-xs mb-2 text-center">Migration path</p>
    <div class="flex gap-1 min-w-max pb-1">
      <div
        class="w-8 h-8 flex items-center justify-center text-[10px] border-2 border-[var(--pixel-forest-dark)] shrink-0"
        :class="positionConfirmed === 0 ? 'bg-[var(--pixel-sunrise)]' : 'bg-[var(--pixel-cream)]'"
      >
        0
      </div>
      <div
        v-for="f in fields"
        :key="f"
        class="w-8 h-8 flex items-center justify-center text-[10px] border-2 border-[var(--pixel-forest-dark)] shrink-0"
        :class="{
          'bg-[var(--pixel-gold)]': positionConfirmed >= f && f === fieldCount,
          'bg-[var(--pixel-forest-mid)] text-[var(--pixel-cream)]': positionConfirmed >= f && f !== fieldCount,
          'bg-[var(--pixel-sunrise)]': positionPending === f && positionConfirmed < f,
          'bg-[var(--pixel-cream)]': positionConfirmed < f && positionPending !== f,
        }"
      >
        {{ f }}
      </div>
    </div>
    <p class="pixel-body text-xs text-center mt-2 opacity-80">
      Field {{ positionConfirmed }} / {{ fieldCount }}
      <span v-if="positionPending && positionPending > positionConfirmed">
        → seeking {{ positionPending }}
      </span>
    </p>
  </div>
</template>
