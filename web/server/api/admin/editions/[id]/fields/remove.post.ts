import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../utils/db'
import { editions, tasks } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import {
  assertCanEditBoardFields,
  reconcileEditionAfterFieldRemoved,
} from '../../../../../utils/admin-board-edit'
import { deleteEditionTasks } from '../../../../../utils/admin-task-import'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })
  await assertCanEditBoardFields(edition)
  if (edition.fieldCount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'No fields to remove' })
  }

  const removedField = edition.fieldCount
  const { abandonedTurns } = await reconcileEditionAfterFieldRemoved(
    db,
    editionId,
    removedField,
  )

  const taskOnField = (
    await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(eq(tasks.editionId, editionId), eq(tasks.fieldNumber, removedField)),
      )
      .limit(1)
  )[0]

  let deletedTask = false
  if (taskOnField) {
    await deleteEditionTasks(db, [taskOnField.id])
    deletedTask = true
  }

  const fieldCount = edition.fieldCount - 1
  await db.update(editions).set({ fieldCount }).where(eq(editions.id, editionId))

  return { fieldCount, deletedTask, abandonedTurns }
})
