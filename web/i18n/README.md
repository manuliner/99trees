# Player i18n

**Purpose:** `@nuxtjs/i18n` config and player UI string catalogs (DE default, EN); admin/crew stay English hardcoded.

- **i18n.config.ts** — `defineI18nConfig` with `fallbackLocale: 'en'`
- **locales/de.json** — German player copy (join, play, rules, privacy, errors)
- **locales/en.json** — English player copy mirroring `de.json` keys

**Depends on:** `nuxt.config.ts` i18n module block (lang dir, default locale)
