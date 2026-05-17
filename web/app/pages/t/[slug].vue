<script setup lang="ts">
import { editionPath } from '#shared/edition-urls'

const route = useRoute()
const slug = route.params.slug as string
const token = route.query.t as string

const crewLoginTo = ref<string | null>(null)

if (slug && token) {
  try {
    const res = await $fetch<{ editionId: number; editionSlug: string }>(
      `/api/public/team-qr?slug=${encodeURIComponent(slug)}&t=${encodeURIComponent(token)}`,
    )
    const q = new URLSearchParams({
      teamSlug: slug,
      teamT: token ?? '',
    })
    crewLoginTo.value = `${editionPath(res.editionSlug, '/crew/login')}?${q}`
  }
  catch {
    crewLoginTo.value = null
  }
}

const { data } = await useFetch('/api/me', { credentials: 'include' })

if (data.value?.team) {
  await navigateTo(`/crew/teams/${data.value.team.id}`)
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4 text-center">
    <h1 class="pixel-title text-base">Team QR</h1>
    <p class="pixel-body text-sm">Crew: sign in to rate this team.</p>
    <p v-if="!crewLoginTo" class="pixel-card p-4 pixel-body text-sm text-center">
      Invalid or unknown team QR.
      <NuxtLink to="/" class="underline block mt-2">Festival overview</NuxtLink>
    </p>
    <NuxtLink v-else :to="crewLoginTo" class="pixel-body underline">
      Crew login
    </NuxtLink>
  </main>
</template>
