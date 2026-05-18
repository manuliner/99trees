<script setup lang="ts">
import type { AdminTaskCreateInput, AdminTaskPatchInput } from '#shared/schemas'
import type { AdminTask } from '#shared/types'
import { adminTaskFieldTooltip } from '#shared/task-slug'

const props = defineProps<{
  taskCount?: number
  fieldCount?: number
  editionSlug?: string
  tasks: AdminTask[]
  onImport: (json: string, overwrite: boolean) => Promise<boolean>
}>()

const emit = defineEmits<{
  download: []
  saveTask: [taskId: number, payload: AdminTaskPatchInput]
  createTask: [payload: AdminTaskCreateInput]
}>()

const importOpen = ref(false)
const editOpen = ref(false)
const editingTask = ref<AdminTask | null>(null)
const createField = ref<number | null>(null)

const showBoard = computed(() => props.fieldCount != null && props.fieldCount > 0)

const fieldTooltips = computed(() => {
  const map: Record<number, { activityType: 'quiz' | 'performance'; text: string }> = {}
  for (const s of props.tasks) {
    const tip = adminTaskFieldTooltip(s)
    if (tip) map[s.fieldNumber] = tip
  }
  return map
})

const usedSlugs = computed(() => props.tasks.map((s) => s.slug))

const canDownload = computed(
  () => props.taskCount != null && props.taskCount > 0,
)

function openEditForField(field: number) {
  const task = props.tasks.find((s) => s.fieldNumber === field)
  editingTask.value = task ?? null
  createField.value = task ? null : field
  editOpen.value = true
}

function closeEdit() {
  editOpen.value = false
  editingTask.value = null
  createField.value = null
}

function onSaveEdit(payload: AdminTaskPatchInput) {
  if (!editingTask.value) return
  emit('saveTask', editingTask.value.id, payload)
  closeEdit()
}

function onSaveCreate(payload: AdminTaskCreateInput) {
  emit('createTask', payload)
  closeEdit()
}

async function onImport(json: string, overwrite: boolean) {
  const ok = await props.onImport(json, overwrite)
  if (ok) importOpen.value = false
}
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="props.taskCount != null && fieldCount != null && props.taskCount > 0"
      class="admin-body text-xs text-[var(--pixel-score-plus)]"
    >
      Current: {{ props.taskCount }} / {{ fieldCount }} fields
    </p>

    <div class="flex gap-2 items-center">
      <div class="flex-1 min-w-0">
        <PixelButton variant="secondary" @click="importOpen = true">Import tasks</PixelButton>
      </div>
      <PixelIconButton
        label="Download tasks"
        variant="accent"
        :disabled="!canDownload"
        @click="emit('download')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <path
            d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M6 18h12"
            stroke-linecap="square"
            stroke-linejoin="miter"
          />
        </svg>
      </PixelIconButton>
    </div>

    <ClientOnly v-if="showBoard">
      <div class="space-y-2">
        <PixelGameBoard
          :field-count="fieldCount!"
          :position-confirmed="0"
          selectable
          creatable
          :configured-fields="props.tasks.map((s) => s.fieldNumber)"
          :field-tooltips="fieldTooltips"
          @field-select="openEditForField"
        />
      </div>
      <template #fallback>
        <div class="pixel-card min-h-[12rem] p-3" aria-hidden="true" />
      </template>
    </ClientOnly>

    <p v-else class="admin-body text-xs opacity-70">
      Set field count in edition settings, or import tasks to use the board.
    </p>

    <AdminTasksImportModal
      :open="importOpen"
      @close="importOpen = false"
      @import="onImport"
    />

    <AdminTaskEditModal
      :open="editOpen"
      :task="editingTask"
      :create-field="createField"
      :used-slugs="usedSlugs"
      @close="closeEdit"
      @save-edit="onSaveEdit"
      @save-create="onSaveCreate"
    />
  </div>
</template>
