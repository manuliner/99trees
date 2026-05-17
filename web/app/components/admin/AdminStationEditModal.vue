<script setup lang="ts">
import type { AdminStationCreateInput, AdminStationPatchInput } from '#shared/schemas'
import type { AdminStation } from '#shared/types'
import { resolveStationSlug } from '#shared/station-slug'

const props = defineProps<{
  open: boolean
  station: AdminStation | null
  createField?: number | null
  usedSlugs?: string[]
}>()

const emit = defineEmits<{
  close: []
  saveEdit: [payload: AdminStationPatchInput]
  saveCreate: [payload: AdminStationCreateInput]
}>()

const slug = ref('')
const hintVague = ref('')
const hintLevel1 = ref('')
const hintLevel2 = ref('')
const mapX = ref(0)
const mapY = ref(0)
const taskType = ref<'quiz' | 'performance'>('quiz')
const quizQuestion = ref('')
const quizAnswers = ref('')
const performanceText = ref('')
const originalSlug = ref('')
const slugManuallyEdited = ref(false)

const isCreate = computed(() => props.createField != null && props.station == null)

const dialogOpen = computed(
  () => props.open && (props.station != null || props.createField != null),
)

const dialogTitle = computed(() => {
  const field = props.station?.fieldNumber ?? props.createField
  if (field == null) return undefined
  return isCreate.value ? `Add station — field ${field}` : `Field ${field}`
})

function currentTask() {
  return taskType.value === 'quiz'
    ? {
        type: 'quiz' as const,
        question: quizQuestion.value,
        answers: quizAnswers.value
          .split('\n')
          .map((a) => a.trim())
          .filter(Boolean),
      }
    : {
        type: 'performance' as const,
        text: performanceText.value,
      }
}

function resetForm() {
  slugManuallyEdited.value = false
  if (props.station) {
    const s = props.station
    slug.value = s.slug
    originalSlug.value = s.slug
    hintVague.value = s.hintVague
    hintLevel1.value = s.hintLevel1
    hintLevel2.value = s.hintLevel2
    mapX.value = s.mapX
    mapY.value = s.mapY
    taskType.value = s.taskType
    if (s.taskPayload.type === 'quiz') {
      quizQuestion.value = s.taskPayload.question
      quizAnswers.value = s.taskPayload.answers.join('\n')
    }
    else {
      performanceText.value = s.taskPayload.text
    }
    return
  }

  const field = props.createField ?? 1
  slug.value = ''
  originalSlug.value = ''
  hintVague.value = ''
  hintLevel1.value = ''
  hintLevel2.value = ''
  mapX.value = field * 10
  mapY.value = 50
  taskType.value = 'quiz'
  quizQuestion.value = ''
  quizAnswers.value = ''
  performanceText.value = ''
  updateAutoSlug()
}

function updateAutoSlug() {
  if (!isCreate.value || slugManuallyEdited.value) return
  const field = props.createField!
  const used = new Set(props.usedSlugs ?? [])
  slug.value = resolveStationSlug(field, currentTask(), undefined, used)
}

watch(
  () => [props.open, props.station, props.createField] as const,
  ([open]) => {
    if (open) resetForm()
  },
)

watch([taskType, quizQuestion, performanceText], () => {
  if (isCreate.value) updateAutoSlug()
})

const slugChanged = computed(
  () => !isCreate.value && props.station != null && slug.value !== originalSlug.value,
)

function onSlugInput() {
  slugManuallyEdited.value = true
}

function buildPayloadBase() {
  return {
    hint_vague: hintVague.value.trim(),
    hint_level_1: hintLevel1.value.trim(),
    hint_level_2: hintLevel2.value.trim(),
    map: { x: mapX.value, y: mapY.value },
    task: currentTask(),
  }
}

function onSave() {
  if (isCreate.value) {
    const payload: AdminStationCreateInput = {
      field: props.createField!,
      ...buildPayloadBase(),
    }
    if (slugManuallyEdited.value && slug.value.trim()) {
      payload.slug = slug.value.trim()
    }
    emit('saveCreate', payload)
    return
  }

  const payload: AdminStationPatchInput = buildPayloadBase()
  if (slugManuallyEdited.value && slug.value.trim()) {
    payload.slug = slug.value.trim()
  }
  emit('saveEdit', payload)
}
</script>

<template>
  <PixelDialog
    :open="dialogOpen"
    :title="dialogTitle"
    scrollable
    panel-class="max-w-lg"
    @close="emit('close')"
  >
    <div class="space-y-3">
      <p v-if="slugChanged" class="admin-body text-xs text-[var(--pixel-score-minus)]">
        Changing the slug invalidates printed station QR URLs for this field.
      </p>

      <div>
        <label class="admin-body text-xs block">Slug</label>
        <input
          v-model="slug"
          class="pixel-input w-full p-2 admin-body font-mono text-xs"
          :readonly="isCreate && !slugManuallyEdited"
          @input="onSlugInput"
        >
        <p v-if="isCreate && !slugManuallyEdited" class="admin-body text-xs opacity-70 mt-1">
          Auto-generated from the question or performance text.
        </p>
        <button
          v-else-if="isCreate && slugManuallyEdited"
          type="button"
          class="admin-body text-xs underline opacity-80 mt-1"
          @click="slugManuallyEdited = false; updateAutoSlug()"
        >
          Reset to auto-generated
        </button>
      </div>

      <label class="admin-body text-xs block">Hint (vague)</label>
      <textarea v-model="hintVague" rows="2" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />

      <label class="admin-body text-xs block">Hint level 1</label>
      <textarea v-model="hintLevel1" rows="2" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />

      <label class="admin-body text-xs block">Hint level 2</label>
      <textarea v-model="hintLevel2" rows="2" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="admin-body text-xs block">Map X</label>
          <input v-model.number="mapX" type="number" min="0" max="100" class="pixel-input w-full p-2 admin-body">
        </div>
        <div>
          <label class="admin-body text-xs block">Map Y</label>
          <input v-model.number="mapY" type="number" min="0" max="100" class="pixel-input w-full p-2 admin-body">
        </div>
      </div>

      <label class="admin-body text-xs block">Task type</label>
      <select v-model="taskType" class="pixel-input w-full p-2 admin-body">
        <option value="quiz">Quiz</option>
        <option value="performance">Performance</option>
      </select>

      <template v-if="taskType === 'quiz'">
        <label class="admin-body text-xs block">Question</label>
        <textarea v-model="quizQuestion" rows="2" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
        <label class="admin-body text-xs block">Answers (one per line)</label>
        <textarea v-model="quizAnswers" rows="4" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs font-mono" />
      </template>

      <template v-else>
        <label class="admin-body text-xs block">Performance text</label>
        <textarea v-model="performanceText" rows="3" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
      </template>
    </div>

    <template #actions>
      <div class="flex flex-wrap gap-2 justify-end">
        <PixelButton variant="secondary" @click="emit('close')">Cancel</PixelButton>
        <PixelButton @click="onSave">{{ isCreate ? 'Create' : 'Save' }}</PixelButton>
      </div>
    </template>
  </PixelDialog>
</template>
