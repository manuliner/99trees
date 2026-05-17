<script setup lang="ts">
const { editionId, editionError, pathWithEdition } = useEditionId()

watch(
  () => editionError.value,
  (err) => {
    if (err) navigateTo('/')
  },
  { immediate: true },
)

const name = ref('')
const pin = useDigitPin()
const error = ref('')
const loading = ref(false)

const { api } = useGameApi()

async function rejoin() {
  if (editionId.value == null) return
  error.value = ''
  if (pin.value.length !== 4) {
    error.value = 'PIN must be 4 digits'
    return
  }
  loading.value = true
  try {
    await api('/api/teams/rejoin', {
      method: 'POST',
      body: { editionId: editionId.value, name: name.value, pin: pin.value },
    })
    await navigateTo('/play')
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = err.data?.statusMessage ?? err.statusMessage ?? 'Could not rejoin'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main v-if="!editionError" class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Find your team</h1>

    <div class="pixel-card p-4 space-y-4">
      <label class="block space-y-2">
        <span class="pixel-body text-sm">Team name</span>
        <input v-model="name" class="pixel-input w-full p-3" />
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">PIN</span>
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
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton :disabled="loading || editionId == null" @click="rejoin">Continue</PixelButton>
    </div>

    <NuxtLink :to="pathWithEdition('/join')" class="pixel-body text-sm underline block text-center">
      New team
    </NuxtLink>
  </main>
</template>
