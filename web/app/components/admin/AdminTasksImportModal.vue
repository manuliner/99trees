<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  import: [json: string, overwrite: boolean]
}>()

const importJson = ref('')
const overwrite = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      importJson.value = ''
      overwrite.value = false
    }
  },
)

function openFilePicker() {
  fileInputRef.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') importJson.value = reader.result
  }
  reader.readAsText(file)
  input.value = ''
}

function onImport() {
  emit('import', importJson.value, overwrite.value)
}

function onClose() {
  emit('close')
}
</script>

<template>
  <PixelDialog :open="open" title="Import tasks" scrollable panel-class="max-w-lg" @close="onClose">
    <p class="admin-body text-xs opacity-80">
      Import merges by slug; QR tokens stay the same for updated tasks.
    </p>
    <p class="admin-body text-xs opacity-70">
      <code class="text-[10px]">slug</code> is optional (generated from question or performance text if omitted).
      By default, tasks not in the file are kept. Duplicate slugs in one file are rejected.
    </p>
    <label class="admin-body flex items-start gap-2 text-xs cursor-pointer">
      <input
        v-model="overwrite"
        type="checkbox"
        class="mt-0.5 shrink-0"
      >
      <span>
        <strong>Overwrite edition tasks</strong> — remove tasks whose slug is not in the file and
        allow field moves (including swaps). Use for a full replace; cannot be undone if teams already played those tasks.
      </span>
    </label>
    <textarea
      v-model="importJson"
      rows="10"
      class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] font-mono text-xs admin-body"
      placeholder='{ "tasks": [ ... ] }'
    />
    <input
      ref="fileInputRef"
      type="file"
      accept=".json,application/json"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onFileSelected"
    >
    <PixelButton variant="secondary" @click="openFilePicker">Upload JSON</PixelButton>

    <template #actions>
      <div class="flex flex-wrap gap-2 justify-end">
        <PixelButton variant="secondary" @click="onClose">Cancel</PixelButton>
        <PixelButton :disabled="!importJson.trim()" @click="onImport">Import</PixelButton>
      </div>
    </template>
  </PixelDialog>
</template>
