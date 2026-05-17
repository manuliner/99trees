import { eq } from 'drizzle-orm'
import { getDb } from '../../../../utils/db'
import { editions, stations } from '../../../../database/schema'
import { requireAdmin } from '../../../../utils/admin-session'
import { isValidEditionSlug } from '#shared/edition-urls'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const edition = (await db.select().from(editions).where(eq(editions.id, id)).limit(1))[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const stationRows = await db.select().from(stations).where(eq(stations.editionId, id))
  const issues: string[] = []
  if (!edition.slug || !isValidEditionSlug(edition.slug)) issues.push('Edition slug not set or invalid')
  if (stationRows.length === 0) issues.push('No stations imported')
  if (stationRows.length !== edition.fieldCount) {
    issues.push(`Station count ${stationRows.length} != field_count ${edition.fieldCount}`)
  }
  if (!edition.crewPasswordHash) issues.push('Crew password not set')
  if (!edition.mapImagePath) issues.push('Festival map image not uploaded')
  const fields = new Set(stationRows.map((s) => s.fieldNumber))
  for (let i = 1; i <= edition.fieldCount; i++) {
    if (!fields.has(i)) issues.push(`Missing station for field ${i}`)
  }

  return {
    ok: issues.length === 0,
    issues,
    stationCount: stationRows.length,
    fieldCount: edition.fieldCount,
    hasCrewPassword: !!edition.crewPasswordHash,
    status: edition.status,
  }
})
