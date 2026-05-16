<script setup lang="ts">
const route = useRoute()
const editionId = computed(() => Number(route.query.edition) || 1)
const password = ref('')
const error = ref('')
const loading = ref(false)
const { api } = useGameApi()

async function login() {
  error.value = ''
  loading.value = true
  try {
    await api('/api/crew/login', {
      method: 'POST',
      body: { editionId: editionId.value, password: password.value },
    })
    await navigateTo('/crew')
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err.data?.statusMessage ?? 'Login failed'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Crew login</h1>
    <div class="pixel-card p-4 space-y-4">
      <input
        v-model="password"
        type="password"
        placeholder="Crew password"
        class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white"
      >
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton :disabled="loading" @click="login">Sign in</PixelButton>
    </div>
  </main>
</template>
