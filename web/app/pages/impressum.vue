<script setup lang="ts">
const backTo = '/'
</script>

<template>
  <main class="p-4 max-w-lg mx-auto space-y-4 pixel-card p-4">
    <h1 class="pixel-title text-base">{{ $t('impressum.title') }}</h1>
    <LegalImpressumContent />
    <NuxtLink :to="backTo" class="pixel-body text-sm underline">{{ $t('common.back') }}</NuxtLink>
  </main>
</template>
