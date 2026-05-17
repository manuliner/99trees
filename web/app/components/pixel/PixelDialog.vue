<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
  scrollable?: boolean
  panelClass?: string
}>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body" :disabled="!open">
    <div
      v-show="open"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-hidden="!open"
    >
      <div class="absolute inset-0 bg-black/50" aria-hidden="true" @click="emit('close')" />
      <div :class="['pixel-card relative w-full max-w-md p-4 space-y-4 z-10', props.panelClass]">
        <h2 v-if="title" class="pixel-title text-xs">{{ title }}</h2>
        <div :class="scrollable ? 'max-h-[min(85vh,32rem)] overflow-y-auto space-y-4' : 'contents'">
          <slot />
        </div>
        <slot name="actions" />
      </div>
    </div>
  </Teleport>
</template>
