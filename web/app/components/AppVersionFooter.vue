<template>
  <footer
    class="app-version-footer shrink-0 border-t border-[var(--pixel-forest-dark)]/30 px-3 py-2"
    :aria-label="$t('footer.aria')"
  >
    <div class="app-version-footer__row">
      <nav class="app-version-footer__legal" :aria-label="$t('footer.legalAria')">
        <NuxtLink :to="impressumTo" class="app-version-footer__link">
          {{ $t('common.impressum') }}
        </NuxtLink>
        <NuxtLink :to="privacyTo" class="app-version-footer__link">
          {{ $t('common.privacy') }}
        </NuxtLink>
        <NuxtLink :to="crewLoginTo" class="app-version-footer__link">
          {{ $t('common.crewLogin') }}
        </NuxtLink>
      </nav>
      <span
        class="app-version-footer__version tabular-nums"
        title="Application version"
      >v{{ appVersion }}</span>
    </div>
    <MadeByCredit v-if="showCredits" class="app-version-footer__credit" />
  </footer>
</template>

<script setup lang="ts">
const route = useRoute()

const showCredits = computed(() => {
  const path = route.path.replace(/\/$/, '') || '/'
  return path !== '/impressum' && !path.endsWith('/impressum')
})

const props = withDefaults(
  defineProps<{
    showLegalLinks?: boolean
  }>(),
  { showLegalLinks: false },
)

const {
  public: { appVersion },
} = useRuntimeConfig()

const { pathWithEdition, editionSlug } = useEditionId({ required: false })

const impressumTo = computed(() =>
  props.showLegalLinks && editionSlug.value
    ? pathWithEdition('/impressum')
    : '/impressum',
)

const privacyTo = computed(() =>
  props.showLegalLinks && editionSlug.value
    ? pathWithEdition('/privacy')
    : '/privacy',
)

const crewLoginTo = computed(() =>
  props.showLegalLinks && editionSlug.value
    ? pathWithEdition('/crew/login')
    : '/crew/login',
)
</script>

<style scoped>
.app-version-footer__row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.app-version-footer__row::-webkit-scrollbar {
  display: none;
}

.app-version-footer__legal {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.app-version-footer__link {
  font-family: system-ui, sans-serif;
  font-size: 11px;
  color: var(--pixel-forest-dark);
  opacity: 0.8;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.app-version-footer__version {
  font-family: system-ui, sans-serif;
  font-size: 11px;
  color: var(--pixel-forest-dark);
  opacity: 0.6;
  white-space: nowrap;
  flex-shrink: 0;
}

.app-version-footer__credit {
  margin-top: 0.35rem;
}
</style>
