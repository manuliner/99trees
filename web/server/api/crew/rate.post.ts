import { crewRateSchema } from '#shared/schemas'
import { requireCrewEdition } from '../../utils/crew-session'
import { ratePerformanceTurn } from '../../services/crew'

export default defineEventHandler(async (event) => {
  const editionId = requireCrewEdition(event)
  const body = crewRateSchema.parse(await readBody(event))
  return ratePerformanceTurn(editionId, body.teamId, body.turnId, body.rating)
})
