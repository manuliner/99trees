import { resolveStaffEditionId, requireStaffEdition } from '../../utils/staff-session'
import { getPendingPerformances } from '../../services/crew'

export default defineEventHandler(async (event) => {
  const editionId = await resolveStaffEditionId(event)
  await requireStaffEdition(event, editionId)
  return { pending: await getPendingPerformances(editionId) }
})
