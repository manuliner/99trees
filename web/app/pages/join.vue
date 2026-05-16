<script setup lang="ts">
const route = useRoute()
const editionId = computed(() => Number(route.query.edition) || 1)

const name = ref('')
const pin = ref('')
const pinConfirm = ref('')
const error = ref('')
const loading = ref(false)

const { api } = useGameApi()

const { data: editionPublic } = await useFetch(
  () => `/api/editions/${editionId.value}/public`,
)

const { data: existingSession } = await useFetch('/api/me', { credentials: 'include' })
if (existingSession.value?.team) {
  await navigateTo('/play')
}

async function createTeam() {
  error.value = ''
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
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">ZUGVÖGEL</h1>
    <p class="pixel-body text-center text-sm opacity-80">Start your migration</p>
    <p
      v-if="editionPublic && editionPublic.status !== 'live'"
      class="pixel-body text-center text-sm text-[var(--pixel-score-minus)]"
    >
      The game has not started yet ({{ editionPublic.status }}).
    </p>

    <div class="pixel-card p-4 space-y-4">
      <label class="block space-y-2">
        <span class="pixel-body text-sm">Team name</span>
        <input v-model="name" class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white" />
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">4-digit PIN</span>
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          maxlength="4"
          class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white"
        />
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">Confirm PIN</span>
        <input
          v-model="pinConfirm"
          type="password"
          inputmode="numeric"
          maxlength="4"
          class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white"
        />
      </label>
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton :disabled="loading" @click="createTeam">Start migration</PixelButton>
    </div>

    <NuxtLink :to="`/rejoin?edition=${editionId}`" class="pixel-body text-sm underline block text-center">
      Find your team
    </NuxtLink>
    <NuxtLink to="/rules" class="pixel-body text-sm underline block text-center">Rules</NuxtLink>
    <NuxtLink to="/privacy" class="pixel-body text-sm underline block text-center">Privacy</NuxtLink>
  </main>
</template>
