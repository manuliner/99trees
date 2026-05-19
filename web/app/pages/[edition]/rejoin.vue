<script setup lang="ts">
import {
  trimTeamName,
  validateTeamName,
  TEAM_NAME_MAX,
  TEAM_NAME_MIN,
} from '~/utils/team-form'
import { mapApiError } from '~/utils/api-errors'
import { playPathForTeam, type MePayload } from '~/composables/useOnboardingRedirect'

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
const error = ref('')
const loading = ref(false)

const { api } = useGameApi()

const { data: existingSession } = await useFetch('/api/me', { credentials: 'include' })

const { sessionGateReady } = useJoinSessionGate({
  editionId,
  editionSlugLookupSettled,
  existingSession,
})

const editionLoading = computed(
  () => !editionSlugLookupSettled.value || editionPublicPending.value,
)

const showPage = computed(
  () => editionSlugLookupSettled.value && !editionError.value,
)

const showForm = computed(() => sessionGateReady.value && !editionLoading.value)

async function rejoin() {
  if (editionId.value == null) return
  error.value = ''
  const nameErrorKey = validateTeamName(name.value)
  if (nameErrorKey) {
    error.value = t(nameErrorKey, { min: TEAM_NAME_MIN, max: TEAM_NAME_MAX })
    return
  }
  if (pin.value.length !== 4) {
    error.value = t('rejoin.errors.pinLength')
    return
  }
  loading.value = true
  try {
    const payload = await api<MePayload>('/api/teams/rejoin', {
      method: 'POST',
      body: {
        editionId: editionId.value,
        name: trimTeamName(name.value),
        pin: pin.value,
      },
    })
    await navigateTo(playPathForTeam(payload))
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = mapApiError(
      err.data?.statusMessage ?? err.statusMessage,
      'rejoin.errors.rejoinFailed',
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
      variant="rejoin"
      :edition-name="editionPublic?.name ?? null"
      :join-description="editionPublic?.joinDescription ?? null"
      :join-logo-url="editionPublic?.joinLogoUrl ?? null"
      :loading="editionLoading"
    />

    <p v-if="editionLoading" class="pixel-body text-center text-sm opacity-70">
      {{ $t('common.loadingEvent') }}
    </p>

    <form
      v-else-if="showForm"
      class="pixel-card p-4 space-y-4"
      @submit.prevent="rejoin"
    >
      <h2 class="pixel-title text-sm">
        {{ $t('rejoin.signInHeading') }}
      </h2>
      <PixelTeamDirectoryPicker
        v-if="editionId != null"
        v-model="name"
        :edition-id="editionId"
      />
      <label class="block space-y-2">
        <span class="pixel-body text-sm">{{ $t('rejoin.pin') }}</span>
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
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
        {{ loading ? $t('rejoin.signingIn') : $t('rejoin.continue') }}
      </PixelButton>
    </form>

    <nav v-if="showForm" class="join-page-nav" :aria-label="$t('rejoin.navAria')">
      <p class="pixel-title join-page-nav__primary">
        {{ $t('rejoin.newTeamPromptBefore') }}<NuxtLink
          :to="pathWithEdition('/join')"
          class="join-page-nav__link"
        >{{ $t('rejoin.newTeamPromptLink') }}</NuxtLink>.
      </p>
    </nav>
  </main>
</template>
