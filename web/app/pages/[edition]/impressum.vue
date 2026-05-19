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
  <main v-if="!editionError" class="p-4 max-w-lg mx-auto space-y-4 pixel-card p-4">
    <h1 class="pixel-title text-base">{{ $t('impressum.title') }}</h1>
    <LegalImpressumContent />
    <NuxtLink :to="pathWithEdition('/')" class="pixel-body text-sm underline">
      {{ $t('common.back') }}
    </NuxtLink>
  </main>
</template>
