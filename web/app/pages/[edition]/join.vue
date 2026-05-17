<script setup lang="ts">
const { editionId, editionError, editionPublic, pathWithEdition } = useEditionId()

watch(
  () => editionError.value,
  (err) => {
    if (err) navigateTo('/')
  },
  { immediate: true },
)

const name = ref('')
const pin = useDigitPin()
const pinConfirm = useDigitPin()
const error = ref('')
const loading = ref(false)
const sessionMismatch = ref(false)

const { api } = useGameApi()

const { data: existingSession } = await useFetch('/api/me', { credentials: 'include' })

if (existingSession.value?.team && editionId.value != null) {
  if (existingSession.value.team.editionId === editionId.value) {
    await navigateTo('/play')
  }
  else {
    sessionMismatch.value = true
  }
}

const rulesTo = computed(() => pathWithEdition('/rules'))
const privacyTo = computed(() => pathWithEdition('/privacy'))

async function createTeam() {
  if (editionId.value == null) return
  error.value = ''
  if (pin.value.length !== 4) {
    error.value = 'PIN must be 4 digits'
    return
  }
  if (pin.value !== pinConfirm.value) {
    error.value = 'PINs do not match'
    return
  }
  loading.value = true
  try {
    await api('/api/teams', {
      method: 'POST',
      body: { editionId: editionId.value, name: name.value, pin: pin.value },
    })
    await navigateTo('/play')
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = err.data?.statusMessage ?? err.statusMessage ?? 'Could not create team'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main v-if="!editionError" class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">ZUGVÖGEL</h1>
    <p class="pixel-body text-center text-sm opacity-80">Ready to play?</p>

    <p
      v-if="sessionMismatch"
      class="pixel-card p-4 pixel-body text-sm text-center text-[var(--pixel-score-minus)]"
    >
      You are signed in to a different event. Use
      <NuxtLink :to="pathWithEdition('/rejoin')" class="underline">Find your team</NuxtLink>
      for this festival, or continue your current game on
      <NuxtLink to="/play" class="underline">the board</NuxtLink>.
    </p>

    <p
      v-else-if="editionPublic && editionPublic.status !== 'live'"
      class="pixel-body text-center text-sm text-[var(--pixel-score-minus)]"
    >
      The game has not started yet ({{ editionPublic.status }}).
    </p>

    <div v-if="!sessionMismatch" class="pixel-card p-4 space-y-4">
      <label class="block space-y-2">
        <span class="pixel-body text-sm">Team name</span>
        <input v-model="name" class="pixel-input w-full p-3" />
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">4-digit PIN</span>
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
          maxlength="4"
          class="pixel-input w-full p-3"
        />
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">Confirm PIN</span>
        <input
          v-model="pinConfirm"
          type="password"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
          maxlength="4"
          class="pixel-input w-full p-3"
        />
      </label>
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton :disabled="loading || editionId == null" @click="createTeam">Start game</PixelButton>
    </div>

    <NuxtLink
      v-if="editionId != null && !sessionMismatch"
      :to="pathWithEdition('/rejoin')"
      class="pixel-body text-sm underline block text-center"
    >
      Find your team
    </NuxtLink>
    <NuxtLink :to="rulesTo" class="pixel-body text-sm underline block text-center">Rules</NuxtLink>
    <NuxtLink :to="privacyTo" class="pixel-body text-sm underline block text-center">Privacy</NuxtLink>
  </main>
</template>
