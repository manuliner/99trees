export function parseEditionId(raw: unknown): number | null {
  const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null
  return n
}

const EDITION_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export const RESERVED_EDITION_SLUGS = new Set([
  'admin',
  'api',
  'crew',
  'join',
  'leaderboard',
  'play',
  'privacy',
  'rejoin',
  'rules',
  's',
  't',
  '_nuxt',
])

export function slugifyEditionName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'edition'
  )
}

export function parseEditionSlug(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const slug = value.trim().toLowerCase()
  if (!isValidEditionSlug(slug)) return null
  return slug
}

export function isReservedEditionSlug(slug: string): boolean {
  return RESERVED_EDITION_SLUGS.has(slug)
}

export function isValidEditionSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 32) return false
  if (!EDITION_SLUG_PATTERN.test(slug)) return false
  if (isReservedEditionSlug(slug)) return false
  return true
}

export function validateEditionSlug(slug: string): string | null {
  if (!isValidEditionSlug(slug)) {
    return 'Slug must be 2–32 lowercase letters, numbers, or hyphens (not reserved)'
  }
  return null
}

export function joinPath(slug: string): string {
  return `/${encodeURIComponent(slug)}/join`
}

export function editionPath(slug: string, subpath: string): string {
  const path = subpath.startsWith('/') ? subpath : `/${subpath}`
  return `/${encodeURIComponent(slug)}${path}`
}

export function taskQrPath(_editionId: number, slug: string, token: string): string {
  const params = new URLSearchParams({ t: token })
  return `/s/${encodeURIComponent(slug)}?${params}`
}

/** @deprecated Use taskQrPath */
export const stationQrPath = taskQrPath

export function teamQrPath(_editionId: number, slug: string, token: string): string {
  const params = new URLSearchParams({ t: token })
  return `/t/${encodeURIComponent(slug)}?${params}`
}

/** @deprecated Use joinPath / editionPath with slug */
export function editionQuery(editionId: number): string {
  return `edition=${editionId}`
}
