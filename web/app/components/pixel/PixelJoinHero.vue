<script setup lang="ts">
import type { LocalizedString } from '#shared/localized'

const props = withDefaults(
  defineProps<{
    variant?: 'join' | 'rejoin'
    editionName?: string | null
    joinDescription?: LocalizedString | null
    joinLogoUrl?: string | null
    loading?: boolean
  }>(),
  {
    variant: 'join',
    editionName: null,
    joinDescription: null,
    joinLogoUrl: null,
    loading: false,
  },
)

const { t, locale } = useI18n()
const { localized } = useLocalizedContent(locale)

const tagline = computed(() =>
  props.variant === 'rejoin' ? t('hero.rejoinTagline') : t('hero.joinTagline'),
)

const descriptionText = computed(() => {
  const custom = props.joinDescription ? localized(props.joinDescription).trim() : ''
  return custom || tagline.value
})

const logoSrc = computed(() => props.joinLogoUrl || '/favicon.svg')
</script>

<template>
  <header class="pixel-join-hero" aria-labelledby="join-hero-title">
    <img
      :src="logoSrc"
      alt=""
      class="pixel-join-hero__logo"
      :class="{ 'pixel-join-hero__logo--loading': loading }"
    >
    <h1 id="join-hero-title" class="pixel-title pixel-join-hero__title">
      <span v-if="loading" aria-hidden="true">…</span>
      <span v-else>{{ editionName ?? 'ZUGVÖGEL' }}</span>
    </h1>
    <p class="pixel-body pixel-join-hero__tagline">
      {{ descriptionText }}
    </p>
  </header>
</template>
