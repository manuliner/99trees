<script setup lang="ts">
const { confirmState, onConfirm, onCancel } = usePixelConfirm()
</script>

<template>
  <PixelConfirmDialog
    :open="confirmState.open"
    :title="confirmState.title"
    :message="confirmState.message"
    :confirm-label="confirmState.confirmLabel"
    :cancel-label="confirmState.cancelLabel"
    :confirm-variant="confirmState.confirmVariant"
    @confirm="onConfirm"
    @cancel="onCancel"
  />
</template>
