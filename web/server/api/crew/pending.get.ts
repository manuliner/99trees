import { requireCrewEdition } from '../../utils/crew-session'
import { getPendingPerformances } from '../../services/crew'

export default defineEventHandler(async (event) => {
  const editionId = requireCrewEdition(event)
  return { pending: await getPendingPerformances(editionId) }
})
