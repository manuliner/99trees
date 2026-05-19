<script setup lang="ts">
definePageMeta({ layout: 'player' })

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
    <h1 class="pixel-title text-base text-center">{{ $t('rules.title') }}</h1>
    <GameRulesContent />
    <NuxtLink :to="pathWithEdition('/')" class="pixel-body text-sm underline block text-center">
      {{ $t('common.back') }}
    </NuxtLink>
  </main>
</template>
