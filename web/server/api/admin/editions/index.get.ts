import { count, desc } from 'drizzle-orm'
import { getDb } from '../../../utils/db'
import { editions, teams } from '../../../database/schema'
import { requireAdmin } from '../../../utils/admin-session'
import { parseEditionConfig } from '../../../utils/edition-config'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = getDb()
  const rows = await db.select().from(editions).orderBy(desc(editions.id))
  const counts = await db
    .select({ editionId: teams.editionId, teamCount: count() })
    .from(teams)
    .groupBy(teams.editionId)
  const countByEdition = new Map(counts.map((c) => [c.editionId, Number(c.teamCount)]))

  return {
    editions: rows.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      status: e.status,
      fieldCount: e.fieldCount,
      teamCount: countByEdition.get(e.id) ?? 0,
      mapImageUrl: e.mapImagePath ?? null,
      config: parseEditionConfig(e.configJson),
    })),
  }
})
