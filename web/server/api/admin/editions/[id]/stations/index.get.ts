import { asc, eq } from 'drizzle-orm'
import { getDb } from '../../../../../utils/db'
import { editions, stations } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { stationRowToAdminStation } from '../../../../../utils/admin-station'

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
    .from(stations)
    .where(eq(stations.editionId, editionId))
    .orderBy(asc(stations.fieldNumber))

  return { stations: rows.map(stationRowToAdminStation) }
})
