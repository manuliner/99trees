import { eq } from 'drizzle-orm'
import { analyzeEditionBoard } from '#shared/edition-board-checklist'
import { isValidEditionSlug } from '#shared/edition-urls'
import { getDb } from '../../../../utils/db'
import { editions, tasks } from '../../../../database/schema'
import { requireAdmin } from '../../../../utils/admin-session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const edition = (await db.select().from(editions).where(eq(editions.id, id)).limit(1))[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const taskRows = await db.select().from(tasks).where(eq(tasks.editionId, id))
  const issues: string[] = []
  if (!edition.slug || !isValidEditionSlug(edition.slug)) issues.push('Edition slug not set or invalid')

  const board = analyzeEditionBoard(
    taskRows.map((s) => s.fieldNumber),
    edition.fieldCount,
  )
  issues.push(...board.issues)

  if (!edition.crewPasswordHash) issues.push('Crew password not set')
  if (!edition.mapImagePath) issues.push('Festival map image not uploaded')

  return {
    ok: issues.length === 0,
    issues,
    taskCount: taskRows.length,
    fieldCount: edition.fieldCount,
    hasCrewPassword: !!edition.crewPasswordHash,
    status: edition.status,
  }
})
