<script setup lang="ts">
const { editionId, editionError } = useEditionId()

watch(
  () => editionError.value,
  (err) => {
    if (err) navigateTo('/')
  },
  { immediate: true },
)
</script>

<template>
  <main v-if="!editionError && editionId != null" class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="pixel-title text-center text-base">Leaderboard</h1>
    <LeaderboardPanel :edition-id="editionId" />
    <NuxtLink to="/play" class="pixel-body text-sm underline block text-center">Back to game</NuxtLink>
  </main>
</template>
