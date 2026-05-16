<script setup lang="ts">
const route = useRoute()
const editionId = computed(() => Number(route.query.edition) || 1)

const name = ref('')
const pin = ref('')
const error = ref('')
const loading = ref(false)

const { api } = useGameApi()

async function rejoin() {
  error.value = ''
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
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Find your team</h1>

    <div class="pixel-card p-4 space-y-4">
      <label class="block space-y-2">
        <span class="pixel-body text-sm">Team name</span>
        <input v-model="name" class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white" />
      </label>
      <label class="block space-y-2">
        <span class="pixel-body text-sm">PIN</span>
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          maxlength="4"
          class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white"
        />
      </label>
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton :disabled="loading" @click="rejoin">Continue</PixelButton>
    </div>

    <NuxtLink :to="`/join?edition=${editionId}`" class="pixel-body text-sm underline block text-center">
      New team
    </NuxtLink>
  </main>
</template>
