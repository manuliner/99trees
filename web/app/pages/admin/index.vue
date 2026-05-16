<script setup lang="ts">
const { api } = useGameApi()
const editions = ref<{ id: number; name: string; status: string; fieldCount: number }[]>([])
const checklist = ref<{ ok: boolean; issues: string[] } | null>(null)
const selectedId = ref(1)
const crewPassword = ref('crew1234')
const importJson = ref('')
const error = ref('')

async function load() {
  try {
    const res = await api<{ editions: typeof editions.value }>('/api/admin/editions', { credentials: 'include' })
    editions.value = res.editions
    if (res.editions[0]) selectedId.value = res.editions[0].id
  }
  catch {
    await navigateTo('/admin/login')
  }
}

onMounted(load)

async function runChecklist() {
  checklist.value = await api(`/api/admin/editions/${selectedId.value}/checklist`, { credentials: 'include' })
}

async function setLive() {
  await api(`/api/admin/editions/${selectedId.value}`, {
    method: 'PATCH',
    body: { status: 'live', crewPassword: crewPassword.value },
    credentials: 'include',
  })
  await load()
}

async function importStations() {
  error.value = ''
  try {
    const parsed = JSON.parse(importJson.value)
    await api(`/api/admin/editions/${selectedId.value}/stations/import`, {
      method: 'POST',
      body: parsed,
      credentials: 'include',
    })
    await runChecklist()
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Import failed'
  }
}
</script>

<template>
  <main class="p-4 max-w-lg mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Admin</h1>

    <div class="pixel-card p-4 space-y-3">
      <label class="pixel-body text-sm block">Edition</label>
      <select v-model="selectedId" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)]">
        <option v-for="e in editions" :key="e.id" :value="e.id">{{ e.name }} ({{ e.status }})</option>
      </select>
      <PixelButton variant="secondary" @click="runChecklist">Run checklist</PixelButton>
      <ul v-if="checklist" class="pixel-body text-sm list-disc pl-5">
        <li v-if="checklist.ok">Ready for live</li>
        <li v-for="issue in checklist.issues" :key="issue" class="text-[var(--pixel-score-minus)]">{{ issue }}</li>
      </ul>
      <input v-model="crewPassword" placeholder="Crew password" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)]">
      <PixelButton @click="setLive">Set edition LIVE</PixelButton>
    </div>

    <div class="pixel-card p-4 space-y-3">
      <p class="pixel-title text-xs">Import stations (JSON)</p>
      <textarea v-model="importJson" rows="8" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)] font-mono text-xs" />
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton variant="secondary" @click="importStations">Import</PixelButton>
    </div>

    <NuxtLink to="/admin/login" class="pixel-body text-sm underline block text-center">Login</NuxtLink>
  </main>
</template>
