import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { adminTaskCreateSchema } from '#shared/schemas'
import { resolveTaskSlug } from '#shared/task-slug'
import { getDb } from '../../../../../utils/db'
import { editions, tasks } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import {
  buildActivityPayloadJson,
  resolveHintLevels,
  serializeHint,
  taskRowToAdminTask,
} from '../../../../../utils/admin-task'
import { insertSlotAtField, isFieldOccupied } from '../../../../../utils/admin-task-field-shift'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const body = adminTaskCreateSchema.parse(await readBody(event))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  if (await isFieldOccupied(db, editionId, body.field)) {
    await insertSlotAtField(db, edition, body.field)
  }

  const existingSlugs = await db
    .select({ slug: tasks.slug })
    .from(tasks)
    .where(eq(tasks.editionId, editionId))
  const usedSlugs = new Set(existingSlugs.map((r) => r.slug))
  const slug = resolveTaskSlug(body.field, body.activity, body.slug, usedSlugs)
  const hints = resolveHintLevels(body)

  const [inserted] = await db
    .insert(tasks)
    .values({
      editionId,
      fieldNumber: body.field,
      slug,
      hintVague: serializeHint(body.hint_vague),
      hintLevel1: serializeHint(hints.hintLevel1),
      hintLevel2: serializeHint(hints.hintLevel2),
      mapX: body.map?.x ?? body.field * 10,
      mapY: body.map?.y ?? 50,
      qrToken: randomBytes(8).toString('hex'),
      activityType: body.activity.type,
      activityPayloadJson: buildActivityPayloadJson(body.activity),
    })
    .returning()

  const refreshed = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]!
  if (body.field > refreshed.fieldCount) {
    await db
      .update(editions)
      .set({ fieldCount: body.field })
      .where(eq(editions.id, editionId))
  }

  return { task: taskRowToAdminTask(inserted!) }
})
