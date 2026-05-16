import { eq } from 'drizzle-orm'
import { getDb } from '../../../../utils/db'
import { teams } from '../../../../database/schema'
import { requireAdmin } from '../../../../utils/admin-session'
import { resetTeamPin } from '../../../../services/crew'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const team = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0]
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  return resetTeamPin(team.editionId, teamId)
})
