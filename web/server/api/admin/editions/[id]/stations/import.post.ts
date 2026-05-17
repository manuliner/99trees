import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { adminStationsImportSchema } from '#shared/schemas'
import { getDb } from '../../../../../utils/db'
import { editions, stations } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { buildTaskPayloadJson, resolveHintLevels } from '../../../../../utils/admin-station'
import {
  assertNoFieldConflicts,
  planStationImport,
} from '../../../../../utils/admin-station-import'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const body = adminStationsImportSchema.parse(await readBody(event))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const existingRows = await db
    .select()
    .from(stations)
    .where(eq(stations.editionId, editionId))

  const plans = planStationImport(body.stations, existingRows)
  assertNoFieldConflicts(plans, existingRows)

  let created = 0
  let updated = 0

  for (const plan of plans) {
    const hints = resolveHintLevels(plan.item)
    const values = {
      fieldNumber: plan.item.field,
      slug: plan.slug,
      hintVague: plan.item.hint_vague,
      hintLevel1: hints.hintLevel1,
      hintLevel2: hints.hintLevel2,
      mapX: plan.item.map?.x ?? plan.item.field * 10,
      mapY: plan.item.map?.y ?? 50,
      taskType: plan.item.task.type,
      taskPayloadJson: buildTaskPayloadJson(plan.item.task),
    }

    if (plan.existing) {
      await db
        .update(stations)
        .set(values)
        .where(eq(stations.id, plan.existing.id))
      updated++
    }
    else {
      await db.insert(stations).values({
        editionId,
        ...values,
        qrToken: randomBytes(8).toString('hex'),
      })
      created++
    }
  }

  const allRows = await db
    .select({ fieldNumber: stations.fieldNumber })
    .from(stations)
    .where(eq(stations.editionId, editionId))

  const maxField = allRows.length
    ? Math.max(...allRows.map((r) => r.fieldNumber))
    : edition.fieldCount
  const fieldCount = Math.max(edition.fieldCount, maxField)

  await db.update(editions).set({ fieldCount }).where(eq(editions.id, editionId))

  return { created, updated, fieldCount }
})
