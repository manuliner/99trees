import { requireCrewEdition } from '../../utils/crew-session'
import { getEditionOrThrow } from '../../services/game'
import { parseEditionConfig } from '../../utils/edition-config'

export default defineEventHandler(async (event) => {
  const editionId = await requireCrewEdition(event)
  const edition = await getEditionOrThrow(editionId)
  const config = parseEditionConfig(edition.configJson)
  return {
    editionId,
    editionSlug: edition.slug,
    colorPalette: config.colorPalette!,
  }
})
