<script setup lang="ts">
const { editionError, pathWithEdition } = useEditionId({ required: false })

watch(
  () => editionError.value,
  (err) => {
    if (err) navigateTo('/')
  },
  { immediate: true },
)
</script>

<template>
  <main v-if="!editionError" class="p-4 max-w-md mx-auto space-y-4 pixel-card p-4">
    <h1 class="pixel-title text-base text-center">Game rules</h1>
    <GameRulesContent />
    <NuxtLink :to="pathWithEdition('/join')" class="pixel-body text-sm underline block text-center">Back</NuxtLink>
  </main>
</template>
