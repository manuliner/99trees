<script setup lang="ts">
import { parseEditionId } from '#shared/edition-urls'

const route = useRoute()
const legacyId = parseEditionId(route.query.edition)

if (legacyId != null) {
  const { slug } = await $fetch<{ slug: string }>(`/api/editions/${legacyId}/slug`)
  await navigateTo(`/${slug}`)
}

const { data } = await useFetch<{ editions: { id: number; slug: string; name: string }[] }>(
  '/api/editions/public',
)
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">ZUGVÖGEL</h1>
    <p class="pixel-body text-center text-sm opacity-80">Choose your festival</p>

    <p v-if="!data?.editions?.length" class="pixel-card p-4 pixel-body text-sm text-center">
      No events are live right now. Scan the festival entry QR when the game opens.
    </p>

    <ul v-else class="space-y-3">
      <li v-for="e in data.editions" :key="e.id">
        <NuxtLink
          :to="`/${e.slug}`"
          class="pixel-card p-4 block pixel-body text-sm hover:opacity-90"
        >
          {{ e.name }}
        </NuxtLink>
      </li>
    </ul>

    <MadeByCredit class="mt-8" />
  </main>
</template>
