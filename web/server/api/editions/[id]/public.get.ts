import { eq } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { editions } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid edition id' })
  }

  const db = getDb()
  const rows = await db.select().from(editions).where(eq(editions.id, id)).limit(1)
  const edition = rows[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  return {
    id: edition.id,
    name: edition.name,
    status: edition.status,
    fieldCount: edition.fieldCount,
    startsAt: edition.startsAt,
    endsAt: edition.endsAt,
  }
})
