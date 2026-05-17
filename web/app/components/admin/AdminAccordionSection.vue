<script setup lang="ts">
defineProps<{
  title: string
  done: boolean
  isNext: boolean
  expanded: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <section class="pixel-card overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center gap-2 p-4 text-left"
      :class="isNext ? 'bg-[var(--pixel-forest-light)]/30' : ''"
      :aria-expanded="expanded"
      @click="emit('toggle')"
    >
      <span
        v-if="done"
        class="shrink-0 w-6 h-6 flex items-center justify-center text-[10px] border-2 border-[var(--pixel-forest-dark)] bg-[var(--pixel-score-plus)] text-white"
        aria-hidden="true"
      >
        ✓
      </span>
      <span
        v-else
        class="shrink-0 w-6 h-6 border-2 border-[var(--pixel-forest-dark)] bg-[var(--pixel-cream)]"
        aria-hidden="true"
      />
      <span class="pixel-title text-xs flex-1">{{ title }}</span>
      <span class="pixel-body text-[10px] opacity-70 select-none" aria-hidden="true">
        {{ expanded ? '−' : '+' }}
      </span>
    </button>
    <div
      v-show="expanded"
      class="px-4 pb-4 space-y-3 border-t-2 border-[var(--pixel-forest-dark)]"
    >
      <slot />
    </div>
  </section>
</template>
