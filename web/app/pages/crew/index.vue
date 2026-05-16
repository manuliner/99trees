<script setup lang="ts">
const route = useRoute()
const editionId = computed(() => Number(route.query.edition) || 1)
const { api } = useGameApi()
const search = ref('')
const results = ref<{ id: number; name: string }[]>([])
const pending = ref<{ turnId: number; teamId: number; teamName: string; fieldNumber: number | null }[]>([])
const showTeamScanner = ref(false)
const scanError = ref('')

async function loadPending() {
  try {
    const res = await api<{ pending: typeof pending.value }>('/api/crew/pending', { credentials: 'include' })
    pending.value = res.pending
  }
  catch {
    await navigateTo(`/crew/login?edition=${editionId.value}`)
  }
}

onMounted(loadPending)

watch(search, async (q) => {
  if (q.length < 2) {
    results.value = []
    return
  }
  const res = await api<{ teams: typeof results.value }>(
    `/api/crew/teams/search?q=${encodeURIComponent(q)}`,
    { credentials: 'include' },
  )
  results.value = res.teams
})

async function onTeamQrScanned(payload: { slug: string; token: string }) {
  showTeamScanner.value = false
  scanError.value = ''
  try {
    const res = await api<{ teamId: number }>(
      `/api/crew/teams/resolve?slug=${encodeURIComponent(payload.slug)}&t=${encodeURIComponent(payload.token)}`,
      { credentials: 'include' },
    )
    await navigateTo(`/crew/teams/${res.teamId}`)
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    scanError.value = err.data?.statusMessage ?? 'Invalid team QR'
  }
}

async function logout() {
  await api('/api/crew/logout', { method: 'POST', credentials: 'include' })
  await navigateTo(`/crew/login?edition=${editionId.value}`)
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Crew</h1>

    <PixelButton variant="secondary" @click="showTeamScanner = true">Scan Team QR</PixelButton>
    <p v-if="scanError" class="text-sm text-[var(--pixel-score-minus)] text-center">{{ scanError }}</p>

    <section v-if="pending.length" class="pixel-card p-4 space-y-2">
      <p class="pixel-title text-xs">Waiting for rating</p>
      <NuxtLink
        v-for="p in pending"
        :key="p.turnId"
        :to="`/crew/teams/${p.teamId}`"
        class="block pixel-body text-sm underline"
      >
        {{ p.teamName }} — field {{ p.fieldNumber ?? '?' }}
      </NuxtLink>
    </section>

    <div class="pixel-card p-4 space-y-3">
      <p class="pixel-title text-xs">Find team</p>
      <input
        v-model="search"
        placeholder="Team name…"
        class="w-full p-3 border-4 border-[var(--pixel-forest-dark)] bg-white"
      >
      <NuxtLink
        v-for="t in results"
        :key="t.id"
        :to="`/crew/teams/${t.id}`"
        class="block pixel-body text-sm py-2 border-t border-[var(--pixel-forest-dark)]/20"
      >
        {{ t.name }}
      </NuxtLink>
    </div>

    <PixelButton variant="secondary" @click="logout">Log out</PixelButton>

    <StationQrScanner
      v-if="showTeamScanner"
      mode="team"
      @scanned="onTeamQrScanned"
      @close="showTeamScanner = false"
    />
  </main>
</template>
