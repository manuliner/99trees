<script setup lang="ts">
import type { AdminTaskCreateInput, AdminTaskPatchInput } from '#shared/schemas'
import type { AdminTask } from '#shared/types'
import { MAX_EDITION_FIELD_COUNT } from '#shared/types'
import { adminTaskFieldTooltip } from '#shared/task-slug'

const props = defineProps<{
  taskCount?: number
  fieldCount?: number
  canEditFields?: boolean
  editionSlug?: string
  tasks: AdminTask[]
  onImport: (json: string, overwrite: boolean) => Promise<boolean>
}>()

const emit = defineEmits<{
  download: []
  addField: []
  removeField: []
  deleteTask: [taskId: number]
  saveTask: [taskId: number, payload: AdminTaskPatchInput]
  createTask: [payload: AdminTaskCreateInput]
}>()

const importOpen = ref(false)
const editOpen = ref(false)
const editingTask = ref<AdminTask | null>(null)
const createField = ref<number | null>(null)

const showBoard = computed(() => props.fieldCount != null && props.fieldCount > 0)

const canRemoveField = computed(
  () => props.canEditFields && props.fieldCount != null && props.fieldCount > 0,
)

const canAddField = computed(
  () => props.canEditFields && props.fieldCount != null && props.fieldCount < MAX_EDITION_FIELD_COUNT,
)

const fieldTooltips = computed(() => {
  const map: Record<number, { activityType: 'quiz' | 'performance' | 'coop' | 'media'; text: string }> = {}
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

function onRemoveTask() {
  if (!editingTask.value) return
  emit('deleteTask', editingTask.value.id)
  closeEdit()
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
        <div
          v-if="canEditFields"
          class="flex items-center justify-center gap-2"
        >
          <PixelIconButton
            label="Add field"
            tooltip="Add field"
            variant="secondary"
            :disabled="!canAddField"
            @click="emit('addField')"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" stroke-linecap="square" />
            </svg>
          </PixelIconButton>
          <p v-if="fieldCount != null" class="admin-body text-xs opacity-80 tabular-nums">
            {{ fieldCount }} {{ fieldCount === 1 ? 'field' : 'fields' }}
          </p>
          <PixelIconButton
            label="Remove last field"
            tooltip="Remove last field"
            variant="danger"
            :disabled="!canRemoveField"
            @click="emit('removeField')"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path d="M5 12h14" stroke-linecap="square" />
            </svg>
          </PixelIconButton>
        </div>
      </div>
      <template #fallback>
        <div class="pixel-card min-h-[12rem] p-3" aria-hidden="true" />
      </template>
    </ClientOnly>

    <div v-else-if="canEditFields" class="space-y-2">
      <p class="admin-body text-xs opacity-70">
        Add a field to show the board, or import tasks.
      </p>
      <PixelIconButton
        label="Add field"
        tooltip="Add field"
        variant="secondary"
        :disabled="!canAddField"
        @click="emit('addField')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" stroke-linecap="square" />
        </svg>
      </PixelIconButton>
    </div>
    <p v-else class="admin-body text-xs opacity-70">
      End the edition to add or remove board fields.
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
      :field-count="fieldCount"
      :used-slugs="usedSlugs"
      :can-remove="canEditFields"
      @close="closeEdit"
      @save-edit="onSaveEdit"
      @save-create="onSaveCreate"
      @remove="onRemoveTask"
    />
  </div>
</template>
