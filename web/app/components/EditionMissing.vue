<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <main class="p-4 max-w-md mx-auto space-y-4 text-center">
    <h1 class="pixel-title text-base">ZUGVÖGEL</h1>
    <p class="pixel-card p-4 pixel-body text-sm">
      {{ message ?? 'Scan the festival entry QR to open the game for your event.' }}
    </p>
  </main>
</template>
