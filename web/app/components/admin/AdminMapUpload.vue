<script setup lang="ts">
defineProps<{
  mapImageUrl: string | null
}>()

const emit = defineEmits<{ upload: [file: File] }>()

const fileInputRef = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInputRef.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', file)
  input.value = ''
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="mapImageUrl" class="admin-body text-xs break-all opacity-80">
      Current: {{ mapImageUrl }}
    </p>
    <img
      v-if="mapImageUrl"
      :src="mapImageUrl"
      alt="Edition map preview"
      class="w-full border-4 border-[var(--pixel-forest-dark)]"
      style="image-rendering: pixelated"
    >
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onFileSelected"
    >
    <PixelButton variant="secondary" @click="openFilePicker">Upload map</PixelButton>
    <p class="admin-body text-xs opacity-70">PNG, JPEG, or WebP (max 8 MB)</p>
  </div>
</template>
