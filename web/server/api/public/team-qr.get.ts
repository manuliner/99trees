import { and, eq } from 'drizzle-orm'
import { getDb } from '../../utils/db'
import { teams, editions } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const slug = String(getQuery(event).slug ?? '')
  const token = String(getQuery(event).t ?? '')
  if (!slug || !token) {
    throw createError({ statusCode: 400, statusMessage: 'slug and t required' })
  }

  const db = getDb()
  const rows = await db
    .select({ editionId: teams.editionId, editionSlug: editions.slug })
    .from(teams)
    .innerJoin(editions, eq(teams.editionId, editions.id))
    .where(and(eq(teams.slug, slug), eq(teams.teamQrToken, token)))
    .limit(1)

  const team = rows[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })

  return { editionId: team.editionId, editionSlug: team.editionSlug }
})
