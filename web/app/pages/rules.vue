<script setup lang="ts">
const backTo = '/'
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4 pixel-card p-4">
    <h1 class="pixel-title text-base text-center">Game rules</h1>
    <GameRulesContent />
    <NuxtLink :to="backTo" class="pixel-body text-sm underline block text-center">Back</NuxtLink>
  </main>
</template>
