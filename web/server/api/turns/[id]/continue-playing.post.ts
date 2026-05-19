import { requireTeam } from '../../../utils/team-session'
import { continuePlayingAfterPerformance } from '../../../services/game'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  return continuePlayingAfterPerformance(team.id, turnId)
})
