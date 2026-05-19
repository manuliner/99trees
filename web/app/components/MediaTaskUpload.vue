<script setup lang="ts">
import type { MediaActivityPayload } from '#shared/types'
import { resolveClientTranscodePolicy } from '#shared/types'
import type { ClientTranscodePolicy } from '#shared/types'
import type { MediaKind } from '#shared/media-limits'
import {
  acceptAttributeForKinds,
  formatAllowedKindsList,
  formatBytes,
  maxDurationForKind,
  normalizeAllowedKinds,
  prepareMediaFile,
  validateMediaFile,
} from '~/utils/media'
import { VideoTranscodeError } from '~/utils/media/video-transcode'
import { mapApiError } from '~/utils/api-errors'

const props = defineProps<{
  turnId: number
  payload: MediaActivityPayload
  clientTranscode: ClientTranscodePolicy
  disabled?: boolean
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const { t, locale } = useI18n()
const { localized } = useLocalizedContent(useI18n().locale)
const { api } = useGameApi()

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const selectedKind = ref<MediaKind | null>(null)
const durationSec = ref<number | null>(null)
const phase = ref<'idle' | 'validating' | 'preparing' | 'compressing' | 'uploading'>('idle')
const compressProgress = ref<number | null>(null)
const errorKey = ref<string | null>(null)
const errorDetail = ref<string | null>(null)

const transcodePolicy = computed(() => resolveClientTranscodePolicy(props.clientTranscode))

const allowedKinds = computed(() => normalizeAllowedKinds(props.payload.allowedKinds))
const taskText = computed(() => localized(props.payload.text))
const accept = computed(() => acceptAttributeForKinds(allowedKinds.value))
const mediaHint = computed(() =>
  t('play.media.hintKinds', {
    kinds: formatAllowedKindsList(allowedKinds.value, locale.value),
  }),
)
const videoMaxDurationSec = computed(() =>
  allowedKinds.value.includes('video')
    ? maxDurationForKind('video', props.payload.maxDurationSec)
    : null,
)
const showTrimHint = computed(
  () => transcodePolicy.value.video && videoMaxDurationSec.value != null,
)
const busy = computed(() => phase.value !== 'idle' || props.disabled)

function openPicker() {
  if (busy.value) return
  fileInputRef.value?.click()
}

function clearError() {
  errorKey.value = null
  errorDetail.value = null
}

const VALIDATION_ERROR_KEYS = new Set([
  'tooLarge',
  'unsupportedType',
  'kindNotAllowed',
  'tooLong',
  'durationUnknown',
  'sourceTooLarge',
  'sourceTooLargeForBrowser',
  'transcodeFailed',
  'transcodeUnavailable',
])

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return

  clearError()
  selectedFile.value = file
  compressProgress.value = null
  phase.value = 'validating'

  try {
    const result = await validateMediaFile({
      file,
      allowedKinds: allowedKinds.value,
      maxDurationSec: props.payload.maxDurationSec,
      clientTranscode: transcodePolicy.value,
    })
    selectedKind.value = result.kind
    durationSec.value = result.durationSec
    await uploadSelected()
  }
  catch (e) {
    selectedKind.value = null
    durationSec.value = null
    if (e instanceof Error) {
      errorKey.value = e.message
    }
    else {
      errorKey.value = 'unknown'
    }
  }
  finally {
    if (phase.value === 'validating') phase.value = 'idle'
  }
}

async function uploadSelected() {
  if (!selectedFile.value || !selectedKind.value) return

  clearError()
  const kind = selectedKind.value
  const policy = transcodePolicy.value
  const willCompressVideo = kind === 'video' && policy.video
  phase.value = willCompressVideo ? 'compressing' : 'preparing'
  compressProgress.value = willCompressVideo ? 0 : null

  try {
    const prepared = await prepareMediaFile(
      selectedFile.value,
      kind,
      policy,
      willCompressVideo
        ? {
            onProgress: (ratio) => { compressProgress.value = ratio },
            maxDurationSec: props.payload.maxDurationSec,
          }
        : undefined,
    )

    const validated = await validateMediaFile({
      file: prepared,
      allowedKinds: allowedKinds.value,
      maxDurationSec: props.payload.maxDurationSec,
      clientTranscode: policy,
      afterPrepare: true,
    })
    const maxDuration = maxDurationForKind(kind, props.payload.maxDurationSec)
    durationSec.value =
      validated.durationSec != null && maxDuration != null
        ? Math.min(validated.durationSec, maxDuration)
        : validated.durationSec

    phase.value = 'uploading'
    compressProgress.value = null

    const form = new FormData()
    form.append('file', prepared, prepared.name || selectedFile.value.name)
    if (durationSec.value != null) {
      form.append('durationSec', String(Math.ceil(durationSec.value)))
    }

    await api(`/api/turns/${props.turnId}/submission`, {
      method: 'POST',
      body: form,
    })

    selectedFile.value = null
    selectedKind.value = null
    durationSec.value = null
    emit('uploaded')
  }
  catch (e) {
    if (e instanceof VideoTranscodeError) {
      errorKey.value = e.code
      if (import.meta.dev && e.detail) {
        errorDetail.value = e.detail
      }
    }
    else if (e instanceof Error && VALIDATION_ERROR_KEYS.has(e.message)) {
      errorKey.value = e.message
    }
    else {
      errorKey.value = 'uploadFailed'
      const err = e as { data?: { statusMessage?: string } }
      errorDetail.value = mapApiError(err.data?.statusMessage, 'play.media.errors.uploadFailed', t)
    }
  }
  finally {
    phase.value = 'idle'
    compressProgress.value = null
  }
}

function retryUpload() {
  if (!selectedFile.value) {
    openPicker()
    return
  }
  uploadSelected()
}

const statusLabel = computed(() => {
  switch (phase.value) {
    case 'validating': return t('play.media.validating')
    case 'compressing': return t('play.media.compressing')
    case 'preparing': return t('play.media.preparing')
    case 'uploading': return t('play.media.uploading')
    default: return null
  }
})

const errorMessage = computed(() => {
  if (!errorKey.value) return null
  const key = `play.media.errors.${errorKey.value}`
  const translated = t(key)
  const base = translated !== key ? translated : t('play.media.errors.uploadFailed')
  if (import.meta.dev && errorDetail.value) {
    return `${base} (${errorDetail.value})`
  }
  return base
})
</script>

<template>
  <section class="pixel-card space-y-4 p-4">
    <p class="pixel-title text-xs">{{ $t('play.media.title') }}</p>
    <p class="pixel-body text-sm whitespace-pre-wrap">{{ taskText }}</p>
    <p class="pixel-body text-xs opacity-80">{{ mediaHint }}</p>
    <p v-if="showTrimHint" class="pixel-body text-xs opacity-70">
      {{ $t('play.media.hintTrimVideo', { seconds: videoMaxDurationSec }) }}
    </p>

    <input
      ref="fileInputRef"
      type="file"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      :accept="accept"
      @change="onFileSelected"
    >

    <div v-if="selectedFile" class="pixel-body text-xs space-y-1">
      <p>{{ selectedFile.name }}</p>
      <p class="opacity-70">{{ formatBytes(selectedFile.size) }}</p>
    </div>

    <p v-if="statusLabel" class="pixel-body text-sm">{{ statusLabel }}</p>
    <p
      v-if="phase === 'compressing' && compressProgress != null"
      class="pixel-body text-xs opacity-70"
    >
      {{ Math.round(compressProgress * 100) }}%
    </p>

    <p v-if="errorMessage" class="text-sm text-[var(--pixel-score-minus)]">{{ errorMessage }}</p>

    <div class="space-y-2">
      <PixelButton
        v-if="!selectedFile"
        :disabled="busy"
        @click="openPicker"
      >
        {{ $t('play.media.chooseFile') }}
      </PixelButton>

      <template v-else>
        <PixelButton
          :disabled="busy"
          @click="retryUpload"
        >
          {{ errorMessage ? $t('play.media.retry') : $t('play.media.upload') }}
        </PixelButton>
        <PixelButton
          variant="secondary"
          :disabled="busy"
          @click="openPicker"
        >
          {{ $t('play.media.chooseDifferent') }}
        </PixelButton>
      </template>
    </div>
  </section>
</template>
