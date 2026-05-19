import { requireTeam } from '../../../../utils/team-session'
import { continuePlayingAfterCoop } from '../../../../services/coop'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  return continuePlayingAfterCoop(team.id, turnId)
})
