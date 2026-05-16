import { requireCrewEdition } from '../../../utils/crew-session'
import { searchTeams } from '../../../services/crew'

export default defineEventHandler(async (event) => {
  const editionId = requireCrewEdition(event)
  const q = String(getQuery(event).q ?? '')
  if (q.length < 2) return { teams: [] }
  const teams = await searchTeams(editionId, q)
  return { teams }
})
