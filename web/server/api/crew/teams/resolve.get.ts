import { requireCrewEdition } from '../../../utils/crew-session'
import { resolveTeamQr } from '../../../services/crew'

export default defineEventHandler(async (event) => {
  const editionId = requireCrewEdition(event)
  const slug = String(getQuery(event).slug ?? '')
  const token = String(getQuery(event).t ?? '')
  const team = await resolveTeamQr(editionId, slug, token)
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Invalid team QR' })
  return { teamId: team.id, name: team.name }
})
