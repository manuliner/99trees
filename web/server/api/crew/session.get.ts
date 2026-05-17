import { requireCrewEdition } from '../../utils/crew-session'
import { getEditionOrThrow } from '../../services/game'

export default defineEventHandler(async (event) => {
  const editionId = requireCrewEdition(event)
  const edition = await getEditionOrThrow(editionId)
  return { editionId, editionSlug: edition.slug }
})
