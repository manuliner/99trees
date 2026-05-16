<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
const token = route.query.t as string

const { data } = await useFetch('/api/me', { credentials: 'include' })

if (data.value?.team) {
  await navigateTo(`/crew/teams/${data.value.team.id}`)
}
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4 text-center">
    <h1 class="pixel-title text-base">Team QR</h1>
    <p class="pixel-body text-sm">Crew: sign in to rate this team.</p>
    <NuxtLink
      :to="`/crew/login?edition=1&teamSlug=${encodeURIComponent(slug)}&teamT=${encodeURIComponent(token ?? '')}`"
      class="pixel-body underline"
    >
      Crew login
    </NuxtLink>
  </main>
</template>
