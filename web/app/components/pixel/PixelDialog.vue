<script setup lang="ts">
defineProps<{
  open: boolean
  title?: string
}>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
      <div class="pixel-card relative w-full max-w-md p-4 space-y-4 z-10">
        <h2 v-if="title" class="pixel-title text-xs">{{ title }}</h2>
        <slot />
        <slot name="actions" />
      </div>
    </div>
  </Teleport>
</template>
