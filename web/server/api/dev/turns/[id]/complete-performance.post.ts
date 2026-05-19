import { eq } from 'drizzle-orm'
import { getDb } from '../../../../utils/db'
import { turns } from '../../../../database/schema'
import { requireTeam } from '../../../../utils/team-session'
import { assertDevOnly } from '../../../../utils/dev-only'
import { ratePerformanceTurn } from '../../../../services/crew'

export default defineEventHandler(async (event) => {
  assertDevOnly()
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))

  const db = getDb()
  const turn = (await db.select().from(turns).where(eq(turns.id, turnId)).limit(1))[0]
  if (!turn || turn.teamId !== team.id) {
    throw createError({ statusCode: 404, statusMessage: 'Turn not found' })
  }
  if (turn.state !== 'awaiting_crew' && turn.state !== 'awaiting_crew_bg') {
    throw createError({ statusCode: 400, statusMessage: 'Team is not awaiting crew rating' })
  }

  return ratePerformanceTurn(team.editionId, team.id, turnId, 'ok')
})
