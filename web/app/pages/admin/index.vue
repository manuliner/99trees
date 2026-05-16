<script setup lang="ts">
const { api } = useGameApi()
const editions = ref<{ id: number; name: string; status: string; fieldCount: number; mapImageUrl: string | null }[]>([])
const checklist = ref<{ ok: boolean; issues: string[] } | null>(null)
const selectedId = ref(1)
const crewPassword = ref('crew1234')
const importJson = ref('')
const newEditionName = ref('')
const mapFile = ref<File | null>(null)
const mapUploadMessage = ref('')
const error = ref('')

const selectedEdition = computed(() => editions.value.find((e) => e.id === selectedId.value))

async function load() {
  try {
    const res = await api<{ editions: typeof editions.value }>('/api/admin/editions', { credentials: 'include' })
    editions.value = res.editions
    if (res.editions[0] && !res.editions.some((e) => e.id === selectedId.value)) {
      selectedId.value = res.editions[0].id
    }
  }
  catch {
    await navigateTo('/admin/login')
  }
}

onMounted(load)

async function runChecklist() {
  checklist.value = await api(`/api/admin/editions/${selectedId.value}/checklist`, { credentials: 'include' })
}

async function createEdition() {
  error.value = ''
  try {
    const res = await api<{ edition: { id: number } }>('/api/admin/editions', {
      method: 'POST',
      body: { name: newEditionName.value },
      credentials: 'include',
    })
    newEditionName.value = ''
    selectedId.value = res.edition.id
    await load()
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Create failed'
  }
}

async function setStatus(status: 'live' | 'paused' | 'ended') {
  error.value = ''
  try {
    await api(`/api/admin/editions/${selectedId.value}`, {
      method: 'PATCH',
      body: { status, crewPassword: status === 'live' ? crewPassword.value : undefined },
      credentials: 'include',
    })
    await load()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err.data?.statusMessage ?? 'Update failed'
  }
}

function exportQr() {
  window.open(`/api/admin/editions/${selectedId.value}/qr/export`, '_blank')
}

const joinQrUrl = computed(() => {
  if (!import.meta.client) return ''
  return `${window.location.origin}/join?edition=${selectedId.value}`
})

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
    await load()
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Import failed'
  }
}

function onMapFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  mapFile.value = input.files?.[0] ?? null
  mapUploadMessage.value = ''
}

async function uploadMap() {
  if (!mapFile.value) {
    mapUploadMessage.value = 'Choose a PNG, JPEG, or WebP file first'
    return
  }
  error.value = ''
  mapUploadMessage.value = ''
  try {
    const form = new FormData()
    form.append('map', mapFile.value)
    const res = await api<{ mapImagePath: string }>(`/api/admin/editions/${selectedId.value}/map`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    mapUploadMessage.value = `Map saved: ${res.mapImagePath}`
    mapFile.value = null
    await load()
    await runChecklist()
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err.data?.statusMessage ?? 'Map upload failed'
  }
}
</script>

<template>
  <main class="p-4 max-w-lg mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Admin</h1>

    <div class="pixel-card p-4 space-y-3">
      <p class="pixel-title text-xs">Create edition</p>
      <input v-model="newEditionName" placeholder="Edition name" class="w-full p-2 border-4 border-[var(--pixel-forest-dark)]">
      <PixelButton variant="secondary" @click="createEdition">Create draft</PixelButton>
    </div>

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
      <div class="flex flex-wrap gap-2">
        <PixelButton @click="setStatus('live')">Set LIVE</PixelButton>
        <PixelButton variant="secondary" @click="setStatus('paused')">Pause</PixelButton>
        <PixelButton variant="danger" @click="setStatus('ended')">End</PixelButton>
      </div>
    </div>

    <div class="pixel-card p-4 space-y-3">
      <p class="pixel-title text-xs">Entry QR</p>
      <p class="pixel-body text-xs break-all">{{ joinQrUrl }}</p>
    </div>

    <div class="pixel-card p-4 space-y-3">
      <p class="pixel-title text-xs">Station QR export</p>
      <PixelButton variant="secondary" @click="exportQr">Download QR HTML</PixelButton>
    </div>

    <div class="pixel-card p-4 space-y-3">
      <p class="pixel-title text-xs">Festival map</p>
      <p v-if="selectedEdition?.mapImageUrl" class="pixel-body text-xs break-all opacity-80">
        Current: {{ selectedEdition.mapImageUrl }}
      </p>
      <img
        v-if="selectedEdition?.mapImageUrl"
        :src="selectedEdition.mapImageUrl"
        alt="Edition map preview"
        class="w-full border-4 border-[var(--pixel-forest-dark)]"
        style="image-rendering: pixelated"
      >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="w-full text-sm"
        @change="onMapFileChange"
      >
      <p v-if="mapUploadMessage" class="pixel-body text-xs text-[var(--pixel-score-plus)]">{{ mapUploadMessage }}</p>
      <PixelButton variant="secondary" @click="uploadMap">Upload map</PixelButton>
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