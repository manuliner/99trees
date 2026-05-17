import { and, eq, ne } from 'drizzle-orm'
import { adminStationPatchSchema } from '#shared/schemas'
import { resolveStationSlug } from '#shared/station-slug'
import { getDb } from '../../../../../utils/db'
import { editions, stations } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import {
  buildTaskPayloadJson,
  resolveHintLevels,
  stationRowToAdminStation,
} from '../../../../../utils/admin-station'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const stationId = Number(getRouterParam(event, 'stationId'))
  const body = adminStationPatchSchema.parse(await readBody(event))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const existing = (
    await db
      .select()
      .from(stations)
      .where(and(eq(stations.id, stationId), eq(stations.editionId, editionId)))
      .limit(1)
  )[0]
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Station not found' })

  const otherSlugs = await db
    .select({ slug: stations.slug })
    .from(stations)
    .where(and(eq(stations.editionId, editionId), ne(stations.id, stationId)))
  const usedSlugs = new Set(otherSlugs.map((r) => r.slug))
  const slug = resolveStationSlug(existing.fieldNumber, body.task, body.slug, usedSlugs)

  const hints = resolveHintLevels(body)

  const [updated] = await db
    .update(stations)
    .set({
      slug,
      hintVague: body.hint_vague,
      hintLevel1: hints.hintLevel1,
      hintLevel2: hints.hintLevel2,
      mapX: body.map.x,
      mapY: body.map.y,
      taskType: body.task.type,
      taskPayloadJson: buildTaskPayloadJson(body.task),
    })
    .where(eq(stations.id, stationId))
    .returning()

  return { station: stationRowToAdminStation(updated!) }
})
