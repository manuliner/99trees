export type AppLocale = 'de' | 'en'

export const APP_LOCALES: AppLocale[] = ['de', 'en']

export type LocalizedString = Record<AppLocale, string>

export type LocalizedStringList = Record<AppLocale, string[]>

export type LocalizedStringInput = LocalizedString | string

export type LocalizedStringListInput = LocalizedStringList | string[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isCompleteLocalizedString(value: unknown): value is LocalizedString {
  if (!isRecord(value)) return false
  return APP_LOCALES.every((locale) => typeof value[locale] === 'string' && value[locale].trim().length > 0)
}

export function isCompleteLocalizedStringList(value: unknown): value is LocalizedStringList {
  if (!isRecord(value)) return false
  return APP_LOCALES.every((locale) => {
    const list = value[locale]
    return Array.isArray(list) && list.some((item) => typeof item === 'string' && item.trim().length > 0)
  })
}

export function normalizeLocalizedString(value: LocalizedStringInput): LocalizedString {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return { de: trimmed, en: trimmed }
  }
  return {
    de: value.de.trim(),
    en: value.en.trim(),
  }
}

export function normalizeLocalizedStringList(value: LocalizedStringListInput): LocalizedStringList {
  if (Array.isArray(value)) {
    const trimmed = value.map((item) => item.trim()).filter(Boolean)
    return { de: [...trimmed], en: [...trimmed] }
  }
  return {
    de: value.de.map((item) => item.trim()).filter(Boolean),
    en: value.en.map((item) => item.trim()).filter(Boolean),
  }
}

export function parseLocalizedString(raw: string): LocalizedString {
  const trimmed = raw.trim()
  if (!trimmed) return { de: '', en: '' }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (isCompleteLocalizedString(parsed)) {
        return normalizeLocalizedString(parsed)
      }
      if (isRecord(parsed) && typeof parsed.de === 'string' && typeof parsed.en === 'string') {
        return normalizeLocalizedString(parsed as LocalizedString)
      }
    }
    catch {
      // fall through to plain string
    }
  }
  return normalizeLocalizedString(trimmed)
}

export function serializeLocalizedString(value: LocalizedString): string {
  return JSON.stringify(normalizeLocalizedString(value))
}

export function resolveLocalized(value: LocalizedStringInput, locale: AppLocale): string {
  const normalized = normalizeLocalizedString(value)
  return normalized[locale] || normalized.de || normalized.en
}

export function resolveLocalizedList(value: LocalizedStringListInput, locale: AppLocale): string[] {
  const normalized = normalizeLocalizedStringList(value)
  const list = normalized[locale]
  if (list.length > 0) return list
  return normalized.de.length > 0 ? normalized.de : normalized.en
}

export function localizedStringPrimaryText(value: LocalizedStringInput): string {
  return resolveLocalized(value, 'de')
}

export function parseLocalizedStringList(raw: unknown): LocalizedStringList {
  if (Array.isArray(raw)) {
    return normalizeLocalizedStringList(raw)
  }
  if (isRecord(raw) && typeof raw.de !== 'undefined' && typeof raw.en !== 'undefined') {
    const de = Array.isArray(raw.de) ? raw.de.filter((item): item is string => typeof item === 'string') : []
    const en = Array.isArray(raw.en) ? raw.en.filter((item): item is string => typeof item === 'string') : []
    return normalizeLocalizedStringList({ de, en })
  }
  return { de: [], en: [] }
}
