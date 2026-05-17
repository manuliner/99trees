import { crewRateSchema } from '#shared/schemas'
import { requireStaffForTeam } from '../../utils/staff-session'
import { ratePerformanceTurn } from '../../services/crew'
import { logGameEvent } from '../../utils/logger'
import { getAdminFromSession } from '../../utils/admin-session'

export default defineEventHandler(async (event) => {
  const body = crewRateSchema.parse(await readBody(event))
  const editionId = await requireStaffForTeam(event, body.teamId)
  const result = await ratePerformanceTurn(editionId, body.teamId, body.turnId, body.rating)
  const admin = await getAdminFromSession(event)
  logGameEvent('crew.rate', { editionId, ...body, source: admin ? 'admin' : 'crew' })
  return result
})
