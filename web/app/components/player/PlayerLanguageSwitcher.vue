<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()

const options = computed(() =>
  locales.value.map((l) => ({
    code: l.code,
    label: t(`language.${l.code}`),
  })),
)

async function select(code: 'de' | 'en') {
  await setLocale(code)
}
</script>

<template>
  <div
    class="player-lang-switcher"
    role="group"
    :aria-label="t('language.switcherLabel')"
  >
    <button
      v-for="opt in options"
      :key="opt.code"
      type="button"
      class="player-lang-switcher__btn pixel-body"
      :class="{ 'player-lang-switcher__btn--active': locale === opt.code }"
      :aria-pressed="locale === opt.code"
      @click="select(opt.code as 'de' | 'en')"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.player-lang-switcher {
  display: inline-flex;
  border: 2px solid var(--pixel-forest-dark);
  background: var(--pixel-cream);
}

.player-lang-switcher__btn {
  min-width: 2.5rem;
  padding: 0.35rem 0.5rem;
  font-size: 11px;
  line-height: 1.2;
  color: var(--pixel-forest-dark);
  background: transparent;
  border: none;
  cursor: pointer;
}

.player-lang-switcher__btn + .player-lang-switcher__btn {
  border-left: 2px solid var(--pixel-forest-dark);
}

.player-lang-switcher__btn--active {
  background: var(--pixel-forest-dark);
  color: var(--pixel-cream);
}

.player-lang-switcher__btn:focus-visible {
  outline: 2px solid var(--pixel-sunrise);
  outline-offset: 2px;
}
</style>
