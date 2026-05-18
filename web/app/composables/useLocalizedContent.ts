import type { AppLocale, LocalizedString, LocalizedStringList } from '#shared/localized'
import { resolveLocalized, resolveLocalizedList } from '#shared/localized'
import type { Ref } from 'vue'

export function useLocalizedContent(locale: Ref<AppLocale>) {
  function localized(value: LocalizedString | string | null | undefined): string {
    if (value == null) return ''
    if (typeof value === 'string') return value
    return resolveLocalized(value, locale.value)
  }

  function localizedList(value: LocalizedStringList | string[] | null | undefined): string[] {
    if (value == null) return []
    if (Array.isArray(value)) return value
    return resolveLocalizedList(value, locale.value)
  }

  return { localized, localizedList }
}
