import { requireStaffForTeam } from '../../../utils/staff-session'
import { getCrewTeamDetail } from '../../../services/crew'

export default defineEventHandler(async (event) => {
  const teamId = Number(getRouterParam(event, 'id'))
  const editionId = await requireStaffForTeam(event, teamId)
  return getCrewTeamDetail(editionId, teamId)
})
