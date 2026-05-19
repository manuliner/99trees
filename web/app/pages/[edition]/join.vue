<script setup lang="ts">
import {
  canRegisterEdition,
  editionStatusMessage,
  trimTeamName,
  validateTeamName,
  TEAM_NAME_MAX,
  TEAM_NAME_MIN,
} from '~/utils/team-form'
import { mapApiError } from '~/utils/api-errors'

definePageMeta({ layout: 'player' })

const { t } = useI18n()

const {
  editionId,
  editionError,
  editionPublic,
  editionPublicPending,
  editionSlugLookupSettled,
  pathWithEdition,
} = useEditionId()

watch(
  () => ({ err: editionError.value, settled: editionSlugLookupSettled.value }),
  ({ err, settled }) => {
    if (settled && err) navigateTo('/')
  },
  { immediate: true },
)

const name = ref('')
const pin = useDigitPin()
const pinConfirm = useDigitPin()
const error = ref('')
const loading = ref(false)

const { api } = useGameApi()

const { data: existingSession } = await useFetch('/api/me', { credentials: 'include' })

const { sessionMismatch, sessionGateReady } = useJoinSessionGate({
  editionId,
  editionSlugLookupSettled,
  existingSession,
})

const rulesTo = computed(() => pathWithEdition('/rules'))

const editionLoading = computed(
  () => !editionSlugLookupSettled.value || editionPublicPending.value,
)

const canCreateTeam = computed(
  () =>
    sessionGateReady.value
    && !sessionMismatch.value
    && canRegisterEdition(editionPublic.value?.status),
)

const editionBlockedKey = computed(() =>
  editionPublic.value ? editionStatusMessage(editionPublic.value.status) : null,
)

const editionBlockedMessage = computed(() => {
  const key = editionBlockedKey.value
  if (!key) return null
  if (key === 'editionStatus.unknown') {
    return t(key, { status: editionPublic.value?.status ?? '' })
  }
  return t(key)
})

const showPage = computed(
  () => editionSlugLookupSettled.value && !editionError.value,
)

async function createTeam() {
  if (editionId.value == null || !canCreateTeam.value) return
  error.value = ''
  const nameErrorKey = validateTeamName(name.value)
  if (nameErrorKey) {
    error.value = t(nameErrorKey, { min: TEAM_NAME_MIN, max: TEAM_NAME_MAX })
    return
  }
  if (pin.value.length !== 4) {
    error.value = t('join.errors.pinLength')
    return
  }
  if (pin.value !== pinConfirm.value) {
    error.value = t('join.errors.pinMismatch')
    return
  }
  loading.value = true
  try {
    await api('/api/teams', {
      method: 'POST',
      body: {
        editionId: editionId.value,
        name: trimTeamName(name.value),
        pin: pin.value,
      },
    })
    await navigateTo(pathWithEdition('/onboarding'))
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = mapApiError(
      err.data?.statusMessage ?? err.statusMessage,
      'join.errors.createFailed',
      t,
    )
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main v-if="showPage" class="join-page-main p-4 max-w-md mx-auto space-y-4">
    <PixelJoinHero
      variant="join"
      :edition-name="editionPublic?.name ?? null"
      :join-description="editionPublic?.joinDescription ?? null"
      :join-logo-url="editionPublic?.joinLogoUrl ?? null"
      :loading="editionLoading"
    />

    <p v-if="editionLoading" class="pixel-body text-center text-sm opacity-70">
      {{ $t('common.loadingEvent') }}
    </p>

    <p
      v-else-if="sessionMismatch"
      class="pixel-card p-4 pixel-body text-sm text-center text-[var(--pixel-score-minus)]"
    >
      {{ $t('join.sessionMismatchBefore') }}
      <NuxtLink :to="pathWithEdition('/rejoin')" class="underline">{{ $t('join.sessionMismatchRejoin') }}</NuxtLink>
      {{ $t('join.sessionMismatchMiddle') }}
      <NuxtLink to="/play" class="underline">{{ $t('join.sessionMismatchBoard') }}</NuxtLink>.
    </p>

    <p
      v-else-if="editionBlockedMessage"
      class="pixel-card p-4 pixel-body text-sm text-center text-[var(--pixel-score-minus)]"
    >
      {{ editionBlockedMessage }}
    </p>

    <form
      v-else-if="canCreateTeam"
      class="pixel-card p-4 space-y-4"
      @submit.prevent="createTeam"
    >
      <h2 class="pixel-title text-sm">
        {{ $t('join.createTeamHeading') }}
      </h2>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">{{ $t('join.teamName') }}</span>
        <input
          v-model="name"
          class="pixel-input w-full p-3"
          :placeholder="$t('join.teamNamePlaceholder')"
          autocomplete="organization"
          :maxlength="TEAM_NAME_MAX"
          required
        >
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">{{ $t('join.pin4') }}</span>
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="new-password"
          maxlength="4"
          class="pixel-input w-full p-3"
          required
        >
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">{{ $t('join.confirmPin') }}</span>
        <input
          v-model="pinConfirm"
          type="password"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="new-password"
          maxlength="4"
          class="pixel-input w-full p-3"
          required
        >
      </label>
      <p
        v-if="error"
        role="alert"
        class="text-sm text-[var(--pixel-score-minus)]"
      >
        {{ error }}
      </p>
      <PixelButton
        type="submit"
        :disabled="loading"
        :aria-busy="loading"
      >
        {{ loading ? $t('join.creatingTeam') : $t('join.startGame') }}
      </PixelButton>
    </form>

    <nav v-if="sessionGateReady && !sessionMismatch" class="join-page-nav" :aria-label="$t('join.navAria')">
      <p
        v-if="editionId != null && canCreateTeam"
        class="pixel-title join-page-nav__primary"
      >
        {{ $t('join.rejoinPromptBefore') }}<NuxtLink
          :to="pathWithEdition('/rejoin')"
          class="join-page-nav__link"
        >{{ $t('join.rejoinPromptLink') }}</NuxtLink>.
      </p>
      <div class="join-page-nav__secondary">
        <NuxtLink :to="rulesTo" class="pixel-body underline">{{ $t('common.rules') }}</NuxtLink>
      </div>
    </nav>
  </main>
</template>
