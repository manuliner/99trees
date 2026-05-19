<script setup lang="ts">
definePageMeta({ layout: 'player' })

const {
  editionError,
  editionPublic,
  editionPublicPending,
  editionSlugLookupSettled,
  pathWithEdition,
} = useEditionId()

watch(
  () => ({ err: editionError.value, settled: editionSlugLookupSettled.value }),
  ({ err, settled }) => {
    if (settled && err) navigateTo('/')
  },
  { immediate: true },
)

const editionLoading = computed(
  () => !editionSlugLookupSettled.value || editionPublicPending.value,
)

const showPage = computed(
  () => editionSlugLookupSettled.value && !editionError.value,
)

const joinTo = computed(() => pathWithEdition('/join'))
const rejoinTo = computed(() => pathWithEdition('/rejoin'))
const rulesTo = computed(() => pathWithEdition('/rules'))
</script>

<template>
  <main v-if="showPage" class="join-page-main edition-landing p-4 max-w-md mx-auto space-y-4">
    <PixelJoinHero
      variant="join"
      :edition-name="editionPublic?.name ?? null"
      :join-description="editionPublic?.joinDescription ?? null"
      :join-logo-url="editionPublic?.joinLogoUrl ?? null"
      :loading="editionLoading"
    />

    <p v-if="editionLoading" class="pixel-body text-center text-sm opacity-70">
      {{ $t('common.loadingEvent') }}
    </p>

    <nav
      v-else
      class="edition-landing-actions"
      :aria-label="$t('landing.navAria')"
    >
      <NuxtLink :to="joinTo" class="pixel-btn pixel-btn--primary w-full edition-landing-actions__link">
        {{ $t('landing.createTeam') }}
      </NuxtLink>
      <NuxtLink :to="rejoinTo" class="pixel-btn pixel-btn--secondary w-full edition-landing-actions__link">
        {{ $t('landing.signIn') }}
      </NuxtLink>
    </nav>

    <footer v-if="!editionLoading" class="join-page-nav">
      <div class="join-page-nav__secondary">
        <NuxtLink :to="rulesTo" class="pixel-body underline">{{ $t('common.rules') }}</NuxtLink>
      </div>
    </footer>
  </main>
</template>
