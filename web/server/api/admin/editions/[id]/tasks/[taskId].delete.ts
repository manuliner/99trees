import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../utils/db'
import { editions, tasks } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { deleteEditionTasks } from '../../../../../utils/admin-task-import'
import { assertCanEditBoardFields } from '../../../../../utils/admin-board-edit'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const taskId = Number(getRouterParam(event, 'taskId'))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  await assertCanEditBoardFields(edition)

  const existing = (
    await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.editionId, editionId)))
      .limit(1)
  )[0]
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Task not found' })

  await deleteEditionTasks(db, [taskId])

  const remaining = await db
    .select({ fieldNumber: tasks.fieldNumber })
    .from(tasks)
    .where(eq(tasks.editionId, editionId))

  const fieldCount = remaining.length
    ? Math.max(...remaining.map((r) => r.fieldNumber))
    : 0

  if (fieldCount < edition.fieldCount) {
    await db.update(editions).set({ fieldCount }).where(eq(editions.id, editionId))
  }

  return { fieldCount }
})
