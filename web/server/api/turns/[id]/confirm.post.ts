import { requireTeam } from '../../../utils/team-session'
import { confirmTurn } from '../../../services/game'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const result = await confirmTurn(team.id, turnId)
  return result
})
