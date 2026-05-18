import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { adminTasksImportSchema } from '#shared/schemas'
import { getDb } from '../../../../../utils/db'
import { editions, tasks } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { buildActivityPayloadJson, resolveHintLevels, serializeHint } from '../../../../../utils/admin-task'
import {
  assertNoFieldConflicts,
  deleteEditionTasks,
  importNormalizedSlugSet,
  planTaskImport,
  stageExistingTasksForOverwrite,
  taskIdsMissingFromImport,
} from '../../../../../utils/admin-task-import'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const body = adminTasksImportSchema.parse(await readBody(event))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const existingRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.editionId, editionId))

  const plans = planTaskImport(body.tasks, existingRows)
  const overwrite = body.overwrite === true

  if (!overwrite) {
    assertNoFieldConflicts(plans, existingRows)
  }

  let deleted = 0
  if (overwrite) {
    await stageExistingTasksForOverwrite(db, plans)
    const importSlugs = importNormalizedSlugSet(plans)
    deleted = await deleteEditionTasks(db, taskIdsMissingFromImport(existingRows, importSlugs))
  }

  let created = 0
  let updated = 0

  for (const plan of plans) {
    const hints = resolveHintLevels(plan.item)
    const values = {
      fieldNumber: plan.item.field,
      slug: plan.slug,
      hintVague: serializeHint(plan.item.hint_vague),
      hintLevel1: serializeHint(hints.hintLevel1),
      hintLevel2: serializeHint(hints.hintLevel2),
      mapX: plan.item.map?.x ?? plan.item.field * 10,
      mapY: plan.item.map?.y ?? 50,
      activityType: plan.item.activity.type,
      activityPayloadJson: buildActivityPayloadJson(plan.item.activity),
    }

    if (plan.existing) {
      await db
        .update(tasks)
        .set(values)
        .where(eq(tasks.id, plan.existing.id))
      updated++
    }
    else {
      await db.insert(tasks).values({
        editionId,
        ...values,
        qrToken: randomBytes(8).toString('hex'),
      })
      created++
    }
  }

  const allRows = await db
    .select({ fieldNumber: tasks.fieldNumber })
    .from(tasks)
    .where(eq(tasks.editionId, editionId))

  const maxField = allRows.length
    ? Math.max(...allRows.map((r) => r.fieldNumber))
    : edition.fieldCount
  const fieldCount = Math.max(edition.fieldCount, maxField)

  await db.update(editions).set({ fieldCount }).where(eq(editions.id, editionId))

  return { created, updated, deleted, fieldCount }
})
