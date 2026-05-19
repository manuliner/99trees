<script setup lang="ts">
import type { AdminTaskCreateInput, AdminTaskPatchInput } from '#shared/schemas'
import type { LocalizedString, LocalizedStringList } from '#shared/localized'
import type { AdminTask, MediaKind, QuizInputMode } from '#shared/types'
import { MAX_EDITION_FIELD_COUNT } from '#shared/types'
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
  fieldCount?: number
  usedSlugs?: string[]
  canRemove?: boolean
}>()

const emit = defineEmits<{
  close: []
  saveEdit: [payload: AdminTaskPatchInput]
  saveCreate: [payload: AdminTaskCreateInput]
  remove: []
}>()

const slug = ref('')
const hintVague = ref<LocalizedField>(emptyLocalizedField())
const hintLevel1 = ref<LocalizedField>(emptyLocalizedField())
const hintLevel2 = ref<LocalizedField>(emptyLocalizedField())
const mapX = ref(0)
const mapY = ref(0)
const activityType = ref<'quiz' | 'performance' | 'coop' | 'media'>('quiz')
const quizInputMode = ref<QuizInputMode>('freeText')
const quizQuestion = ref<LocalizedField>(emptyLocalizedField())
const quizAnswersDe = ref('')
const quizAnswersEn = ref('')
const quizChoicesDe = ref('')
const quizChoicesEn = ref('')
const quizCorrectAnswerDe = ref('')
const quizCorrectAnswerEn = ref('')
const performanceText = ref<LocalizedField>(emptyLocalizedField())
const mediaText = ref<LocalizedField>(emptyLocalizedField())
const mediaAllowedPhoto = ref(true)
const mediaAllowedVideo = ref(false)
const mediaAllowedAudio = ref(false)
const mediaMaxDurationSec = ref<number | null>(null)
const coopInstructions = ref<LocalizedField>(emptyLocalizedField())
const coopPartnerInstructions = ref<LocalizedField>(emptyLocalizedField())

const parsedQuizChoicesDe = computed(() => parseLines(quizChoicesDe.value))
const parsedQuizChoicesEn = computed(() => parseLines(quizChoicesEn.value))
const originalSlug = ref('')
const slugManuallyEdited = ref(false)
const saveError = ref('')
const fieldNumber = ref(1)
const originalFieldNumber = ref(1)

const isCreate = computed(() => props.createField != null && props.task == null)

const dialogOpen = computed(
  () => props.open && (props.task != null || props.createField != null),
)

const dialogTitle = computed(() => {
  if (props.task == null && props.createField == null) return undefined
  return isCreate.value ? 'Add station' : 'Edit station'
})

const maxFieldNumber = computed(() => MAX_EDITION_FIELD_COUNT)

const fieldShiftPreview = computed(() => {
  const from = originalFieldNumber.value
  const to = fieldNumber.value
  if (to === from) return null
  if (to > from) {
    return `Fields ${to} and above shift up; stations ${from + 1}–${to - 1} move down to close the gap.`
  }
  return `Fields ${to} and above shift up; stations above field ${from} move down.`
})

function currentActivity() {
  if (activityType.value === 'coop') {
    return {
      type: 'coop' as const,
      instructions: coopInstructions.value,
      partnerInstructions: coopPartnerInstructions.value,
    }
  }
  if (activityType.value === 'performance') {
    return {
      type: 'performance' as const,
      text: performanceText.value,
    }
  }
  if (activityType.value === 'media') {
    const allowedKinds: MediaKind[] = []
    if (mediaAllowedPhoto.value) allowedKinds.push('photo')
    if (mediaAllowedVideo.value) allowedKinds.push('video')
    if (mediaAllowedAudio.value) allowedKinds.push('audio')
    return {
      type: 'media' as const,
      text: mediaText.value,
      allowedKinds: (allowedKinds.length > 0 ? allowedKinds : ['photo']) as MediaKind[],
      ...(mediaMaxDurationSec.value != null && mediaMaxDurationSec.value > 0
        ? { maxDurationSec: mediaMaxDurationSec.value }
        : {}),
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
    fieldNumber.value = s.fieldNumber
    originalFieldNumber.value = s.fieldNumber
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
    else if (s.activityPayload.type === 'coop') {
      coopInstructions.value = { ...s.activityPayload.instructions }
      coopPartnerInstructions.value = { ...s.activityPayload.partnerInstructions }
    }
    else if (s.activityPayload.type === 'media') {
      mediaText.value = { ...s.activityPayload.text }
      mediaAllowedPhoto.value = s.activityPayload.allowedKinds.includes('photo')
      mediaAllowedVideo.value = s.activityPayload.allowedKinds.includes('video')
      mediaAllowedAudio.value = s.activityPayload.allowedKinds.includes('audio')
      mediaMaxDurationSec.value = s.activityPayload.maxDurationSec ?? null
    }
    else {
      performanceText.value = { ...s.activityPayload.text }
    }
    return
  }

  const field = props.createField ?? 1
  fieldNumber.value = field
  originalFieldNumber.value = field
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
  mediaText.value = emptyLocalizedField()
  mediaAllowedPhoto.value = true
  mediaAllowedVideo.value = false
  mediaAllowedAudio.value = false
  mediaMaxDurationSec.value = null
  coopInstructions.value = emptyLocalizedField()
  coopPartnerInstructions.value = emptyLocalizedField()
  updateAutoSlug()
}

function updateAutoSlug() {
  if (!isCreate.value || slugManuallyEdited.value) return
  const used = new Set(props.usedSlugs ?? [])
  slug.value = resolveTaskSlug(fieldNumber.value, currentActivity(), undefined, used)
}

watch(
  () => [props.open, props.task, props.createField] as const,
  ([open]) => {
    if (open) resetForm()
  },
)

watch(
  [activityType, quizQuestion, performanceText, mediaText],
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
  if (
    !Number.isInteger(fieldNumber.value)
    || fieldNumber.value < 1
    || fieldNumber.value > maxFieldNumber.value
  ) {
    saveError.value = `Field number must be between 1 and ${maxFieldNumber.value}.`
    return false
  }

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

  if (activityType.value === 'media') {
    if (!localizedFieldComplete(mediaText.value)) {
      saveError.value = 'Media task text requires both DE and EN.'
      return false
    }
    if (!mediaAllowedPhoto.value && !mediaAllowedVideo.value && !mediaAllowedAudio.value) {
      saveError.value = 'Select at least one allowed media kind.'
      return false
    }
    saveError.value = ''
    return true
  }

  if (activityType.value === 'coop') {
    if (!localizedFieldComplete(coopInstructions.value)) {
      saveError.value = 'Co-op initiator instructions require both DE and EN.'
      return false
    }
    if (!localizedFieldComplete(coopPartnerInstructions.value)) {
      saveError.value = 'Co-op partner instructions require both DE and EN.'
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
      field: fieldNumber.value,
      ...buildPayloadBase(),
    }
    if (slugManuallyEdited.value && slug.value.trim()) {
      payload.slug = slug.value.trim()
    }
    emit('saveCreate', payload)
    return
  }

  const payload: AdminTaskPatchInput = buildPayloadBase()
  if (fieldNumber.value !== originalFieldNumber.value) {
    payload.field = fieldNumber.value
  }
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
    <template v-if="!isCreate && canRemove" #header-actions>
      <PixelIconButton
        label="Remove station"
        tooltip="Remove station"
        variant="danger"
        class="shrink-0"
        @click="emit('remove')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <path
            d="M5 7h14M9 7V5h6v2m-8 4v8h10v-8"
            stroke-linecap="square"
            stroke-linejoin="miter"
          />
        </svg>
      </PixelIconButton>
    </template>

    <div class="space-y-3">
      <p v-if="slugChanged" class="admin-body text-xs text-[var(--pixel-score-minus)]">
        Changing the slug invalidates printed task QR URLs for this field.
      </p>
      <p v-if="saveError" class="admin-body text-xs text-[var(--pixel-score-minus)]">{{ saveError }}</p>

      <div>
        <label class="admin-body text-xs block">Field number</label>
        <input
          v-model.number="fieldNumber"
          type="number"
          min="1"
          :max="maxFieldNumber"
          class="pixel-input w-full p-2 admin-body"
        >
        <p v-if="fieldShiftPreview" class="admin-body text-xs opacity-80 mt-1">
          {{ fieldShiftPreview }}
        </p>
      </div>

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

      <AdminLocalizedTextareas v-model="hintVague" label="Hint (vague)" />

      <AdminLocalizedTextareas v-model="hintLevel1" label="Hint level 1" />

      <AdminLocalizedTextareas v-model="hintLevel2" label="Hint level 2" />

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
        <option value="coop">Co-op (depot)</option>
        <option value="media">Media upload</option>
      </select>

      <template v-if="activityType === 'media'">
        <AdminLocalizedTextareas v-model="mediaText" label="Task text" :rows="3" />
        <fieldset class="space-y-2">
          <legend class="admin-body text-xs">Allowed media kinds</legend>
          <label class="admin-body text-xs flex items-center gap-2">
            <input v-model="mediaAllowedPhoto" type="checkbox">
            Photo
          </label>
          <label class="admin-body text-xs flex items-center gap-2">
            <input v-model="mediaAllowedVideo" type="checkbox">
            Video
          </label>
          <label class="admin-body text-xs flex items-center gap-2">
            <input v-model="mediaAllowedAudio" type="checkbox">
            Audio
          </label>
        </fieldset>
        <label class="admin-body text-xs block">Max duration override (seconds, optional)</label>
        <input
          v-model.number="mediaMaxDurationSec"
          type="number"
          min="1"
          class="pixel-input w-full p-2 admin-body"
          placeholder="Empty: 60s video / 90s audio (re-save or db:reset after JSON import)"
        >
      </template>

      <template v-else-if="activityType === 'coop'">
        <AdminLocalizedTextareas v-model="coopInstructions" label="Initiator instructions" :rows="3" />
        <AdminLocalizedTextareas v-model="coopPartnerInstructions" label="Partner instructions" :rows="3" />
      </template>

      <template v-else-if="activityType === 'quiz'">
        <AdminLocalizedTextareas v-model="quizQuestion" label="Question" />

        <label class="admin-body text-xs block">Input mode</label>
        <select v-model="quizInputMode" class="pixel-input w-full p-2 admin-body">
          <option value="freeText">Free text</option>
          <option value="multipleChoice">Multiple choice</option>
        </select>

        <template v-if="quizInputMode === 'freeText'">
          <AdminBilingualTextareas
            v-model:de="quizAnswersDe"
            v-model:en="quizAnswersEn"
            label="Accepted answers (one per line)"
            :rows="4"
            mono
          />
        </template>

        <template v-else>
          <AdminBilingualTextareas
            v-model:de="quizChoicesDe"
            v-model:en="quizChoicesEn"
            label="Choices (one per line)"
            :rows="4"
            mono
          />
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

      <template v-else-if="activityType === 'performance'">
        <AdminLocalizedTextareas v-model="performanceText" label="Performance text" :rows="3" />
      </template>
    </div>

    <template #actions>
      <div class="flex flex-wrap gap-2 justify-end w-full">
        <PixelButton variant="secondary" class="!w-auto" @click="emit('close')">Cancel</PixelButton>
        <PixelButton class="!w-auto" @click="onSave">{{ isCreate ? 'Create' : 'Save' }}</PixelButton>
      </div>
    </template>
  </PixelDialog>
</template>
