import { eq } from 'drizzle-orm'
import { slugifyEditionName, validateEditionSlug } from '#shared/edition-urls'
import { getDb } from './db'
import { editions } from '../database/schema'

export async function assertEditionSlugAvailable(slug: string, excludeEditionId?: number) {
  const err = validateEditionSlug(slug)
  if (err) throw createError({ statusCode: 400, statusMessage: err })

  const db = getDb()
  const row = (await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, slug)).limit(1))[0]
  if (row && row.id !== excludeEditionId) {
    throw createError({ statusCode: 409, statusMessage: 'Edition slug already in use' })
  }
}

export async function generateUniqueEditionSlug(baseName: string): Promise<string> {
  const base = slugifyEditionName(baseName)
  const db = getDb()
  for (let n = 0; n < 100; n++) {
    const slug = n === 0 ? base : `${base}-${n}`
    const err = validateEditionSlug(slug)
    if (err) continue
    const row = (await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, slug)).limit(1))[0]
    if (!row) return slug
  }
  throw createError({ statusCode: 500, statusMessage: 'Could not generate edition slug' })
}
