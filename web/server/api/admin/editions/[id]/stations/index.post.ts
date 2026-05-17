import { and, eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { adminStationCreateSchema } from '#shared/schemas'
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
  const body = adminStationCreateSchema.parse(await readBody(event))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const fieldTaken = (
    await db
      .select({ id: stations.id })
      .from(stations)
      .where(and(eq(stations.editionId, editionId), eq(stations.fieldNumber, body.field)))
      .limit(1)
  )[0]
  if (fieldTaken) {
    throw createError({ statusCode: 409, statusMessage: 'Station already exists for this field' })
  }

  const existingSlugs = await db
    .select({ slug: stations.slug })
    .from(stations)
    .where(eq(stations.editionId, editionId))
  const usedSlugs = new Set(existingSlugs.map((r) => r.slug))
  const slug = resolveStationSlug(body.field, body.task, body.slug, usedSlugs)
  const hints = resolveHintLevels(body)

  const [inserted] = await db
    .insert(stations)
    .values({
      editionId,
      fieldNumber: body.field,
      slug,
      hintVague: body.hint_vague,
      hintLevel1: hints.hintLevel1,
      hintLevel2: hints.hintLevel2,
      mapX: body.map?.x ?? body.field * 10,
      mapY: body.map?.y ?? 50,
      qrToken: randomBytes(8).toString('hex'),
      taskType: body.task.type,
      taskPayloadJson: buildTaskPayloadJson(body.task),
    })
    .returning()

  if (body.field > edition.fieldCount) {
    await db
      .update(editions)
      .set({ fieldCount: body.field })
      .where(eq(editions.id, editionId))
  }

  return { station: stationRowToAdminStation(inserted!) }
})
