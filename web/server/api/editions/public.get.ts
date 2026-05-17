import { eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { editions } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = getDb()
  const rows = await db
    .select({
      id: editions.id,
      slug: editions.slug,
      name: editions.name,
    })
    .from(editions)
    .where(eq(editions.status, 'live'))

  return { editions: rows }
})
