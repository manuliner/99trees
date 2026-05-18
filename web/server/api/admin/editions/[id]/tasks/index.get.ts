import { asc, eq } from 'drizzle-orm'
import { getDb } from '../../../../../utils/db'
import { editions, tasks } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { taskRowToAdminTask } from '../../../../../utils/admin-task'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const db = getDb()

  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.editionId, editionId))
    .orderBy(asc(tasks.fieldNumber))

  return { tasks: rows.map(taskRowToAdminTask) }
})
