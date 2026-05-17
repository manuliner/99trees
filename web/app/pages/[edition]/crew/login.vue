<script setup lang="ts">
definePageMeta({ layout: 'crew' })

const route = useRoute()
const { editionId, editionError, pathWithEdition, editionSlugLookupSettled } = useEditionId({
  source: 'route',
  required: true,
})

watch(
  () => ({ err: editionError.value, settled: editionSlugLookupSettled.value }),
  ({ err, settled }) => {
    if (settled && err) navigateTo('/')
  },
  { immediate: true },
)

const teamSlug = computed(() => route.query.teamSlug as string | undefined)
const teamToken = computed(() => route.query.teamT as string | undefined)
const password = ref('')
const error = ref('')
const loading = ref(false)
const { api } = useGameApi()

async function login() {
  if (editionId.value == null) return
  error.value = ''
  loading.value = true
  try {
    await api('/api/crew/login', {
      method: 'POST',
      body: { editionId: editionId.value, password: password.value },
    })
    if (teamSlug.value && teamToken.value) {
      const res = await api<{ teamId: number }>(
        `/api/crew/teams/resolve?slug=${encodeURIComponent(teamSlug.value)}&t=${encodeURIComponent(teamToken.value)}`,
        { credentials: 'include' },
      )
      await navigateTo(pathWithEdition(`/crew/teams/${res.teamId}`))
      return
    }
    const next = route.query.next as string | undefined
    await navigateTo(
      next && next.startsWith('/crew') ? pathWithEdition(next) : pathWithEdition('/crew'),
    )
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
  <main v-if="!editionError" class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Crew login</h1>
    <div class="pixel-card p-4 space-y-4">
      <input
        v-model="password"
        type="password"
        placeholder="Crew password"
        class="pixel-input w-full p-3"
      >
      <p v-if="error" class="text-sm text-[var(--pixel-score-minus)]">{{ error }}</p>
      <PixelButton :disabled="loading || editionId == null" @click="login">Sign in</PixelButton>
    </div>
  </main>
</template>
