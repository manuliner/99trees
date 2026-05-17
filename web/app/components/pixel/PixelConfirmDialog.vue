<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: 'primary' | 'danger'
  }>(),
  {
    confirmLabel: 'Continue',
    cancelLabel: 'Cancel',
    confirmVariant: 'primary',
  },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <PixelDialog :open="open" :title="title" @close="emit('cancel')">
    <p class="pixel-body text-sm">{{ message }}</p>
    <template #actions>
      <div class="flex gap-2">
        <PixelButton variant="secondary" @click="emit('cancel')">{{ cancelLabel }}</PixelButton>
        <PixelButton :variant="confirmVariant" @click="emit('confirm')">{{ confirmLabel }}</PixelButton>
      </div>
    </template>
  </PixelDialog>
</template>
