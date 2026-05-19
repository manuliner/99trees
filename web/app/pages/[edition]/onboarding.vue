<script setup lang="ts">
import type { TeamAvatarId } from '#shared/team-avatars'
import { isTeamAvatarId } from '#shared/team-avatars'
import { mapApiError } from '~/utils/api-errors'
import { playPathForTeam, type MePayload } from '~/composables/useOnboardingRedirect'

definePageMeta({ layout: 'player', ssr: false })

const { t } = useI18n()
const { editionError, editionSlugLookupSettled, pathWithEdition } = useEditionId()
const { api } = useGameApi()

watch(
  () => editionError.value,
  (err) => {
    if (err) navigateTo('/')
  },
  { immediate: true },
)

const { data: me, refresh: refreshMe, error: meError } = await useFetch('/api/me', {
  credentials: 'include',
  server: false,
})

watchEffect(() => {
  if (
    meError.value
    && 'statusCode' in meError.value
    && (meError.value as { statusCode: number }).statusCode === 401
  ) {
    navigateTo(pathWithEdition('/join'))
  }
})

watchEffect(() => {
  if (me.value?.team?.onboardingComplete) {
    navigateTo('/play')
  }
})

const step = ref<1 | 2>(1)
const selectedAvatar = ref<TeamAvatarId | null>(null)
const motto = ref('')
const rulesAccepted = ref(false)
const error = ref('')
const loading = ref(false)

watch(
  () => me.value?.team?.avatarId,
  (id) => {
    if (id && isTeamAvatarId(id)) {
      selectedAvatar.value = id
      if (step.value === 1 && me.value?.team && !me.value.team.onboardingComplete) {
        step.value = 2
      }
    }
  },
  { immediate: true },
)

const showPage = computed(
  () => editionSlugLookupSettled.value && !editionError.value,
)

async function saveAvatar() {
  if (!selectedAvatar.value) {
    error.value = t('onboarding.errors.avatarRequired')
    return
  }
  error.value = ''
  loading.value = true
  try {
    await api('/api/teams/onboarding', {
      method: 'PATCH',
      body: { avatarId: selectedAvatar.value },
    })
    await refreshMe()
    step.value = 2
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = mapApiError(
      err.data?.statusMessage ?? err.statusMessage,
      'onboarding.errors.saveFailed',
      t,
    )
  }
  finally {
    loading.value = false
  }
}

async function completeOnboarding() {
  error.value = ''
  const trimmed = motto.value.trim()
  if (trimmed.length < 3) {
    error.value = t('onboarding.errors.mottoTooShort')
    return
  }
  if (!rulesAccepted.value) {
    error.value = t('onboarding.errors.rulesRequired')
    return
  }
  loading.value = true
  try {
    const payload = await api<MePayload>('/api/teams/onboarding', {
      method: 'PATCH',
      body: { motto: trimmed, rulesAccepted: true as const },
    })
    await refreshMe()
    await navigateTo(playPathForTeam(payload))
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = mapApiError(
      err.data?.statusMessage ?? err.statusMessage,
      'onboarding.errors.saveFailed',
      t,
    )
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main v-if="showPage" class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-base text-center">
      {{ $t('onboarding.title') }}
    </h1>

    <p class="pixel-body text-sm text-center opacity-80">
      {{ step === 1 ? $t('onboarding.stepAvatar') : $t('onboarding.stepProfile') }}
    </p>

    <section v-if="step === 1" class="pixel-card p-4 space-y-4">
      <PixelTeamAvatarPicker v-model="selectedAvatar" />
      <p
        v-if="error"
        role="alert"
        class="text-sm text-[var(--pixel-score-minus)]"
      >
        {{ error }}
      </p>
      <PixelButton
        type="button"
        :disabled="loading"
        :aria-busy="loading"
        @click="saveAvatar"
      >
        {{ loading ? $t('common.loadingEvent') : $t('common.continue') }}
      </PixelButton>
    </section>

    <section v-else class="pixel-card p-4 space-y-4">
      <div v-if="selectedAvatar" class="flex justify-center">
        <PixelTeamAvatarBadge :avatar-id="selectedAvatar" size="md" />
      </div>

      <label class="block space-y-2">
        <span class="pixel-body text-sm">{{ $t('onboarding.motto') }}</span>
        <input
          v-model="motto"
          class="pixel-input w-full p-3"
          :placeholder="$t('onboarding.mottoPlaceholder')"
          maxlength="80"
          autocomplete="off"
          required
        >
      </label>

      <div class="space-y-3">
        <h2 class="pixel-title text-xs">{{ $t('rules.title') }}</h2>
        <GameRulesContent />
      </div>

      <label class="flex items-start gap-2 cursor-pointer">
        <input
          v-model="rulesAccepted"
          type="checkbox"
          class="mt-1"
        >
        <span class="pixel-body text-sm">{{ $t('onboarding.rulesConfirm') }}</span>
      </label>

      <p
        v-if="error"
        role="alert"
        class="text-sm text-[var(--pixel-score-minus)]"
      >
        {{ error }}
      </p>

      <div class="flex flex-col gap-2">
        <PixelButton
          type="button"
          variant="secondary"
          :disabled="loading"
          @click="step = 1"
        >
          {{ $t('common.back') }}
        </PixelButton>
        <PixelButton
          type="button"
          :disabled="loading"
          :aria-busy="loading"
          @click="completeOnboarding"
        >
          {{ loading ? $t('onboarding.saving') : $t('onboarding.startGame') }}
        </PixelButton>
      </div>
    </section>

    <NuxtLink
      :to="pathWithEdition('/rules')"
      class="pixel-body text-sm underline block text-center"
    >
      {{ $t('common.rules') }}
    </NuxtLink>
  </main>
</template>
