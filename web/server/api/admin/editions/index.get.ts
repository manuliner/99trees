import { desc } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { editions } from '../../../database/schema'
import { requireAdmin } from '../../../utils/admin-session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = getDb()
  const rows = await db.select().from(editions).orderBy(desc(editions.id))
  return {
    editions: rows.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      fieldCount: e.fieldCount,
      mapImageUrl: e.mapImagePath ?? null,
    })),
  }
})
