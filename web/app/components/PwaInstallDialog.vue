<script setup lang="ts">
import type { PwaInstallRole } from '~/composables/usePwaInstall'

const props = defineProps<{
  open: boolean
  role: PwaInstallRole
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { isStandalone, isIos, canPromptInstall, markDismissed, promptInstall } = usePwaInstall(props.role)

const useI18nCopy = computed(() => props.role === 'player')

const title = computed(() =>
  useI18nCopy.value ? t('pwa.title') : 'Install Zugvögel',
)

const body = computed(() =>
  useI18nCopy.value
    ? t('pwa.body')
    : 'Add to your home screen for faster access at the festival.',
)

const alreadyInstalledText = computed(() =>
  useI18nCopy.value ? t('pwa.alreadyInstalled') : 'You\'re already using the installed app.',
)

const iosTitle = computed(() =>
  useI18nCopy.value ? t('pwa.iosTitle') : 'Add to Home Screen',
)

const iosSteps = computed(() =>
  useI18nCopy.value
    ? [t('pwa.iosStep1'), t('pwa.iosStep2')]
    : ['Tap Share (bottom of the screen)', 'Choose “Add to Home Screen”'],
)

const androidHint = computed(() =>
  useI18nCopy.value
    ? t('pwa.androidHint')
    : 'Open the browser menu and choose “Install app” or “Add to home screen”.',
)

const installLabel = computed(() =>
  useI18nCopy.value ? t('pwa.install') : 'Install',
)

const notNowLabel = computed(() =>
  useI18nCopy.value ? t('pwa.notNow') : 'Not now',
)

const showIosSteps = computed(() => isIos.value && !isStandalone.value)
const showAndroidHint = computed(
  () => !isStandalone.value && !isIos.value && !canPromptInstall.value,
)
const showInstallButton = computed(() => canPromptInstall.value && !isStandalone.value)

function close(mark: boolean) {
  if (mark) markDismissed()
  emit('close')
}

async function onInstall() {
  await promptInstall()
  close(true)
}

function onNotNow() {
  close(true)
}

function onDialogClose() {
  close(true)
}
</script>

<template>
  <PixelDialog :open="open" :title="title" @close="onDialogClose">
    <div class="space-y-3">
      <p v-if="isStandalone" class="pixel-body text-sm">
        {{ alreadyInstalledText }}
      </p>
      <template v-else>
        <p class="pixel-body text-sm">{{ body }}</p>
        <div v-if="showIosSteps" class="space-y-2">
          <p class="pixel-title text-xs">{{ iosTitle }}</p>
          <ol class="pixel-body text-sm list-decimal list-inside space-y-1">
            <li v-for="(step, i) in iosSteps" :key="i">{{ step }}</li>
          </ol>
        </div>
        <p v-else-if="showAndroidHint" class="pixel-body text-sm">
          {{ androidHint }}
        </p>
      </template>
    </div>
    <div v-if="!isStandalone" class="flex gap-2 pt-2">
      <PixelButton
        v-if="showInstallButton"
        class="flex-1"
        @click="onInstall"
      >
        {{ installLabel }}
      </PixelButton>
      <PixelButton
        variant="secondary"
        :class="showInstallButton ? 'flex-1' : 'w-full'"
        @click="onNotNow"
      >
        {{ notNowLabel }}
      </PixelButton>
    </div>
    <div v-else class="pt-2">
      <PixelButton variant="secondary" class="w-full" @click="onNotNow">
        {{ notNowLabel }}
      </PixelButton>
    </div>
  </PixelDialog>
</template>
