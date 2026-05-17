<script setup lang="ts">
definePageMeta({ ssr: false })

const email = ref('')
const password = ref('')
const error = ref('')
const { api } = useGameApi()

async function login() {
  error.value = ''
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
      credentials: 'include',
    })
    await navigateTo('/admin')
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string, message?: string }, statusCode?: number }
    if (err.statusCode === 401) {
      error.value = 'Invalid email or password.'
    }
    else {
      error.value = err.data?.statusMessage ?? err.data?.message ?? 'Login failed'
    }
  }
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Admin login</h1>
    <div class="pixel-card p-4 space-y-4">
      <input v-model="email" type="email" placeholder="Email" class="pixel-input w-full p-3">
      <input v-model="password" type="password" placeholder="Password" class="pixel-input w-full p-3">
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton @click="login">Sign in</PixelButton>
      <NuxtLink to="/admin/init" class="pixel-body text-sm underline block text-center">First-time setup</NuxtLink>
    </div>
  </main>
</template>
