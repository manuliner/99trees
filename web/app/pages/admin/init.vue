<script setup lang="ts">
definePageMeta({ ssr: false })

const secret = ref('')
const email = ref('')
const password = ref('')
const message = ref('')
const { api } = useGameApi()

async function init() {
  message.value = ''
  try {
    await api('/api/admin/init', {
      method: 'POST',
      body: { secret: secret.value, email: email.value, password: password.value },
    })
    message.value = 'Admin created — you can sign in now.'
    await navigateTo('/admin/login')
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    message.value = err.data?.statusMessage ?? 'Init failed'
  }
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Bootstrap admin</h1>
    <div class="pixel-card p-4 space-y-4">
      <input v-model="secret" placeholder="Init secret (env)" class="pixel-input w-full p-3">
      <input v-model="email" type="email" placeholder="Admin email" class="pixel-input w-full p-3">
      <input v-model="password" type="password" placeholder="Password (min 8)" class="pixel-input w-full p-3">
      <p v-if="message" class="pixel-body text-sm">{{ message }}</p>
      <PixelButton @click="init">Initialize</PixelButton>
    </div>
  </main>
</template>
