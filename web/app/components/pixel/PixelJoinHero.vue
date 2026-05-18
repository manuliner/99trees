<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'join' | 'rejoin'
    editionName?: string | null
    loading?: boolean
  }>(),
  { variant: 'join', editionName: null, loading: false },
)

const { t } = useI18n()

const tagline = computed(() =>
  props.variant === 'rejoin' ? t('hero.rejoinTagline') : t('hero.joinTagline'),
)
</script>

<template>
  <header class="pixel-join-hero" aria-labelledby="join-hero-title">
    <img
      src="/favicon.svg"
      alt=""
      width="56"
      height="56"
      class="pixel-join-hero__logo"
      :class="{ 'pixel-join-hero__logo--loading': loading }"
    >
    <h1 id="join-hero-title" class="pixel-title pixel-join-hero__title">
      ZUGVÖGEL
    </h1>
    <p
      v-if="loading"
      class="pixel-body pixel-join-hero__edition pixel-join-hero__edition--loading"
      aria-hidden="true"
    >
      …
    </p>
    <p v-else-if="editionName" class="pixel-body pixel-join-hero__edition">
      {{ editionName }}
    </p>
    <p class="pixel-body pixel-join-hero__tagline">
      {{ tagline }}
    </p>
  </header>
</template>
