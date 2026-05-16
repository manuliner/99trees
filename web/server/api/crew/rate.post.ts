import { crewRateSchema } from '#shared/schemas'
import { requireCrewEdition } from '../../utils/crew-session'
import { ratePerformanceTurn } from '../../services/crew'
import { logGameEvent } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const editionId = requireCrewEdition(event)
  const body = crewRateSchema.parse(await readBody(event))
  const result = await ratePerformanceTurn(editionId, body.teamId, body.turnId, body.rating)
  logGameEvent('crew.rate', { editionId, ...body })
  return result
})
