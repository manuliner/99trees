import { buildMePayload } from '../services/game'
import { requireTeam } from '../utils/team-session'

export default defineEventHandler(async (event) => {
  const team = await requireTeam(event)
  return buildMePayload(team.id)
})
