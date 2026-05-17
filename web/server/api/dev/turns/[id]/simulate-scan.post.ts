import { requireTeam } from '../../../../utils/team-session'
import { assertDevOnly } from '../../../../utils/dev-only'
import { getEditionOrThrow, getOpenTurn, getStationForField } from '../../../../services/game'
import { applyStationScan } from '../../../../services/turn-scan'

export default defineEventHandler(async (event) => {
  assertDevOnly()
  const team = await requireTeam(event)
  const turnId = Number(getRouterParam(event, 'id'))
  const open = await getOpenTurn(team.id)
  if (!open || open.id !== turnId || open.state !== 'rolled') {
    throw createError({ statusCode: 400, statusMessage: 'Scan not allowed now' })
  }

  const edition = await getEditionOrThrow(team.editionId)
  const station = await getStationForField(edition.id, open.positionPending)
  if (!station) {
    throw createError({ statusCode: 400, statusMessage: 'No station for pending field' })
  }

  return applyStationScan({
    teamId: team.id,
    editionId: team.editionId,
    turnId,
    stationSlug: station.slug,
    token: station.qrToken,
  })
})
