import { and, eq, ne } from 'drizzle-orm'
import { adminTaskPatchSchema } from '#shared/schemas'
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
import { insertTaskAtField } from '../../../../../utils/admin-task-field-shift'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const taskId = Number(getRouterParam(event, 'taskId'))
  const body = adminTaskPatchSchema.parse(await readBody(event))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const existing = (
    await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.editionId, editionId)))
      .limit(1)
  )[0]
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Task not found' })

  if (body.field != null && body.field !== existing.fieldNumber) {
    await insertTaskAtField(db, edition, taskId, body.field)
    const moved = (
      await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.editionId, editionId)))
        .limit(1)
    )[0]
    if (moved) existing.fieldNumber = moved.fieldNumber
  }

  const fieldForSlug = body.field ?? existing.fieldNumber

  const otherSlugs = await db
    .select({ slug: tasks.slug })
    .from(tasks)
    .where(and(eq(tasks.editionId, editionId), ne(tasks.id, taskId)))
  const usedSlugs = new Set(otherSlugs.map((r) => r.slug))
  const slug = resolveTaskSlug(fieldForSlug, body.activity, body.slug, usedSlugs)

  const hints = resolveHintLevels(body)

  const [updated] = await db
    .update(tasks)
    .set({
      slug,
      hintVague: serializeHint(body.hint_vague),
      hintLevel1: serializeHint(hints.hintLevel1),
      hintLevel2: serializeHint(hints.hintLevel2),
      mapX: body.map.x,
      mapY: body.map.y,
      activityType: body.activity.type,
      activityPayloadJson: buildActivityPayloadJson(body.activity),
    })
    .where(eq(tasks.id, taskId))
    .returning()

  return { task: taskRowToAdminTask(updated!) }
})
