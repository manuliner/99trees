import { requireAdmin } from '../../../../../utils/admin-session'
import { listAdminTeams } from '../../../../../services/admin-teams'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const teams = await listAdminTeams(editionId)
  return { teams }
})
