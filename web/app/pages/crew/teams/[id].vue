<script setup lang="ts">
const route = useRoute()
const teamId = Number(route.params.id)
const { api } = useGameApi()
const loading = ref(false)
const tempPin = ref<string | null>(null)

const { data, refresh, error } = await useFetch(`/api/crew/teams/${teamId}`, { credentials: 'include' })

const performanceText = computed(() => {
  const payload = (data.value?.currentTurn as { taskPayload?: { text?: string } } | null)?.taskPayload
  return payload?.text ?? ''
})

watch(error, (e) => {
  if (e?.statusCode === 401) navigateTo('/crew/login')
})

async function rate(rating: 'ok' | 'bonus') {
  if (!data.value?.currentTurn) return
  loading.value = true
  try {
    await api('/api/crew/rate', {
      method: 'POST',
      body: { teamId, turnId: data.value.currentTurn.id, rating },
    })
    await refresh()
  }
  finally {
    loading.value = false
  }
}

async function resetPin() {
  if (!confirm('Reset PIN for this team?')) return
  loading.value = true
  try {
    const res = await api<{ tempPin: string }>(`/api/crew/teams/${teamId}/reset-pin`, { method: 'POST' })
    tempPin.value = res.tempPin
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <NuxtLink to="/crew" class="pixel-body text-sm underline">← Crew</NuxtLink>
    <h1 class="pixel-title text-base">{{ data?.team.name }}</h1>
    <p class="pixel-body text-sm">Field {{ data?.team.positionConfirmed }}</p>

    <section v-if="data?.currentTurn?.state === 'awaiting_crew'" class="pixel-card p-4 space-y-4">
      <p class="pixel-title text-xs">Performance — field {{ data.currentTurn.fieldNumber }}</p>
      <p class="pixel-body text-sm">{{ performanceText }}</p>
      <PixelButton :disabled="loading" @click="rate('ok')">Done</PixelButton>
      <PixelButton variant="secondary" :disabled="loading" @click="rate('bonus')">Especially good (+25)</PixelButton>
    </section>
    <p v-else class="pixel-body text-sm opacity-80">This team is not waiting for a crew rating.</p>

    <PixelButton variant="danger" :disabled="loading" @click="resetPin">Reset team PIN</PixelButton>
    <p v-if="tempPin" class="pixel-title text-lg text-center">Temp PIN: {{ tempPin }}</p>
  </main>
</template>
