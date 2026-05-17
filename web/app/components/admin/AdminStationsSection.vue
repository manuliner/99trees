<script setup lang="ts">
import type { AdminStationCreateInput, AdminStationPatchInput } from '#shared/schemas'
import type { AdminStation } from '#shared/types'
import { adminStationFieldTooltip } from '#shared/station-slug'

const props = defineProps<{
  stationCount?: number
  fieldCount?: number
  editionSlug?: string
  stations: AdminStation[]
  onImport: (json: string) => Promise<boolean>
}>()

const emit = defineEmits<{
  download: []
  saveStation: [stationId: number, payload: AdminStationPatchInput]
  createStation: [payload: AdminStationCreateInput]
}>()

const importOpen = ref(false)
const editOpen = ref(false)
const editingStation = ref<AdminStation | null>(null)
const createField = ref<number | null>(null)

const showBoard = computed(() => props.fieldCount != null && props.fieldCount > 0)

const fieldTooltips = computed(() => {
  const map: Record<number, { taskType: 'quiz' | 'performance'; text: string }> = {}
  for (const s of props.stations) {
    const tip = adminStationFieldTooltip(s)
    if (tip) map[s.fieldNumber] = tip
  }
  return map
})

const usedSlugs = computed(() => props.stations.map((s) => s.slug))

const canDownload = computed(
  () => props.stationCount != null && props.stationCount > 0,
)

function openEditForField(field: number) {
  const station = props.stations.find((s) => s.fieldNumber === field)
  editingStation.value = station ?? null
  createField.value = station ? null : field
  editOpen.value = true
}

function closeEdit() {
  editOpen.value = false
  editingStation.value = null
  createField.value = null
}

function onSaveEdit(payload: AdminStationPatchInput) {
  if (!editingStation.value) return
  emit('saveStation', editingStation.value.id, payload)
  closeEdit()
}

function onSaveCreate(payload: AdminStationCreateInput) {
  emit('createStation', payload)
  closeEdit()
}

async function onImport(json: string) {
  const ok = await props.onImport(json)
  if (ok) importOpen.value = false
}
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="stationCount != null && fieldCount != null && stationCount > 0"
      class="admin-body text-xs text-[var(--pixel-score-plus)]"
    >
      Current: {{ stationCount }} / {{ fieldCount }} fields
    </p>

    <div class="flex gap-2 items-center">
      <div class="flex-1 min-w-0">
        <PixelButton variant="secondary" @click="importOpen = true">Import stations</PixelButton>
      </div>
      <PixelIconButton
        label="Download stations"
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
          :configured-fields="stations.map((s) => s.fieldNumber)"
          :field-tooltips="fieldTooltips"
          @field-select="openEditForField"
        />
      </div>
      <template #fallback>
        <div class="pixel-card min-h-[12rem] p-3" aria-hidden="true" />
      </template>
    </ClientOnly>

    <p v-else class="admin-body text-xs opacity-70">
      Set field count in edition settings, or import stations to use the board.
    </p>

    <AdminStationsImportModal
      :open="importOpen"
      @close="importOpen = false"
      @import="onImport"
    />

    <AdminStationEditModal
      :open="editOpen"
      :station="editingStation"
      :create-field="createField"
      :used-slugs="usedSlugs"
      @close="closeEdit"
      @save-edit="onSaveEdit"
      @save-create="onSaveCreate"
    />
  </div>
</template>
