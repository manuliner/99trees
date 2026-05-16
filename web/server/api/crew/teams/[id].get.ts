import { requireCrewEdition } from '../../../utils/crew-session'
import { getCrewTeamDetail } from '../../../services/crew'

export default defineEventHandler(async (event) => {
  const editionId = requireCrewEdition(event)
  const teamId = Number(getRouterParam(event, 'id'))
  return getCrewTeamDetail(editionId, teamId)
})
