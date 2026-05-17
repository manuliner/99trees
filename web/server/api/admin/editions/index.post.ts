import { z } from 'zod'
import { getDb } from '../../../utils/db'
import { editions } from '../../../database/schema'
import { requireAdmin } from '../../../utils/admin-session'
import { DEFAULT_EDITION_CONFIG } from '#shared/types'
import { assertEditionSlugAvailable, generateUniqueEditionSlug } from '../../../utils/edition-slug'

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  fieldCount: z.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = schema.parse(await readBody(event))
  const slug = body.slug?.trim().toLowerCase() ?? (await generateUniqueEditionSlug(body.name))
  await assertEditionSlugAvailable(slug)

  const db = getDb()
  const now = new Date()
  const inserted = await db
    .insert(editions)
    .values({
      name: body.name,
      slug,
      fieldCount: body.fieldCount ?? 0,
      status: 'draft',
      configJson: JSON.stringify(DEFAULT_EDITION_CONFIG),
      createdAt: now,
    })
    .returning()
  return { edition: inserted[0] }
})
