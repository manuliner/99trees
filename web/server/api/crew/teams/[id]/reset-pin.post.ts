import { requireCrewEdition } from '../../../../utils/crew-session'
import { resetTeamPin } from '../../../../services/crew'

export default defineEventHandler(async (event) => {
  const editionId = await requireCrewEdition(event)
  const teamId = Number(getRouterParam(event, 'id'))
  return resetTeamPin(editionId, teamId)
})
