<script setup lang="ts">
const backTo = '/'
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4 pixel-card p-4">
    <h1 class="pixel-title text-base">Privacy</h1>
    <p class="pixel-body text-sm">
      We store your team name, game progress, and scores for the duration of the festival edition.
      Data is deleted after the event. No marketing emails. Contact the festival info desk for deletion requests.
    </p>
    <NuxtLink :to="backTo" class="pixel-body text-sm underline">Back</NuxtLink>
  </main>
</template>
