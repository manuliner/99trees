<script setup lang="ts">
import type { AdminTaskCreateInput, AdminTaskPatchInput } from '#shared/schemas'
import type { LocalizedString, LocalizedStringList } from '#shared/localized'
import type { AdminTask, QuizInputMode } from '#shared/types'
import { normalizeQuizInputMode } from '#shared/quiz-payload'
import { resolveTaskSlug } from '#shared/task-slug'

type LocalizedField = LocalizedString

function emptyLocalizedField(): LocalizedField {
  return { de: '', en: '' }
}

function parseLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

const props = defineProps<{
  open: boolean
  task: AdminTask | null
  createField?: number | null
  usedSlugs?: string[]
}>()

const emit = defineEmits<{
  close: []
  saveEdit: [payload: AdminTaskPatchInput]
  saveCreate: [payload: AdminTaskCreateInput]
}>()

const slug = ref('')
const hintVague = ref<LocalizedField>(emptyLocalizedField())
const hintLevel1 = ref<LocalizedField>(emptyLocalizedField())
const hintLevel2 = ref<LocalizedField>(emptyLocalizedField())
const mapX = ref(0)
const mapY = ref(0)
const activityType = ref<'quiz' | 'performance'>('quiz')
const quizInputMode = ref<QuizInputMode>('freeText')
const quizQuestion = ref<LocalizedField>(emptyLocalizedField())
const quizAnswersDe = ref('')
const quizAnswersEn = ref('')
const quizChoicesDe = ref('')
const quizChoicesEn = ref('')
const quizCorrectAnswerDe = ref('')
const quizCorrectAnswerEn = ref('')
const performanceText = ref<LocalizedField>(emptyLocalizedField())

const parsedQuizChoicesDe = computed(() => parseLines(quizChoicesDe.value))
const parsedQuizChoicesEn = computed(() => parseLines(quizChoicesEn.value))
const originalSlug = ref('')
const slugManuallyEdited = ref(false)
const saveError = ref('')

const isCreate = computed(() => props.createField != null && props.task == null)

const dialogOpen = computed(
  () => props.open && (props.task != null || props.createField != null),
)

const dialogTitle = computed(() => {
  const field = props.task?.fieldNumber ?? props.createField
  if (field == null) return undefined
  return isCreate.value ? `Add task — field ${field}` : `Field ${field}`
})

function currentActivity() {
  if (activityType.value !== 'quiz') {
    return {
      type: 'performance' as const,
      text: performanceText.value,
    }
  }

  if (quizInputMode.value === 'multipleChoice') {
    return {
      type: 'quiz' as const,
      inputMode: 'multipleChoice' as const,
      question: quizQuestion.value,
      choices: {
        de: parsedQuizChoicesDe.value,
        en: parsedQuizChoicesEn.value,
      },
      answers: {
        de: quizCorrectAnswerDe.value.trim() ? [quizCorrectAnswerDe.value.trim()] : [],
        en: quizCorrectAnswerEn.value.trim() ? [quizCorrectAnswerEn.value.trim()] : [],
      },
    }
  }

  return {
    type: 'quiz' as const,
    inputMode: 'freeText' as const,
    question: quizQuestion.value,
    answers: {
      de: parseLines(quizAnswersDe.value),
      en: parseLines(quizAnswersEn.value),
    },
  }
}

function resetForm() {
  slugManuallyEdited.value = false
  saveError.value = ''
  if (props.task) {
    const s = props.task
    slug.value = s.slug
    originalSlug.value = s.slug
    hintVague.value = { ...s.hintVague }
    hintLevel1.value = { ...s.hintLevel1 }
    hintLevel2.value = { ...s.hintLevel2 }
    mapX.value = s.mapX
    mapY.value = s.mapY
    activityType.value = s.activityType
    if (s.activityPayload.type === 'quiz') {
      const payload = s.activityPayload
      quizInputMode.value = normalizeQuizInputMode(payload)
      quizQuestion.value = { ...payload.question }
      if (quizInputMode.value === 'multipleChoice') {
        quizChoicesDe.value = (payload.choices?.de ?? []).join('\n')
        quizChoicesEn.value = (payload.choices?.en ?? []).join('\n')
        quizCorrectAnswerDe.value = payload.answers.de[0] ?? ''
        quizCorrectAnswerEn.value = payload.answers.en[0] ?? ''
        quizAnswersDe.value = ''
        quizAnswersEn.value = ''
      }
      else {
        quizAnswersDe.value = payload.answers.de.join('\n')
        quizAnswersEn.value = payload.answers.en.join('\n')
        quizChoicesDe.value = ''
        quizChoicesEn.value = ''
        quizCorrectAnswerDe.value = ''
        quizCorrectAnswerEn.value = ''
      }
    }
    else {
      performanceText.value = { ...s.activityPayload.text }
    }
    return
  }

  const field = props.createField ?? 1
  slug.value = ''
  originalSlug.value = ''
  hintVague.value = emptyLocalizedField()
  hintLevel1.value = emptyLocalizedField()
  hintLevel2.value = emptyLocalizedField()
  mapX.value = field * 10
  mapY.value = 50
  activityType.value = 'quiz'
  quizInputMode.value = 'freeText'
  quizQuestion.value = emptyLocalizedField()
  quizAnswersDe.value = ''
  quizAnswersEn.value = ''
  quizChoicesDe.value = ''
  quizChoicesEn.value = ''
  quizCorrectAnswerDe.value = ''
  quizCorrectAnswerEn.value = ''
  performanceText.value = emptyLocalizedField()
  updateAutoSlug()
}

function updateAutoSlug() {
  if (!isCreate.value || slugManuallyEdited.value) return
  const field = props.createField!
  const used = new Set(props.usedSlugs ?? [])
  slug.value = resolveTaskSlug(field, currentActivity(), undefined, used)
}

watch(
  () => [props.open, props.task, props.createField] as const,
  ([open]) => {
    if (open) resetForm()
  },
)

watch(
  [activityType, quizQuestion, performanceText],
  () => {
    if (isCreate.value) updateAutoSlug()
  },
  { deep: true },
)

const slugChanged = computed(
  () => !isCreate.value && props.task != null && slug.value !== originalSlug.value,
)

function onSlugInput() {
  slugManuallyEdited.value = true
}

function localizedFieldComplete(field: LocalizedField): boolean {
  return field.de.trim().length > 0 && field.en.trim().length > 0
}

function validateBeforeSave(): boolean {
  if (!localizedFieldComplete(hintVague.value)) {
    saveError.value = 'Hint (vague) requires both DE and EN.'
    return false
  }
  if (!localizedFieldComplete(hintLevel1.value)) {
    saveError.value = 'Hint level 1 requires both DE and EN.'
    return false
  }
  if (!localizedFieldComplete(hintLevel2.value)) {
    saveError.value = 'Hint level 2 requires both DE and EN.'
    return false
  }

  if (activityType.value === 'performance') {
    if (!localizedFieldComplete(performanceText.value)) {
      saveError.value = 'Performance text requires both DE and EN.'
      return false
    }
    saveError.value = ''
    return true
  }

  if (!localizedFieldComplete(quizQuestion.value)) {
    saveError.value = 'Quiz question requires both DE and EN.'
    return false
  }

  if (quizInputMode.value === 'freeText') {
    if (parseLines(quizAnswersDe.value).length < 1 || parseLines(quizAnswersEn.value).length < 1) {
      saveError.value = 'Accepted answers require at least one value in DE and EN.'
      return false
    }
  }
  else {
    if (parsedQuizChoicesDe.value.length < 2 || parsedQuizChoicesEn.value.length < 2) {
      saveError.value = 'Multiple choice requires at least two options in DE and EN.'
      return false
    }
    if (!quizCorrectAnswerDe.value.trim() || !quizCorrectAnswerEn.value.trim()) {
      saveError.value = 'Select a correct answer for DE and EN.'
      return false
    }
  }

  saveError.value = ''
  return true
}

function buildPayloadBase() {
  return {
    hint_vague: {
      de: hintVague.value.de.trim(),
      en: hintVague.value.en.trim(),
    },
    hint_level_1: {
      de: hintLevel1.value.de.trim(),
      en: hintLevel1.value.en.trim(),
    },
    hint_level_2: {
      de: hintLevel2.value.de.trim(),
      en: hintLevel2.value.en.trim(),
    },
    map: { x: mapX.value, y: mapY.value },
    activity: currentActivity(),
  }
}

function onSave() {
  if (!validateBeforeSave()) return

  if (isCreate.value) {
    const payload: AdminTaskCreateInput = {
      field: props.createField!,
      ...buildPayloadBase(),
    }
    if (slugManuallyEdited.value && slug.value.trim()) {
      payload.slug = slug.value.trim()
    }
    emit('saveCreate', payload)
    return
  }

  const payload: AdminTaskPatchInput = buildPayloadBase()
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
        Changing the slug invalidates printed task QR URLs for this field.
      </p>
      <p v-if="saveError" class="admin-body text-xs text-[var(--pixel-score-minus)]">{{ saveError }}</p>

      <div>
        <label class="admin-body text-xs block">Slug</label>
        <input
          v-model="slug"
          class="pixel-input w-full p-2 admin-body font-mono text-xs"
          :readonly="isCreate && !slugManuallyEdited"
          @input="onSlugInput"
        >
        <p v-if="isCreate && !slugManuallyEdited" class="admin-body text-xs opacity-70 mt-1">
          Auto-generated from the German question or performance text.
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

      <div class="space-y-2">
        <label class="admin-body text-xs block">Hint (vague)</label>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <textarea v-model="hintVague.de" rows="2" placeholder="DE" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
          <textarea v-model="hintVague.en" rows="2" placeholder="EN" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
        </div>
      </div>

      <div class="space-y-2">
        <label class="admin-body text-xs block">Hint level 1</label>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <textarea v-model="hintLevel1.de" rows="2" placeholder="DE" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
          <textarea v-model="hintLevel1.en" rows="2" placeholder="EN" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
        </div>
      </div>

      <div class="space-y-2">
        <label class="admin-body text-xs block">Hint level 2</label>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <textarea v-model="hintLevel2.de" rows="2" placeholder="DE" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
          <textarea v-model="hintLevel2.en" rows="2" placeholder="EN" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
        </div>
      </div>

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

      <label class="admin-body text-xs block">Activity type</label>
      <select v-model="activityType" class="pixel-input w-full p-2 admin-body">
        <option value="quiz">Quiz</option>
        <option value="performance">Performance</option>
      </select>

      <template v-if="activityType === 'quiz'">
        <div class="space-y-2">
          <label class="admin-body text-xs block">Question</label>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <textarea v-model="quizQuestion.de" rows="2" placeholder="DE" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
            <textarea v-model="quizQuestion.en" rows="2" placeholder="EN" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
          </div>
        </div>

        <label class="admin-body text-xs block">Input mode</label>
        <select v-model="quizInputMode" class="pixel-input w-full p-2 admin-body">
          <option value="freeText">Free text</option>
          <option value="multipleChoice">Multiple choice</option>
        </select>

        <template v-if="quizInputMode === 'freeText'">
          <label class="admin-body text-xs block">Accepted answers (one per line)</label>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <textarea v-model="quizAnswersDe" rows="4" placeholder="DE" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs font-mono" />
            <textarea v-model="quizAnswersEn" rows="4" placeholder="EN" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs font-mono" />
          </div>
        </template>

        <template v-else>
          <label class="admin-body text-xs block">Choices (one per line)</label>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <textarea v-model="quizChoicesDe" rows="4" placeholder="DE" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs font-mono" />
            <textarea v-model="quizChoicesEn" rows="4" placeholder="EN" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs font-mono" />
          </div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label class="admin-body text-xs block">Correct answer (DE)</label>
              <select
                v-if="parsedQuizChoicesDe.length > 0"
                v-model="quizCorrectAnswerDe"
                class="pixel-input w-full p-2 admin-body"
              >
                <option disabled value="">Select correct choice</option>
                <option v-for="choice in parsedQuizChoicesDe" :key="`de-${choice}`" :value="choice">
                  {{ choice }}
                </option>
              </select>
              <input
                v-else
                v-model="quizCorrectAnswerDe"
                class="pixel-input w-full p-2 admin-body text-xs"
                placeholder="Must match a DE choice"
              >
            </div>
            <div>
              <label class="admin-body text-xs block">Correct answer (EN)</label>
              <select
                v-if="parsedQuizChoicesEn.length > 0"
                v-model="quizCorrectAnswerEn"
                class="pixel-input w-full p-2 admin-body"
              >
                <option disabled value="">Select correct choice</option>
                <option v-for="choice in parsedQuizChoicesEn" :key="`en-${choice}`" :value="choice">
                  {{ choice }}
                </option>
              </select>
              <input
                v-else
                v-model="quizCorrectAnswerEn"
                class="pixel-input w-full p-2 admin-body text-xs"
                placeholder="Must match an EN choice"
              >
            </div>
          </div>
        </template>
      </template>

      <template v-else>
        <div class="space-y-2">
          <label class="admin-body text-xs block">Performance text</label>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <textarea v-model="performanceText.de" rows="3" placeholder="DE" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
            <textarea v-model="performanceText.en" rows="3" placeholder="EN" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] admin-body text-xs" />
          </div>
        </div>
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
