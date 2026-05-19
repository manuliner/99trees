import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { analyzeEditionBoard } from '#shared/edition-board-checklist'
import { validateEditionSlug } from '#shared/edition-urls'
import { serializeLocalizedString } from '#shared/localized'
import { getDb } from '../../../utils/db'
import { editions, tasks } from '../../../database/schema'
import { requireAdmin } from '../../../utils/admin-session'
import { assertEditionSlugAvailable } from '../../../utils/edition-slug'
import { parseEditionConfig } from '../../../utils/edition-config'
import type { EditionConfig } from '#shared/types'

const schema = z.object({
  status: z.enum(['draft', 'live', 'paused', 'ended']).optional(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  crewPassword: z.string().min(4).optional(),
  config: z.record(z.unknown()).optional(),
  joinDescription: z.object({ de: z.string(), en: z.string() }).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = schema.parse(await readBody(event))
  const db = getDb()

  const edition = (await db.select().from(editions).where(eq(editions.id, id)).limit(1))[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  if (body.status === 'live') {

    const taskRows = await db.select().from(tasks).where(eq(tasks.editionId, id))
    const board = analyzeEditionBoard(
      taskRows.map((s) => s.fieldNumber),
      edition.fieldCount,
    )
    const issues: string[] = [...board.issues]

    if (board.trailingEmptySlots > 0) {
      await db
        .update(editions)
        .set({ fieldCount: board.effectiveFieldCount })
        .where(eq(editions.id, id))
    }

    if (!edition.crewPasswordHash && !body.crewPassword) issues.push('Crew password not set')
    if (!edition.mapImagePath) issues.push('Festival map image not uploaded')
    const slugToCheck = body.slug?.trim().toLowerCase() ?? edition.slug
    if (!slugToCheck || validateEditionSlug(slugToCheck)) {
      issues.push('Edition slug not set or invalid')
    }
    if (issues.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot go live: ${issues.join('; ')}`,
      })
    }
  }

  if (body.slug) {
    const nextSlug = body.slug.trim().toLowerCase()
    const slugErr = validateEditionSlug(nextSlug)
    if (slugErr) throw createError({ statusCode: 400, statusMessage: slugErr })
    if (edition.status !== 'draft') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Edition slug can only be changed while draft',
      })
    }
    await assertEditionSlugAvailable(nextSlug, id)
  }

  const patch: Record<string, unknown> = {}
  if (body.status) patch.status = body.status
  if (body.name) patch.name = body.name
  if (body.slug) patch.slug = body.slug.trim().toLowerCase()
  if (body.config) {
    patch.configJson = JSON.stringify(
      parseEditionConfig(JSON.stringify(body.config as unknown as EditionConfig)),
    )
  }
  if (body.crewPassword) patch.crewPasswordHash = await bcrypt.hash(body.crewPassword, 10)
  if (body.joinDescription) {
    patch.joinDescriptionJson = serializeLocalizedString(body.joinDescription)
  }

  const updated = await db.update(editions).set(patch).where(eq(editions.id, id)).returning()
  if (!updated[0]) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  return { edition: updated[0] }
})
